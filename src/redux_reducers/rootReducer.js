import '../redux_actions/actionTypes';
import { CONNECT_SERVER, TOGGLE_SETTINGS, 
    PRESSED_PLAY, DISMISS_WAITING_MODAL } from "../redux_actions/actionTypes";
import { WEBSOCKET_OPEN, WEBSOCKET_CLOSED, WEBSOCKET_MESSAGE } from '@giantmachines/redux-websocket';
import './utils';
import User from './UserClass';
import {processUser, addRoomMessage, exitUser, changeTableState,
    joinTable, exitTable, sitTable, standTable, tableOwner,
    addTableMessage, addMove, changeGameState, changeTimer,
    serverTableMessage, undoRequested, undoReply,
    cancelRequested, swapSeats, // setPlayingPlayerTable,
    rejectGoState, resignOrCancel} from "./utils";


const server = new User({name: 'game server', subscriberLevel: 0, gameData: [], name_color: 0});

const initialState = {
    users: { 'game server': server },
    tables: {},
    room_messages: [],
    connected: false,
    logged_in: false,
    table: undefined,
    game: undefined,
    table_messages: []
};

function liveGameApp (state = initialState, action) {
    let newState = { ...state };
    switch(action.type) {
        case CONNECT_SERVER:
            newState.server = action.payload;
            break;
        case WEBSOCKET_OPEN:
            console.log('socket open');
            newState.connected = true;
            break;
        case WEBSOCKET_CLOSED:
            console.log('socket closed');
            return initialState;
        case TOGGLE_SETTINGS:
            if (newState.showSettings) { delete newState.showSettings; } else { newState.showSettings = true; }
            break;
        case PRESSED_PLAY:
            newState.pressed_play = true;
            break;
        case DISMISS_WAITING_MODAL:
            newState.waiting_modal = true;
            break;
        case WEBSOCKET_MESSAGE:
            console.log(action.payload.data);
            const json = JSON.parse(action.payload.data);
            if (json.dsgLoginErrorEvent) {
                return initialState;
            } else if (json.dsgLoginEvent) {
                newState.me = json.dsgLoginEvent.player;
                newState.admin = json.dsgLoginEvent.me.admin;
                newState.freeloader = json.dsgLoginEvent.me.subscriberLevel === 0;
                newState.logged_in = true;
            } else if (json.dsgPingEvent) {
                console.log('ping: ' + action.payload.data)
            } else if (json.dsgJoinMainRoomEvent) {
                processUser(json.dsgJoinMainRoomEvent.dsgPlayerData, newState);
            } else if (json.dsgUpdatePlayerDataEvent) {
                processUser(json.dsgUpdatePlayerDataEvent.data, newState);
            } else if (json.dsgTextMainRoomEvent) {
                addRoomMessage(json.dsgTextMainRoomEvent, newState);
            } else if (json.dsgExitMainRoomEvent) {
                exitUser(json.dsgExitMainRoomEvent.player, newState);
            } else if (json.dsgChangeStateTableEvent) {
                changeTableState(json.dsgChangeStateTableEvent, newState);
            } else if (json.dsgJoinTableEvent) {
                joinTable(json.dsgJoinTableEvent, newState);
            } else if (json.dsgExitTableEvent) {
                exitTable(json.dsgExitTableEvent, newState);
            } else if (json.dsgSitTableEvent) {
                sitTable(json.dsgSitTableEvent, newState);
            } else if (json.dsgStandTableEvent) {
                standTable(json.dsgStandTableEvent, newState);
            } else if (json.dsgOwnerTableEvent) {
                tableOwner(json.dsgOwnerTableEvent, newState);
            } else if (json.dsgTextTableEvent) {
                addTableMessage(json.dsgTextTableEvent, newState);
            } else if (json.dsgMoveTableEvent) {
                addMove(json.dsgMoveTableEvent, newState);
            } else if (json.dsgGameStateTableEvent) {
                changeGameState(json.dsgGameStateTableEvent, newState);
            } else if (json.dsgTimerChangeTableEvent) {
                changeTimer(json.dsgTimerChangeTableEvent, newState);
            } else if (json.dsgSystemMessageTableEvent) {
                serverTableMessage(json.dsgSystemMessageTableEvent, newState);
            } else if (json.dsgUndoRequestTableEvent) {
                undoRequested(json.dsgUndoRequestTableEvent, newState);
            } else if (json.dsgUndoReplyTableEvent) {
                undoReply(json.dsgUndoReplyTableEvent, newState);
            } else if (json.dsgCancelRequestTableEvent) {
                cancelRequested(json.dsgCancelRequestTableEvent, newState);
            } else if (json.dsgSwapSeatsTableEvent) {
                swapSeats(json.dsgSwapSeatsTableEvent, newState);
            // } else if (json.dsgSetPlayingPlayerTableEvent) {
            //     setPlayingPlayerTable(json.dsgSetPlayingPlayerTableEvent, newState);
            } else if (json.dsgRejectGoStateEvent) {
                rejectGoState(json.dsgRejectGoStateEvent, newState);
            } else if (json.dsgWaitingPlayerReturnTimeUpTableEvent) {
                resignOrCancel(json.dsgWaitingPlayerReturnTimeUpTableEvent, newState);
            }
            
        // {"dsgWaitingPlayerReturnTimeUpTableEvent":{"waitingForPlayerToReturnSeqNbr":0,"set":false,"player":"rainwolf","table":1,"time":1554539579997}}
        // {"dsgGameStateTableEvent":{"state":3,"changeText":"player iostest has been disconnected, game is paused. ","gameInSet":0,"table":1,"time":1554539519996}}
        //    {"dsgSetPlayingPlayerTableEvent":{"seat":1,"player":"iostest","table":1,"time":1554124915697}}
        // {"dsgSwapSeatsTableEvent":{"swap":true,"silent":false,"player":"iostest","table":1,"time":1554122803745}}
        // {"dsgSetPlayingPlayerTableEvent":{"seat":2,"player":"iostest","table":1,"time":1553629064097}} rootReducer.js:35
            break;
        default: break;
    }
    return newState;
}

export default liveGameApp;