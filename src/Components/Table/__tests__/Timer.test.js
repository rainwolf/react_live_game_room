// @vitest-environment jsdom
//
// End-to-end regression for the reported bug: "if p2 spent 30 seconds and then swapped, the new p2
// would be down on time." This renders the REAL <Timer/> pair the way GameInfoPanel does -- two
// keyless sibling elements at fixed positions, so React reconciles them in place and any
// component-local state survives the swap -- and drives the actual wire sequence through the actual
// reducer helpers.
//
// This is the test that fails if Timer.js regresses to a seat-pinned mirror resynced on
// `clock.time`: the server sends both post-swap clocks BEFORE the swap event, stamped in the same
// millisecond, so after the swap both seats hold an identical `clock.time` and a timestamp-keyed
// resync cannot fire.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {Provider} from 'react-redux';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import Timer from '../Timer';
import Table from '../../../Classes/TableClass';
import {Game, GameState} from '../../../Classes/GameClass';
import {changeTimer, swapSeats} from '../../../redux_reducers/utils';

const TABLE = 5;
const STAMP = 1781365568847; // one millisecond, both timer events

const timerEvent = (player, millis) => ({
   table: TABLE, player, millis,
   minutes: Math.floor(millis / 60000), seconds: Math.floor(millis / 1000) % 60,
   time: STAMP,
});

// A started, timed renju game at the move-4 take-over window: alice in seat 1, bob in seat 2.
function initialState() {
   const game = new Game();
   game.setGame(31);
   game.gameState.state = GameState.State.STARTED;

   const table = new Table({table: TABLE, initialMinutes: 10});
   table.me = 'alice';
   table.timed = true;
   table.seats = [undefined, 'alice', 'bob'];
   table.resetClocks();

   return {game, tables: {[TABLE]: table}, table: TABLE, me: 'alice', pendingNotifications: []};
}

// Minimal redux store: the reducer helpers under test mutate the state object in place, so a
// dispatch runs one of them and then hands out a fresh top-level reference.
function makeStore(initial) {
   let state = initial;
   const subscribers = new Set();
   return {
      getState: () => state,
      subscribe: (fn) => {
         subscribers.add(fn);
         return () => subscribers.delete(fn);
      },
      dispatch: (apply) => {
         apply(state);
         state = {...state};
         subscribers.forEach((fn) => fn());
         return apply;
      },
      replaceReducer: () => {},
   };
}

let container;
let root;
let store;

beforeEach(() => {
   global.IS_REACT_ACT_ENVIRONMENT = true;
   vi.useFakeTimers();
   store = makeStore(initialState());
   container = document.createElement('div');
   document.body.appendChild(container);
   root = createRoot(container);
   act(() => {
      root.render(
         <Provider store={store}>
            <div>
               <div data-seat="1"><Timer seat={1}/></div>
               <div data-seat="2"><Timer seat={2}/></div>
            </div>
         </Provider>
      );
   });
});

afterEach(() => {
   act(() => root.unmount());
   container.remove();
   vi.useRealTimers();
});

// Server events arrive outside React's render cycle, so let it process them.
const dispatch = (apply) => act(() => {
   store.dispatch(apply);
});

// The face only advances on the 20ms interval, so let at least one tick land.
const settle = () => act(() => {
   vi.advanceTimersByTime(40);
});

const faceOf = (seat) => container.querySelector(`[data-seat="${seat}"]`).textContent.trim();

// The take-over exactly as the live server delivers it: it swaps its own seats and timer values
// first, so seat 1's timer is already bob's, then broadcasts timer(1), timer(2), swap.
function applyTakeOver() {
   dispatch((s) => changeTimer(timerEvent('bob', 570000), s));
   dispatch((s) => changeTimer(timerEvent('alice', 600000), s));
   settle();
   dispatch((s) => swapSeats({table: TABLE, silent: false, swap: true, player: 'bob'}, s));
   settle();
}

describe('<Timer/> pair across a renju take-over', () => {
   test('both faces start at the table time', () => {
      settle();
      expect(faceOf(1)).toBe('10:00');
      expect(faceOf(2)).toBe('10:00');
   });

   test('the server timer events land on the right seats before the swap', () => {
      dispatch((s) => changeTimer(timerEvent('bob', 570000), s));
      dispatch((s) => changeTimer(timerEvent('alice', 600000), s));
      settle();
      expect(faceOf(1)).toBe('10:00'); // alice
      expect(faceOf(2)).toBe('9:30');  // bob, who burned 30s
   });

   test('after the take-over each face follows its PLAYER, not its seat', () => {
      applyTakeOver();

      // bob moved into seat 1 and brought his 9:30; alice moved into seat 2 with her 10:00.
      expect(store.getState().tables[TABLE].seats).toEqual([undefined, 'bob', 'alice']);
      expect(faceOf(1)).toBe('9:30');
      expect(faceOf(2)).toBe('10:00');
   });

   test('both clocks carry the identical `time` at the swap, so a timestamp key cannot fire', () => {
      applyTakeOver();
      const {clocks} = store.getState().tables[TABLE];
      expect(clocks[1].time).toBe(clocks[2].time);
   });

   test('a later timer event still lands on the right seat', () => {
      applyTakeOver();
      dispatch((s) => changeTimer({...timerEvent('bob', 560000), time: STAMP + 5000}, s));
      settle();
      expect(faceOf(1)).toBe('9:20'); // bob, in seat 1 now
      expect(faceOf(2)).toBe('10:00');
   });
});
