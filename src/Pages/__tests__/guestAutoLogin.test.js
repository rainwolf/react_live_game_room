// @vitest-environment jsdom
//
// `?guest` auto-login under StrictMode: the dev double-mount (mount -> unmount -> mount) of
// Servers must not auto-connect twice. A second connect closes the first socket, whose close
// event resets the store, which remounts Servers, which connects again — a login loop.
// Wires the real store/middleware chain from index.js with a fake WebSocket.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {applyMiddleware, legacy_createStore as createStore} from 'redux';
import {Provider} from 'react-redux';
import reduxWebsocket from '@giantmachines/redux-websocket';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import App from '../../App';
import liveGameApp from '../../redux_reducers/rootReducer';
import {protocolMiddleware} from '../../protocol/middleware';
import {notificationMiddleware} from '../../notifications/middleware';

// jss (behind @mui/styles withStyles) caches CSS.escape detached from CSS at import, and
// jsdom's escape rejects a call without its CSS receiver. Hand it a bound one before imports.
vi.hoisted(() => {
   const css = globalThis.CSS;
   globalThis.CSS = {escape: (s) => css.escape(s)};
});

let sockets;

// Mirrors the browser contract the middleware relies on: close() fires the close event
// async. The test opens a socket itself, standing in for the network handshake.
class FakeWebSocket {
   constructor(url) {
      this.url = url;
      this.listeners = {};
      this.sent = [];
      this.closed = false;
      sockets.push(this);
   }

   addEventListener(type, fn) {
      (this.listeners[type] = this.listeners[type] || []).push(fn);
   }

   emit(type, event) {
      (this.listeners[type] || []).forEach(fn => fn(event));
   }

   send(data) {
      this.sent.push(data);
   }

   close() {
      this.closed = true;
      setTimeout(() => this.emit('close', {code: 1000}));
   }
}

const logins = () => sockets
   .flatMap(socket => socket.sent)
   .filter(data => 'dsgLoginEvent' in JSON.parse(data));

// Real time, no act(): React must commit between socket events as it does in the browser.
// act() would batch the reset and the remount away, hiding the loop.
const until = (condition) => vi.waitFor(() => {
   if (!condition()) {
      throw new Error('condition not met yet');
   }
}, {timeout: 3000, interval: 10});
const linger = () => new Promise(resolve => setTimeout(resolve, 200));

let container;
let root;

beforeEach(() => {
   global.IS_REACT_ACT_ENVIRONMENT = false;
   sockets = [];
   vi.spyOn(console, 'log').mockImplementation(() => {});
   vi.stubGlobal('WebSocket', FakeWebSocket);
   vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      text: () => Promise.resolve('16000 Arena Server\n'),
   })));
   window.history.replaceState(null, '', '/?guest');
   container = document.createElement('div');
   document.body.appendChild(container);
   root = createRoot(container);
});

afterEach(() => {
   root.unmount();
   container.remove();
   window.history.replaceState(null, '', '/');
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe('?guest auto-login', () => {
   test('connects and sends the guest login exactly once under StrictMode', async () => {
      const store = createStore(liveGameApp,
         applyMiddleware(reduxWebsocket(), protocolMiddleware, notificationMiddleware));
      root.render(
         <React.StrictMode>
            <Provider store={store}>
               <App/>
            </Provider>
         </React.StrictMode>
      );

      // Both StrictMode mounts fetched the server list; give a duplicate connect time to show.
      await until(() => fetch.mock.calls.length >= 2 && sockets.length > 0);
      await linger();
      expect(sockets).toHaveLength(1);

      await until(() => container.textContent.includes('Connecting...'));
      sockets[0].emit('open', {});
      await until(() => logins().length > 0);
      await linger();

      expect(sockets).toHaveLength(1);
      expect(sockets[0].closed).toBe(false);
      expect(logins()).toEqual([JSON.stringify({dsgLoginEvent: {guest: true, time: 0}})]);
      expect(store.getState().connected).toBe(true);
   });
});
