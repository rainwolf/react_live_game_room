import { WEBSOCKET_CONNECT, WEBSOCKET_SEND } from '@giantmachines/redux-websocket'

export const CONNECT_SERVER = 'CONNECT_SERVER';
// export const SERVER_CONNECTED = 'SERVER_CONNECTED';
export const SET_TIMER = 'SET_TIMER';
export const TOGGLE_SETTINGS = 'TOGGLE_SETTINGS';
export const PRESSED_PLAY = 'PRESSED_PLAY';
export const DISMISS_WAITING_MODAL = 'DISMISS_WAITING_MODAL';
export const MOVE_FORWARD = 'MOVE_FORWARD';
export const MOVE_BACK = 'MOVE_BACK';
export const MOVE_GOTO = 'MOVE_GOTO';

export function connectServer(server) {
    return {
        type: CONNECT_SERVER,
        payload: server
    }
}

export function connectSocket(server) {
    return {
        type: WEBSOCKET_CONNECT,
        payload: {
            // url: 'wss://development.pente.org/websocketServer/'+server
            url: 'wss://pente.org/websocketServer/'+server
        }
    }
}

export function send_message(payload) {
    // console.log('send '+ JSON.stringify(payload));
    return {
        type: WEBSOCKET_SEND,
        payload: payload
    }
}

// export function set_timer(payload) {
//     return {
//         type: SET_TIMER,
//         payload: payload
//     }
// }
//
