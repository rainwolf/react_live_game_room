import '../redux_actions/actionTypes';
import {
   CONNECT_SERVER,
   CLEAR_NOTIFICATIONS,
   DISMISS_WAITING_MODAL,
   MOVE_BACK,
   MOVE_FORWARD,
   MOVE_GOTO,
   MUTE,
   PRESSED_PLAY,
   REMOVE_ARENA_JOIN_REQUEST,
   REMOVE_SNACK,
   REPLIED_INVITATION,
   UNMUTE
} from "../redux_actions/actionTypes";
import {modalsReducer} from "../ui/modals";
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
   modals: {},
   pendingNotifications: [],
};

// Inbound protocol events — the protocol middleware decodes each wss frame into a
// typed action ({type: 'dsgXEvent', payload}); this registry applies it via the
// existing utils mutators. One entry per server event, replacing the old 35-branch
// JSON.parse switch. (dsgLoginErrorEvent resets to initialState — handled in the
// switch below; dsgPingEvent is answered by the middleware and never reaches here.)
const EVENT_HANDLERS = {
   dsgLoginEvent: (p, s) => {
      s.me = p.player;
      s.admin = p.me.admin;
      s.freeloader = p.me.subscriberLevel === 0;
      s.logged_in = true;
      s.tournament = p.serverData.tournament;
      s.arena = p.serverData.arena;
   },
   dsgJoinMainRoomEvent: (p, s) => processUser(p.dsgPlayerData, s),
   dsgUpdatePlayerDataEvent: (p, s) => processUser(p.data, s),
   dsgTextMainRoomEvent: (p, s) => addRoomMessage(p, s),
   dsgExitMainRoomEvent: (p, s) => exitUser(p.player, s),
   dsgChangeStateTableEvent: (p, s) => changeTableState(p, s),
   dsgJoinTableEvent: (p, s) => joinTable(p, s),
   dsgExitTableEvent: (p, s) => exitTable(p, s),
   dsgSitTableEvent: (p, s) => sitTable(p, s),
   dsgStandTableEvent: (p, s) => standTable(p, s),
   dsgOwnerTableEvent: (p, s) => tableOwner(p, s),
   dsgTextTableEvent: (p, s) => addTableMessage(p, s),
   dsgMoveTableEvent: (p, s) => addMove(p, s),
   dsgGameStateTableEvent: (p, s) => changeGameState(p, s),
   dsgTimerChangeTableEvent: (p, s) => changeTimer(p, s),
   dsgSystemMessageTableEvent: (p, s) => serverTableMessage(p, s),
   dsgUndoRequestTableEvent: (p, s) => undoRequested(p, s),
   dsgUndoReplyTableEvent: (p, s) => undoReply(p, s),
   dsgCancelRequestTableEvent: (p, s) => cancelRequested(p, s),
   dsgSwapSeatsTableEvent: (p, s) => swapSeats(p, s),
   dsgCancelReplyTableEvent: (p, s) => cancelReply(p, s),
   dsgRejectGoStateEvent: (p, s) => rejectGoState(p, s),
   dsgWaitingPlayerReturnTimeUpTableEvent: (p, s) => resignOrCancel(p, s),
   dsgBootTableEvent: (p, s) => bootEvent(p, s),
   dsgInviteTableEvent: (p, s) => invitationReceived(p, s),
   dsgInviteResponseTableEvent: (p, s) => invitationReply(p, s),
   dsgSwap2PassTableEvent: (p, s) => swap2Pass(p, s),
   dsgArenaRequestJoinTableEvent: (p, s) => arenaJoinRequest(p, s),
   dsgArenaRejectTableJoinEvent: (p, s) => arenaRejectRequest(p, s),
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
         delete newState.notification;
         break;
      case CLEAR_NOTIFICATIONS:
         newState.pendingNotifications = [];
         break;
      case REPLIED_INVITATION:
         delete newState.received_invitation;
         break;
      case "dsgLoginErrorEvent":
         return initialState;
      default: {
         // typed protocol events dispatched by the protocol middleware
         const handler = EVENT_HANDLERS[action.type];
         if (handler) {
            handler(action.payload, newState);
         }
         break;
      }
   }
   // The discretionary-modal slice reduces on every action — the modal seam owns the verb
   // list (OPEN/CLOSE/TOGGLE_MODAL) and returns the same modals reference for everything
   // else, so this is a no-op for non-modal actions.
   newState.modals = modalsReducer(newState.modals, action);
   return newState;
}

export default liveGameApp;