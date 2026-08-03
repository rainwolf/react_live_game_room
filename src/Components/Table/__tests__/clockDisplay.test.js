// Regression: the clocks must follow the PLAYERS across a seat swap.
//
// Reported bug (live renju): "if p2 spent 30 seconds and then swapped, the new p2 would be down on
// time." The redux layer was already correct -- TableClass.swap() moves the clock objects along
// with the seats -- but <Timer/> kept a durable copy of the countdown in component-local state,
// pinned to a fixed seat position, and only resynced when the scalar `clock.time` changed.
//
// On a swap the server emits both players' post-swap clocks BEFORE the swap event
// (ServerTable.broadCastPlayerTimer(1), then (2), then the swap broadcast), and it builds those two
// events on consecutive statements, so both carry the SAME millisecond stamp. After the swap both
// seats therefore hold the same `clock.time`: a `time`-keyed resync sees T -> T for both seats,
// neither fires, and each seat keeps counting down the previous occupant's remaining time.
//
// tickClock is the whole of <Timer/>'s per-frame decision, so these exercise the component's logic
// without a DOM. (The component itself is a shell around it; see the note in clockSwap.test.js.)
import {describe, test, expect} from 'vitest';
import {
   advanceEpisode,
   clockTenths,
   episodeElapsedMs,
   remainingTenths,
   splitTenths,
   tickClock,
} from '../clockDisplay';

// Both clocks stamped in the same millisecond, exactly as the server emits them at a swap.
const STAMP = 1781365568847;
const clockFor = (millis) => ({
   millis,
   minutes: Math.floor(millis / 60000),
   seconds: Math.floor(millis / 1000) % 60,
   time: STAMP,
});

// Drive tickClock the way <Timer/> does, threading the episode and the last shown value.
function face(frames) {
   let episode = null;
   let prevTenths = 0;
   const chimes = [];
   let tenthsLeft = 0;
   for (const f of frames) {
      const r = tickClock(episode, {...f, prevTenths});
      episode = r.episode;
      tenthsLeft = r.tenthsLeft;
      prevTenths = r.tenthsLeft;
      if (r.chime) {
         chimes.push(f.now);
      }
   }
   return {tenthsLeft, chimes, episode};
}

describe('clockTenths reads whichever shape the clock is in', () => {
   test('server timer events carry millis', () => {
      expect(clockTenths({millis: 600000})).toBe(6000);
      expect(clockTenths({millis: 570000})).toBe(5700);
   });
   test('clocks seeded at game start carry only minutes + seconds', () => {
      expect(clockTenths({minutes: 10, seconds: 0})).toBe(6000);
      expect(clockTenths({minutes: 0, seconds: 30})).toBe(300);
   });
   test('a flagged clock reports millis 0, not "no millis field"', () => {
      // Must not fall through to minutes/seconds -- those may still hold a stale non-zero reading.
      expect(clockTenths({millis: 0, minutes: 3, seconds: 20})).toBe(0);
   });
   test('an absent or empty clock reads 0', () => {
      expect(clockTenths(undefined)).toBe(0);
      expect(clockTenths({})).toBe(0);
   });
});

describe('a seat swap moves the countdown to the incoming player', () => {
   // seat 1 = alice (10:00 left), seat 2 = bob, on the move, who then burns 30s.
   const clockAlice = clockFor(600000);
   const clockBob = clockFor(600000);

   test('the outgoing player has visibly burned time before the swap', () => {
      const {tenthsLeft} = face([
         {clock: clockBob, running: true, now: 1000},
         {clock: clockBob, running: true, now: 31000},
      ]);
      expect(tenthsLeft).toBe(6000 - 300); // 9:30
   });

   test('after the swap the seat shows the INCOMING player\'s clock, not the burned one', () => {
      // Both clocks carry the identical `time` -- the key the old resync used, which is why it
      // could not fire. Object identity, which tickClock uses, always differs.
      expect(clockAlice.time).toBe(clockBob.time);
      expect(clockAlice).not.toBe(clockBob);

      const {tenthsLeft} = face([
         {clock: clockBob, running: true, now: 1000},
         {clock: clockBob, running: true, now: 31000},
         // The take-over: TableClass.swap() hands this seat the OTHER seat's clock object.
         {clock: clockAlice, running: false, now: 31000},
      ]);
      expect(tenthsLeft).toBe(6000); // 10:00, not 9:30
   });

   test('the incoming player then counts down from THEIR time', () => {
      const {tenthsLeft} = face([
         {clock: clockBob, running: true, now: 1000},
         {clock: clockBob, running: true, now: 31000},
         {clock: clockAlice, running: true, now: 31000},
         {clock: clockAlice, running: true, now: 36000},
      ]);
      expect(tenthsLeft).toBe(6000 - 50); // 9:55
   });

   test('a fresh server value restarts the countdown', () => {
      const resynced = clockFor(570000); // changeTimer allocates a new object every event
      const {tenthsLeft} = face([
         {clock: clockBob, running: true, now: 0},
         {clock: clockBob, running: true, now: 30000},
         {clock: resynced, running: true, now: 30000},
      ]);
      expect(tenthsLeft).toBe(5700);
   });
});

