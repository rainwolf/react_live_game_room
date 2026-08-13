// A swap choice hands the turn over without placing a stone, so no dsgMoveTableEvent follows and
// the normal move sound never fires. These tests pin which swap frames emit the cue and which
// must stay silent -- the silent=true frames are rejoin/state-sync replay markers, and the
// Offer10 replay is recognisable only by its MISSING `player` key (Gson omits null fields).
import {describe, test, expect} from 'vitest';
import Table from '../../Classes/TableClass';
import {swapSeats, swap2Pass, renjuOffer10} from '../utils';

const TABLE = 5;
const OTHER_TABLE = 6;

function gameStub() {
   const g = {
      gameState: {
         renjuState: {awaitingSwap: true, branchChosen: false, tenOffer: false, offered: []},
      },
      moves: [],
      isRenjuGame: () => false,
      swap2Pass: () => {},
   };
   g.newInstance = () => gameStub();
   return g;
}

function stateAtTable() {
   const t = new Table();
   t.seats = [undefined, 'alice', 'bob'];
   return {table: TABLE, me: 'alice', tables: {[TABLE]: t}, game: gameStub()};
}

const sounds = (state) => (state.pendingNotifications || []).map((n) => n.sound);

describe('swap choices emit the move sound', () => {
   test('a live seat swap emits move', () => {
      const state = stateAtTable();
      swapSeats({table: TABLE, swap: true, silent: false, player: 'bob'}, state);
      expect(sounds(state)).toEqual(['move']);
   });

   test('a live seat swap emits move even when the chooser is me', () => {
      const state = stateAtTable();
      swapSeats({table: TABLE, swap: true, silent: false, player: 'alice'}, state);
      expect(sounds(state)).toEqual(['move']);
   });

   test('a declined seat swap still emits move -- the turn moved either way', () => {
      const state = stateAtTable();
      swapSeats({table: TABLE, swap: false, silent: false, player: 'bob'}, state);
      expect(sounds(state)).toEqual(['move']);
   });

   test('a silent seat swap (rejoin marker) is quiet', () => {
      const state = stateAtTable();
      swapSeats({table: TABLE, swap: true, silent: true}, state);
      expect(sounds(state)).toEqual([]);
   });

   test('a seat swap at another table is quiet', () => {
      const state = stateAtTable();
      swapSeats({table: OTHER_TABLE, swap: true, silent: false, player: 'bob'}, state);
      expect(sounds(state)).toEqual([]);
   });

   test('a live swap2 pass emits move', () => {
      const state = stateAtTable();
      swap2Pass({table: TABLE, silent: false, player: 'bob'}, state);
      expect(sounds(state)).toEqual(['move']);
   });

   test('a silent swap2 pass (rejoin marker) is quiet', () => {
      const state = stateAtTable();
      swap2Pass({table: TABLE, silent: true}, state);
      expect(sounds(state)).toEqual([]);
   });

   test('a live renju ten-stone offer emits move', () => {
      const state = stateAtTable();
      renjuOffer10({table: TABLE, moves: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], player: 'bob'}, state);
      expect(sounds(state)).toEqual(['move']);
   });

   test('a replayed renju ten-stone offer (no player key) is quiet', () => {
      const state = stateAtTable();
      renjuOffer10({table: TABLE, moves: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}, state);
      expect(sounds(state)).toEqual([]);
   });
});
