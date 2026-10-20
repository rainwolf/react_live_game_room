// @vitest-environment jsdom
//
// Lobby "Kid accounts" link: shown to signed-in non-kid, non-guest players only.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {legacy_createStore} from 'redux';
import {Provider} from 'react-redux';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import Room from '../Room';
import {KID_CHAT_HINT} from '../../ui/kidMode';

// jss (behind @mui/styles withStyles) caches CSS.escape detached from CSS at import, and
// jsdom's escape rejects a call without its CSS receiver. Hand it a bound one before imports.
vi.hoisted(() => {
   const css = globalThis.CSS;
   globalThis.CSS = {escape: (s) => css.escape(s)};
});

let container;
let root;

beforeEach(() => {
   global.IS_REACT_ACT_ENVIRONMENT = true;
   container = document.createElement('div');
   document.body.appendChild(container);
   root = createRoot(container);
});

afterEach(() => {
   act(() => root.unmount());
   container.remove();
});

const renderRoom = (me, isKid) => {
   const state = {
      users: {}, connected: true, logged_in: true, room_messages: [], tables: {},
      me, isKid, admin: false, tournament: false, freeloader: false
   };
   const store = legacy_createStore(() => state);
   act(() => root.render(<Provider store={store}><Room/></Provider>));
};

const link = () => container.querySelector('a[href="https://www.pente.org/gameServer/myprofile/kids"]');

describe('lobby kid accounts link', () => {
   test('non-kid player sees Kid accounts link, opening in new tab', () => {
      renderRoom('graviton', false);
      expect(link().textContent).toBe('Kid accounts');
      expect(link().getAttribute('target')).toBe('_blank');
   });

   test('kid sees the chat hint and no link', () => {
      renderRoom('kid_one', true);
      expect(link()).toBeNull();
      expect(container.textContent).toContain(KID_CHAT_HINT);
   });

   test('guest sees no link', () => {
      renderRoom('guest123', false);
      expect(link()).toBeNull();
   });
});