describe('a seat emptying mid-turn freezes the clock instead of snapping back', () => {
   // A player disconnecting mid-turn is the case this exists for: the server pauses the game and
   // broadcasts a stand, but sends NO timer value to the opponent or to spectators, so the client
   // must hold what it has. The clock object is untouched throughout -- standTable only rewrites
   // `seats`, and newInstance() shallow-copies the clocks array -- which is why the episode must
   // NOT be keyed on the seat's occupant.
   const clock = clockFor(180000); // 3:00

   test('time spent before the pause is kept, and the countdown resumes from there', () => {
      let f = face([
         {clock, running: true, now: 0},
         {clock, running: true, now: 40000},
      ]);
      expect(f.tenthsLeft).toBe(1800 - 400); // 2:20 on the move

      // seat vacated: clockRunning() goes false (fullSeats() fails, game PAUSED). Same clock object.
      f = face([
         {clock, running: true, now: 0},
         {clock, running: false, now: 40000},
         {clock, running: false, now: 55000},
      ]);
      expect(f.tenthsLeft).toBe(1800 - 400); // frozen at 2:20, NOT snapped back to 3:00

      // player returns and play resumes
      f = face([
         {clock, running: true, now: 0},
         {clock, running: false, now: 40000},
         {clock, running: true, now: 55000},
         {clock, running: true, now: 65000},
      ]);
      expect(f.tenthsLeft).toBe(1800 - 500); // 2:10
   });

   test('an idle seat accrues nothing', () => {
      const {tenthsLeft} = face([
         {clock, running: false, now: 0},
         {clock, running: false, now: 99000},
      ]);
      expect(tenthsLeft).toBe(1800);
   });

   test('the episode is returned unchanged when nothing changed, so ticking is allocation-free', () => {
      const ep = advanceEpisode(null, {clock, running: true, now: 0});
      expect(advanceEpisode(ep, {clock, running: true, now: 5000})).toBe(ep);
   });
});

describe('the low-time alert fires once, on a running clock, on the crossing', () => {
   test('fires on the tick that a running clock drops below 12s', () => {
      const clock = clockFor(13000);
      const {chimes} = face([
         {clock, running: true, now: 0},
         {clock, running: true, now: 900},  // 12.1s
         {clock, running: true, now: 1100}, // 11.9s -- crossing
         {clock, running: true, now: 1300},
      ]);
      expect(chimes).toEqual([1100]);
   });

   test('does NOT fire for a clock that is not running', () => {
      // A resync or a seat swap can hand this seat a clock that is already under the threshold.
      // The old code early-returned on !clockRunning before ever reaching the alert.
      const long = clockFor(600000);
      const short = clockFor(8000);
      const {chimes} = face([
         {clock: long, running: false, now: 0},
         {clock: short, running: false, now: 100}, // swapped in, already below 12s
      ]);
      expect(chimes).toEqual([]);
   });

   test('does not fire again once already below the threshold', () => {
      const clock = clockFor(11000);
      const {chimes} = face([
         {clock, running: true, now: 0},
         {clock, running: true, now: 20},
         {clock, running: true, now: 40},
      ]);
      expect(chimes).toEqual([]);
   });
});

describe('display arithmetic', () => {
   test('a flagged clock reads 0, never negative', () => {
      expect(remainingTenths({millis: 5000}, 99000)).toBe(0);
   });
   test('elapsed time is measured from the anchor, not from wall zero', () => {
      const ep = advanceEpisode(null, {clock: clockFor(600000), running: true, now: 10000});
      expect(episodeElapsedMs(ep, 12000)).toBe(2000);
   });
   test('splitTenths matches the rendered m:ss.t face', () => {
      expect(splitTenths(6000)).toEqual({minutes: 10, seconds: 0, tenths: 0});
      expect(splitTenths(5701)).toEqual({minutes: 9, seconds: 30, tenths: 1});
      expect(splitTenths(0)).toEqual({minutes: 0, seconds: 0, tenths: 0});
   });
});
