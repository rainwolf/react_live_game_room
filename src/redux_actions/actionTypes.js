import {connect, send} from '@giantmachines/redux-websocket'

export const CONNECT_SERVER = 'CONNECT_SERVER';
// export const SERVER_CONNECTED = 'SERVER_CONNECTED';
export const SET_TIMER = 'SET_TIMER';
export const TOGGLE_SETTINGS = 'TOGGLE_SETTINGS';
export const PRESSED_PLAY = 'PRESSED_PLAY';
export const DISMISS_WAITING_MODAL = 'DISMISS_WAITING_MODAL';
export const MOVE_FORWARD = 'MOVE_FORWARD';
export const MOVE_BACK = 'MOVE_BACK';
export const MOVE_GOTO = 'MOVE_GOTO';
export const MUTE = 'MUTE';
export const UNMUTE = 'UNMUTE';
export const REMOVE_SNACK = 'REMOVE_SNACK';
export const SHOW_BOOT_DIALOG = 'SHOW_BOOT_DIALOG';
export const REPLIED_INVITATION = 'REPLIED_INVITATION';


export function connectServer(server) {
   return {
      type: CONNECT_SERVER,
      payload: server
   }
}

export function connectSocket(server) {
   let host = window.location.hostname;
   if (host === 'localhost' || host === 'machine.local') {
      host = 'development.pente.org';
      // host = 'pente.org';
   }
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
