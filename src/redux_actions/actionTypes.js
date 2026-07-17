import {connect, send} from '@giantmachines/redux-websocket'

export const CONNECT_SERVER = 'CONNECT_SERVER';
// export const SERVER_CONNECTED = 'SERVER_CONNECTED';
export const SET_TIMER = 'SET_TIMER';
export const PRESSED_PLAY = 'PRESSED_PLAY';
export const DISMISS_WAITING_MODAL = 'DISMISS_WAITING_MODAL';
export const MOVE_FORWARD = 'MOVE_FORWARD';
export const MOVE_BACK = 'MOVE_BACK';
export const MOVE_GOTO = 'MOVE_GOTO';
export const MUTE = 'MUTE';
export const UNMUTE = 'UNMUTE';
export const REMOVE_SNACK = 'REMOVE_SNACK';
export const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';
export const REPLIED_INVITATION = 'REPLIED_INVITATION';
export const REMOVE_ARENA_JOIN_REQUEST = 'REMOVE_ARENA_JOIN_REQUEST';
export const ARM_DRAW_OFFER = 'ARM_DRAW_OFFER';
export const DISARM_DRAW_OFFER = 'DISARM_DRAW_OFFER';
export const DISMISS_DRAW_MODAL = 'DISMISS_DRAW_MODAL';

export function connectServer(server) {
   return {
      type: CONNECT_SERVER,
      payload: server
   }
}

// Production-first backend selection: running on localhost/machine.local connects to
// the PRODUCTION backend by default (matches the deployed behavior). Set
// PUBLIC_LOCAL_BACKEND=1 in an env file rsbuild loads (see rsbuild.config.ts) to opt
// into the local backend while developing locally. Deployed (non-local) hosts are
// untouched. `localBackend` defaults to a lazy read so tests can inject it directly.
export function resolveSocketHost(hostname, localBackend = readLocalBackendFlag()) {
   if (hostname !== 'localhost' && hostname !== 'machine.local') {
      return hostname;
   }
   return localBackend === '1' ? 'localhost' : 'pente.org';
}

function readLocalBackendFlag() {
   return import.meta.env.PUBLIC_LOCAL_BACKEND;
}

export function connectSocket(server) {
   const host = resolveSocketHost(window.location.hostname);
   // return {
   //     type: WEBSOCKET_CONNECT,
   //     payload: {
   //         url: 'wss://' + host + '/websocketServer/' + server
   //     }
   // }
   return connect('wss://' + host + '/websocketServer/' + server);
}

export function send_message(payload) {
   // console.log('send '+ JSON.stringify(payload));
   // return {
   //     type: WEBSOCKET_SEND,
   //     payload: payload
   // }
   return send(payload);
}

// export function set_timer(payload) {
//     return {
//         type: SET_TIMER,
//         payload: payload
//     }
// }
//
