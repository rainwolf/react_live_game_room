// @vitest-environment jsdom
//
// Kid accounts: the free-text "add message" fields on the invite and invitation-response
// modals are not rendered, so a kid can only send an empty message.

import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {legacy_createStore} from 'redux';
import {Provider} from 'react-redux';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import InviteModal from '../Table/InviteModal';
import InvitationResponseModal from '../Room/InvitationResponseModal';
import User from '../../Classes/UserClass';

// jss (behind @mui/styles withStyles) caches CSS.escape detached from CSS at import, and
// jsdom's escape rejects a call without its CSS receiver. Hand it a bound one before imports.
vi.hoisted(() => {
   const css = globalThis.CSS;
   globalThis.CSS = {escape: (s) => css.escape(s)};
});

const user = (name) => new User({name, subscriberLevel: 0, gameData: [], name_color: 0});

let container;
let root;
let actions;

beforeEach(() => {
   global.IS_REACT_ACT_ENVIRONMENT = true;
   actions = [];
   container = document.createElement('div');
   document.body.appendChild(container);
   root = createRoot(container);
});

afterEach(() => {
   act(() => root.unmount());
   container.remove();
});

const mount = (state, element) => {
   const store = legacy_createStore((s = state, a) => {
      actions.push(a);
      return s;
   });
   act(() => {
      root.render(<Provider store={store}>{element}</Provider>);
   });
};

const sent = (key) => actions.filter(a => a.payload && a.payload[key]);

const button = (startsWith) =>
   [...document.body.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(startsWith));

const responseState = (isKid, message = 'hi') => ({
   me: 'kid_one', isKid, table: undefined, users: {bob: user('bob')},
   received_invitation: {by: 'bob', message, table: 3},
});

describe('InvitationResponseModal', () => {
   test('kid sees no reply field and declines with empty text', () => {
      mount(responseState(true), <InvitationResponseModal/>);
      expect(document.body.querySelector('input')).toBeNull();
      act(() => button('Decline').click());
      const frames = sent('dsgInviteResponseTableEvent');
      expect(frames).toHaveLength(1);
      expect(frames[0].payload.dsgInviteResponseTableEvent.responseText).toBe('');
   });

   test('normal player keeps the reply field', () => {
      mount(responseState(false), <InvitationResponseModal/>);
      const inputs = document.body.querySelectorAll('input');
      expect(inputs).toHaveLength(1);
      expect(inputs[0].placeholder).toBe('optional reply message');
   });

   test('stripped invite text shows no message header', () => {
      mount(responseState(true, ''), <InvitationResponseModal/>);
      expect(document.body.textContent).not.toContain('message:');
   });
});

describe('InviteModal', () => {
   const inviteState = (isKid) => ({
      me: 'kid_one', isKid, table: 3, tables: {},
      users: {kid_one: user('kid_one'), bob: user('bob')},
   });

   test('kid sees no message field and invites with empty text', () => {
      mount(inviteState(true), <InviteModal open dismiss={() => {}}/>);
      expect(document.body.querySelector('input[placeholder="optional message"]')).toBeNull();
      act(() => document.body.querySelector('input[type="radio"]').click());
      act(() => button('invite').click());
      const frames = sent('dsgInviteTableEvent');
      expect(frames).toHaveLength(1);
      expect(frames[0].payload.dsgInviteTableEvent.inviteText).toBe('');
   });

   test('normal player keeps the message field', () => {
      mount(inviteState(false), <InviteModal open dismiss={() => {}}/>);
      expect(document.body.querySelector('input[placeholder="optional message"]')).not.toBeNull();
   });
});
