// @vitest-environment jsdom
//
// Owner join-request list, empty-rows branch: a list that becomes visible because a snapshot
// arrived opens frozen (spinner for the freeze, then rows); an empty list shows the caption.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {legacy_createStore} from 'redux';
import {Provider} from 'react-redux';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import JoinRequestComponent from '../JoinRequestComponent';
import {FREEZE_MS} from '../../../ui/arenaRequestFreeze';

// jss (behind @mui/styles withStyles) caches CSS.escape detached from CSS at import, and
// jsdom's escape rejects a call without its CSS receiver. Hand it a bound one before imports.
vi.hoisted(() => {
   const css = globalThis.CSS;
   globalThis.CSS = {escape: (s) => css.escape(s)};
});

const CAPTION = 'No join requests yet';

const baseState = {users: {}, tables: {3: {table: 3, owner: true}}, table: 3, me: 'owner', admin: false};
const rec = (...players) => ({
   table: 3,
   requests: players.map((player, i) => ({player, seq: i + 1})),
   answersAction: false,
});

let container;
let root;
let store;

beforeEach(() => {
   global.IS_REACT_ACT_ENVIRONMENT = true;
   vi.useFakeTimers();
   container = document.createElement('div');
   document.body.appendChild(container);
   root = createRoot(container);
});

afterEach(() => {
   act(() => root.unmount());
   container.remove();
   vi.useRealTimers();
});

const mount = (arenaJoinRequests) => {
   store = legacy_createStore((state = {...baseState, arenaJoinRequests}, action) =>
      action.type === 'SET' ? {...state, arenaJoinRequests: action.payload} : state);
   act(() => {
      root.render(<Provider store={store}><JoinRequestComponent/></Provider>);
   });
};
const receive = (record) => act(() => {
   store.dispatch({type: 'SET', payload: record});
});
const advance = (ms) => act(() => {
   vi.advanceTimersByTime(ms);
});
const spinner = () => container.querySelector('[role="progressbar"]');

describe('JoinRequestComponent empty list', () => {
   test('no record shows the caption, no spinner', () => {
      mount(undefined);
      expect(container.textContent).toContain(CAPTION);
      expect(spinner()).toBeNull();
   });

   test('an empty snapshot shows the caption, no spinner', () => {
      mount(rec());
      expect(container.textContent).toContain(CAPTION);
      expect(spinner()).toBeNull();
   });

   test('first request: spinner (not the caption) for the freeze, then the row', () => {
      mount(rec());
      receive(rec('bob'));
      expect(spinner()).not.toBeNull();
      expect(container.textContent).not.toContain(CAPTION);
      expect(container.textContent).not.toContain('bob');
      advance(FREEZE_MS);
      expect(spinner()).toBeNull();
      expect(container.textContent).toContain('bob');
      expect(container.textContent).toContain('Accept');
   });
});
