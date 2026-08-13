// A swap choice hands the turn over without placing a stone, so no dsgMoveTableEvent follows and
// the normal move sound never fires. These tests pin which swap frames emit the cue and which
// must stay silent -- the silent=true frames are rejoin/state-sync replay markers, and the
// Offer10 replay is recognisable only by its MISSING `player` key (Gson omits null fields).
import {describe, test, expect} from 'vitest';
import Table from '../../Classes/TableClass';
import {swapSeats, swap2Pass, renjuOffer10, renjuSwap, renjuSelect1} from '../utils';

const TABLE = 5;
const OTHER_TABLE = 6;

function gameStub() {
   const g = {
      gameState: {
         renjuState: {awaitingSwap: true, branchChosen: false, tenOffer: false, offered: [], selected: null},
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

   // Both branches cue. Note this is a deliberate choice, not a turn derivation: whether the
   // DECIDER keeps the move after a seat swap depends on the seat swap interacting with move
   // parity, so the cue means "a swap decision landed at your table", not strictly "your turn".
   test('a declined seat swap emits move too -- both branches cue deliberately', () => {
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

   // The swap2 "let p1 decide" pass does NOT hand the turn over: player 2 keeps the move and
   // places two more stones. Player 1's decision only opens after stone 5, which arrives as an
   // ordinary move event and already sounds. So this frame must never cue.
   test('a swap2 pass never emits -- it does not hand the turn over', () => {
      const live = stateAtTable();
      swap2Pass({table: TABLE, silent: false, player: 'bob'}, live);
      expect(sounds(live)).toEqual([]);

      const replay = stateAtTable();
      swap2Pass({table: TABLE, silent: true}, replay);
      expect(sounds(replay)).toEqual([]);
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

   test('an explicit null player on the ten-stone offer is quiet, like an absent one', () => {
      const state = stateAtTable();
      renjuOffer10({table: TABLE, moves: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], player: null}, state);
      expect(sounds(state)).toEqual([]);
   });

   // The "never sound" list is otherwise enforced only by the absence of code in the two
   // functions adjacent to the ones we edited. Pin it.
   test('renju swap and select-1 never emit -- a move event follows each of them', () => {
      const swapState = stateAtTable();
      renjuSwap({table: TABLE, swap: false, move: 42, player: 'bob'}, swapState);
      expect(sounds(swapState)).toEqual([]);

      const selectState = stateAtTable();
      renjuSelect1({table: TABLE, move: 42, player: 'bob'}, selectState);
      expect(sounds(selectState)).toEqual([]);
   });
});
