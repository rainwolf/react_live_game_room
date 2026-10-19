// @vitest-environment jsdom
//
// Kid-mode chat hint: ChatInput shows the approved-players hint only in kid mode,
// and ChatComponent forwards kidMode to it.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {legacy_createStore} from 'redux';
import {Provider} from 'react-redux';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import ChatInput from '../ChatInput';
import ChatComponent from '../ChatComponent';
import {KID_CHAT_HINT} from '../../../ui/kidMode';

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

describe('ChatInput kid hint', () => {
   test('kid mode shows the approved-players hint', () => {
      act(() => root.render(<ChatInput sendHandler={() => {}} kidMode/>));
      expect(container.textContent).toContain(KID_CHAT_HINT);
   });

   test('normal mode shows no hint', () => {
      act(() => root.render(<ChatInput sendHandler={() => {}}/>));
      expect(container.textContent).not.toContain(KID_CHAT_HINT);
   });

   test('Enter still reaches the send handler in kid mode', () => {
      const send = vi.fn();
      act(() => root.render(<ChatInput sendHandler={send} kidMode/>));
      act(() => {
         container.querySelector('input').dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
      });
      expect(send).toHaveBeenCalledTimes(1);
   });

   test('ChatComponent forwards kidMode', () => {
      const store = legacy_createStore(() => ({users: {}, tables: {}, me: 'kid_one', admin: false}));
      act(() => root.render(
         <Provider store={store}>
            <ChatComponent messages={[]} players={[]} sendText={() => {}} kidMode/>
         </Provider>
      ));
      expect(container.textContent).toContain(KID_CHAT_HINT);
   });
});
