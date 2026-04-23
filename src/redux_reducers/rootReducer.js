import '../redux_actions/actionTypes';
import {
   CONNECT_SERVER,
   DISMISS_WAITING_MODAL,
   MOVE_BACK,
   MOVE_FORWARD,
   MOVE_GOTO,
   MUTE,
   PRESSED_PLAY,
   REMOVE_ARENA_JOIN_REQUEST,
   REMOVE_SNACK,
   REPLIED_INVITATION,
   SHOW_BOOT_DIALOG,
   TOGGLE_CREATE_ARENA_MODAL,
   TOGGLE_SETTINGS,
   UNMUTE
} from "../redux_actions/actionTypes";
import './utils';
import User from '../Classes/UserClass';
import {
   addMove,
   addRoomMessage,
   addTableMessage,
   arenaJoinRequest,
   arenaRemoveJoinRequest,
   arenaRejectRequest,
   bootEvent,
   cancelReply,
   cancelRequested,
   changeGameState,
   changeTableState,
   changeTimer,
   exitTable,
   exitUser,
   invitationReceived,
   invitationReply,
   joinTable,
   moveForwardBack,
   moveGoTo,
   mute,
   processUser,
   rejectGoState,
   resignOrCancel,
   serverTableMessage,
   sitTable,
   standTable,
   swap2Pass,
   swapSeats,
   tableOwner,
   undoReply,
   undoRequested,
   unmute
} from "./utils";


const server = new User({name: 'game server', subscriberLevel: 0, gameData: [], name_color: 0});

const initialState = {
   users: {'game server': server},
   tables: {},
   room_messages: [{
      player: server,
      message: 'Click on a user\'s avatar to ignore their messages and invitations, this mute will only last while you\'re connected'
   }],
   connected: false,
   logged_in: false,
   table: undefined,
   game: undefined,
   table_messages: [],
   tournament: false,
   showCreateArenaModal: false,
   // snack: 'rainwolf'
};

function liveGameApp(state = initialState, action) {
   let newState = {...state};
   console.log(JSON.stringify(action))
   switch (action.type) {
      case CONNECT_SERVER:
         newState.server = action.payload;
         break;
      case "REDUX_WEBSOCKET::OPEN":
         console.log('socket open');
         newState.connected = true;
         break;
      case "REDUX_WEBSOCKET::CLOSED":
         console.log('socket closed');
         return initialState;
      case TOGGLE_SETTINGS:
         if (newState.showSettings) {
            delete newState.showSettings;
         } else {
            newState.showSettings = true;
         }
         break;
      case TOGGLE_CREATE_ARENA_MODAL:
         if (newState.showCreateArenaModal) {
            delete newState.showCreateArenaModal;
         } else {
            newState.showCreateArenaModal = true;
         }
         break;
      case REMOVE_ARENA_JOIN_REQUEST:
         arenaRemoveJoinRequest(action.payload, newState);
         break;
      case PRESSED_PLAY:
         newState.pressed_play = true;
         break;
      case DISMISS_WAITING_MODAL:
         newState.waiting_modal = true;
         break;
      case MOVE_BACK:
         moveForwardBack(false, newState);
         break;
      case MOVE_FORWARD:
         moveForwardBack(true, newState);
         break;
      case MOVE_GOTO:
         moveGoTo(action.payload, newState);
         break;
      case MUTE:
         mute(action.payload, newState);
         break;
      case UNMUTE:
         unmute(action.payload, newState);
         break;
      case REMOVE_SNACK:
         delete newState.snack;
         break;
      case SHOW_BOOT_DIALOG:
         if (action.payload) {
            newState.showBootDialog = action.payload;
         } else {
            delete newState.showBootDialog;
         }
         break;
      case REPLIED_INVITATION:
         delete newState.received_invitation;
         break;
      case "REDUX_WEBSOCKET::MESSAGE":
         let host = window.location.hostname;
         if (host === 'localhost' || host === 'machine.local') {
            console.log('message: ' + action.payload.message)
         }
         const json = JSON.parse(action.payload.message);
         if (json.dsgLoginErrorEvent) {
            return initialState;
         } else if (json.dsgLoginEvent) {
            newState.me = json.dsgLoginEvent.player;
            newState.admin = json.dsgLoginEvent.me.admin;
            newState.freeloader = json.dsgLoginEvent.me.subscriberLevel === 0;
            newState.logged_in = true;
            newState.tournament = json.dsgLoginEvent.serverData.tournament;
            newState.arena = json.dsgLoginEvent.serverData.arena;
            // } else if (json.dsgPingEvent) {
            //     console.log('ping: ' + action.payload.data)
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
         } else if (json.dsgCancelReplyTableEvent) {
            cancelReply(json.dsgCancelReplyTableEvent, newState);
            // } else if (json.dsgSetPlayingPlayerTableEvent) {
            //     setPlayingPlayerTable(json.dsgSetPlayingPlayerTableEvent, newState);
         } else if (json.dsgRejectGoStateEvent) {
            rejectGoState(json.dsgRejectGoStateEvent, newState);
         } else if (json.dsgWaitingPlayerReturnTimeUpTableEvent) {
            resignOrCancel(json.dsgWaitingPlayerReturnTimeUpTableEvent, newState);
         } else if (json.dsgBootTableEvent) {
            bootEvent(json.dsgBootTableEvent, newState);
         } else if (json.dsgInviteTableEvent) {
            invitationReceived(json.dsgInviteTableEvent, newState);
         } else if (json.dsgInviteResponseTableEvent) {
            invitationReply(json.dsgInviteResponseTableEvent, newState);
         } else if (json.dsgSwap2PassTableEvent) {
            swap2Pass(json.dsgSwap2PassTableEvent, newState);
         } else if (json.dsgArenaRequestJoinTableEvent) {
            arenaJoinRequest(json.dsgArenaRequestJoinTableEvent, newState);
         } else if (json.dsgArenaRejectTableJoinEvent) {
            arenaRejectRequest(json.dsgArenaRejectTableJoinEvent, newState);
         }
         // {"dsgInviteResponseTableEvent":{"toPlayer":"rainwolf","responseText":"sure","accept":true,"ignore":false,"player":"iostest","table":1,"time":1554998965841}}
         break;
      default:
         break;
   }
   return newState;
}

export default liveGameApp;