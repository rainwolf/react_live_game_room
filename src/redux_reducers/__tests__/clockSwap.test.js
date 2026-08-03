// Pins the wire sequence a seat swap actually produces, and the two invariants <Timer/> relies on.
//
// The live server, on a take-over, swaps its own seats and timer VALUES, then broadcasts (in this
// order, on one connection): the timer for seat 1, the timer for seat 2, and only then the
// seat-swap event -- ServerTable.broadCastPlayerTimer(1), (2), then the DSGSwapSeatsTableEvent.
// The two timer events are built on consecutive statements, so they carry the SAME millisecond.
//
// Consequence, and the reason the reported "timers don't swap with the players" bug existed: after
// the swap both seats hold the identical `clock.time`, so a resync keyed on that timestamp sees no
// change. The clock OBJECTS, by contrast, always move between seats. These tests pin both facts.
import {describe, test, expect} from 'vitest';
import Table from '../../Classes/TableClass';
import {changeTimer, swapSeats} from '../utils';

const TABLE = 5;
const STAMP = 1781365568847; // one millisecond, both timer events

function gameStub() {
   const g = {gameState: {}, isRenjuGame: () => false};
   g.newInstance = () => gameStub();
   return g;
}

// alice in seat 1 (10:00 untouched), bob in seat 2, who has just burned 30s.
function stateAtTakeOver() {
   const t = new Table();
   t.timed = true;
   t.initialMinutes = 10;
   t.incrementalSeconds = 0;
   t.seats = [undefined, 'alice', 'bob'];
   t.resetClocks();
   return {table: TABLE, tables: {[TABLE]: t}, game: gameStub()};
}

const timerEvent = (player, millis) => ({
   table: TABLE, player, millis,
   minutes: Math.floor(millis / 60000), seconds: Math.floor(millis / 1000) % 60,
   time: STAMP,
});

// The server has already swapped internally, so seat 1's timer is bob's and seat 2's is alice's.
function applyTakeOver(state) {
   changeTimer(timerEvent('bob', 570000), state);   // broadCastPlayerTimer(1)
   changeTimer(timerEvent('alice', 600000), state); // broadCastPlayerTimer(2)
   swapSeats({table: TABLE, silent: false, swap: true, player: 'bob'}, state);
}

describe('a seat swap carries each clock to its player', () => {
   test('the seats change hands', () => {
      const state = stateAtTakeOver();
      applyTakeOver(state);
      expect(state.tables[TABLE].seats).toEqual([undefined, 'bob', 'alice']);
   });

   test('each seat ends up showing its NEW occupant\'s remaining time', () => {
      const state = stateAtTakeOver();
      applyTakeOver(state);
      const {clocks} = state.tables[TABLE];
      expect(clocks[1].millis).toBe(570000); // bob moved to seat 1 and brought his 9:30
      expect(clocks[2].millis).toBe(600000); // alice moved to seat 2 and brought her 10:00
   });

   test('timer events are keyed by player NAME, so they land on the right seat after the swap', () => {
      const state = stateAtTakeOver();
      applyTakeOver(state);
      changeTimer(timerEvent('bob', 560000), state); // bob is in seat 1 now
      expect(state.tables[TABLE].clocks[1].millis).toBe(560000);
      expect(state.tables[TABLE].clocks[2].millis).toBe(600000);
   });
});

describe('why the clock OBJECT, and not `clock.time`, is the resync key', () => {
   test('both seats hold the identical `time` once the swap lands -- a timestamp key cannot fire', () => {
      const state = stateAtTakeOver();
      applyTakeOver(state);
      const {clocks} = state.tables[TABLE];
      expect(clocks[1].time).toBe(STAMP);
      expect(clocks[2].time).toBe(STAMP);
      expect(clocks[1].time).toBe(clocks[2].time);
   });

   test('every seat receives a DIFFERENT clock object across the swap -- an identity key always fires', () => {
      const state = stateAtTakeOver();
      changeTimer(timerEvent('bob', 570000), state);
      changeTimer(timerEvent('alice', 600000), state);
      const before = [...state.tables[TABLE].clocks];

      swapSeats({table: TABLE, silent: false, swap: true, player: 'bob'}, state);
      const after = state.tables[TABLE].clocks;

      expect(after[1]).not.toBe(before[1]);
      expect(after[2]).not.toBe(before[2]);
      expect(after[1]).toBe(before[2]); // the objects moved, they were not rewritten
      expect(after[2]).toBe(before[1]);
   });

   test('a silent (rejoin) swap marker leaves the clocks alone', () => {
      const state = stateAtTakeOver();
      changeTimer(timerEvent('bob', 570000), state);
      changeTimer(timerEvent('alice', 600000), state);
      const before = [...state.tables[TABLE].clocks];

      swapSeats({table: TABLE, silent: true, swap: true, player: 'bob'}, state);

      expect(state.tables[TABLE].clocks[1]).toBe(before[1]);
      expect(state.tables[TABLE].clocks[2]).toBe(before[2]);
   });
});
