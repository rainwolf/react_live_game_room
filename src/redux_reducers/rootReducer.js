import '../redux_actions/actionTypes';
import { CONNECT_SERVER, SET_TIMER } from "../redux_actions/actionTypes";
import { WEBSOCKET_OPEN, WEBSOCKET_CLOSED, WEBSOCKET_MESSAGE } from '@giantmachines/redux-websocket';
import './utils';
import User from './UserClass';
import {processUser, addRoomMessage, exitUser, changeTableState,
    joinTable, exitTable, sitTable, standTable, tableOwner,
    addTableMessage, addMove, changeGameState, changeTimer,
    serverTableMessage, adjustTimer, undoRequested, undoReply,
    cancelRequested, swapSeats, setPlayingPlayerTable} from "./utils";


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
        case SET_TIMER:
            adjustTimer(action.payload, newState);
            break;
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
        case WEBSOCKET_MESSAGE:
            console.log(action.payload.data);
            const json = JSON.parse(action.payload.data);
            if (json.dsgLoginErrorEvent) {
                return initialState;
            } else if (json.dsgLoginEvent) {
                newState.me = json.dsgLoginEvent.player;
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
            } else if (json.dsgSetPlayingPlayerTableEvent) {
                setPlayingPlayerTable(json.dsgSetPlayingPlayerTableEvent, newState);
            }
        //    {"dsgSetPlayingPlayerTableEvent":{"seat":1,"player":"iostest","table":1,"time":1554124915697}}
        // {"dsgSwapSeatsTableEvent":{"swap":true,"silent":false,"player":"iostest","table":1,"time":1554122803745}}
        // {"dsgSetPlayingPlayerTableEvent":{"seat":2,"player":"iostest","table":1,"time":1553629064097}} rootReducer.js:35
            break;
        default: break;
    }
    return newState;
}

export default liveGameApp;