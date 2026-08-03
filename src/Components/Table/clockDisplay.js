// Clock-display logic for <Timer/>, kept pure so it is testable without a DOM.
//
// The number a seat shows is a pure function of the last value the SERVER sent for that seat plus
// how long that seat has been on the move since. The only thing the client owns is the
// interpolation "episode": the anchor it counts down from between server values.
//
// WHY THE EPISODE IS KEYED ON THE CLOCK OBJECT (and not on `clock.time`, and not on who is sitting
// there): a seat swap -- renju Taraguchi take-over, swap2 / d-pente swap -- exchanges whole clock
// OBJECTS between seats, see TableClass.swap(). The server sends both players' post-swap clocks
// BEFORE the swap event, and it builds those two events on consecutive statements, so they are
// stamped with the SAME millisecond (ServerTable.broadCastPlayerTimer(1), then (2), then the swap
// broadcast). By the time the swap is applied both seats therefore hold the same `clock.time`, and
// anything keyed on that timestamp sees no change and keeps counting down the PREVIOUS occupant's
// remaining time -- which is exactly the reported bug: after a take-over the incoming player
// inherited the outgoing player's depleted clock.
//
// Object identity has no such collision: swap() always hands each seat the OTHER seat's object, and
// those two objects are always distinct (every writer -- the constructor, updateTable, resetClocks,
// changeTimer -- allocates fresh literals). changeTimer likewise allocates on every server value.
// The seat's OCCUPANT deliberately does NOT key the episode: elapsed time belongs to the clock, not
// to whoever is sitting in front of it, and resetting on an occupant change would discard the
// accrued time when a seat empties mid-turn -- the one case the pause fold below exists for.
//
// Nothing here may be stored against a seat POSITION.

// Below this the face shows tenths and turns red, and the low-time alert fires on the crossing.
export const LOW_TIME_TENTHS = 120;

// The authoritative remaining time for a clock, in tenths of a second. Server timer events carry
// `millis`; clocks seeded at table creation / game start carry only minutes + seconds.
export function clockTenths(clock) {
   if (!clock) {
      return 0;
   }
   if (typeof clock.millis === 'number') {
      return Math.floor(clock.millis / 100);
   }
   return ((clock.minutes || 0) * 60 + (clock.seconds || 0)) * 10;
}

// Advance (or restart) the interpolation episode. A new clock object means a new server value: the
// old baseline is gone, so start over with no elapsed time. Returns the SAME episode when nothing
// changed, so callers can compare by identity.
export function advanceEpisode(episode, {clock, running, now}) {
   if (!episode || episode.clock !== clock) {
      return {clock, accruedMs: 0, since: running ? now : null};
   }
   if (running && episode.since === null) {
      return {...episode, since: now};
   }
   if (!running && episode.since !== null) {
      // Fold the time spent so far this turn into the episode, so resuming after a mid-turn pause
      // (a seat was vacated, the game paused waiting for a player to return) continues from where
      // it stopped instead of snapping back to the turn's start time.
      return {...episode, accruedMs: episode.accruedMs + Math.max(0, now - episode.since), since: null};
   }
   return episode;
}

// How long this seat has been on the move since the server value the episode is anchored to.
export function episodeElapsedMs(episode, now) {
   if (!episode) {
      return 0;
   }
   return episode.accruedMs + (episode.since === null ? 0 : Math.max(0, now - episode.since));
}

// What to display, in tenths of a second. Never negative: a flagged clock reads 0:00.
export function remainingTenths(clock, elapsedMs) {
   return Math.max(0, clockTenths(clock) - Math.round(elapsedMs / 100));
}

// One tick of the clock face: the whole of <Timer/>'s per-frame decision, so it can be tested
// without a DOM. `chime` is true only on the tick that a RUNNING clock crosses below the low-time
// threshold -- a paused clock, or one that arrives already below it (a resync, or a seat swap
// handing this seat a short clock), must not sound the alert.
export function tickClock(episode, {clock, running, now, prevTenths}) {
   const next = advanceEpisode(episode, {clock, running, now});
   const tenthsLeft = remainingTenths(clock, episodeElapsedMs(next, now));
   return {
      episode: next,
      tenthsLeft,
      chime: running && tenthsLeft < LOW_TIME_TENTHS && prevTenths >= LOW_TIME_TENTHS,
   };
}

// Split tenths-of-a-second into the fields the clock face renders.
export function splitTenths(total) {
   return {
      minutes: Math.floor(total / 600),
      seconds: Math.floor((total % 600) / 10),
      tenths: total % 10,
   };
}
