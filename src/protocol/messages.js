// Message descriptors — the single source of truth for the pente.org `dsg*` wire
// protocol. Each `both`/`in` message is also defined once for inbound decoding and
// (where `cmd` is present) for outbound command building, so bidirectional messages
// (move, sit, swap…) live in exactly one place.
//
//   dir : 'in' | 'out' | 'both'   — direction(s) this message travels
//   cmd : string                  — outbound command name (Commands.<cmd>)
//   out : string[]                — fields a command REQUIRES (time is auto-stamped)
//   req : string[]                — fields an inbound frame must carry (decode rejects
//                                   malformed otherwise); table events require `table`
//
// Field sets are taken from real frames captured against the backend
// (see __fixtures__/wire-fixtures.json and CONTEXT.md).

const TBL = ['table']; // table-scoped inbound events must carry a table id

export const MESSAGES = {
  // ---- session / lobby ----
  dsgLoginEvent:            { dir: 'both', cmd: 'login',    out: ['guest'], req: ['player', 'me', 'serverData'] },
  dsgJoinMainRoomEvent:     { dir: 'in', req: ['dsgPlayerData'] },
  dsgExitMainRoomEvent:     { dir: 'in', req: ['player'] },
  dsgUpdatePlayerDataEvent: { dir: 'both', cmd: 'updatePlayerData', out: ['data'], req: ['data'] },
  dsgPreferenceEvent:       { dir: 'in', req: [] },
  dsgTextMainRoomEvent:     { dir: 'both', cmd: 'roomText', out: ['text'], req: ['player', 'text'] },
  dsgAddAITableEvent:       { dir: 'in', req: TBL },

  // ---- table lifecycle ----
  dsgChangeStateTableEvent: { dir: 'both', cmd: 'changeState', out: ['timed', 'initialMinutes', 'incrementalSeconds', 'rated', 'game', 'table'], req: TBL },
  dsgJoinTableEvent:        { dir: 'both', cmd: 'joinTable', out: ['table'], req: TBL },
  dsgExitTableEvent:        { dir: 'both', cmd: 'exitTable', out: ['forced', 'booted', 'table'], req: TBL },
  dsgSitTableEvent:         { dir: 'both', cmd: 'sit',       out: ['seat', 'table'], req: TBL },
  dsgStandTableEvent:       { dir: 'both', cmd: 'stand',     out: ['table'], req: TBL },
  dsgOwnerTableEvent:       { dir: 'in', req: TBL },
  dsgBootTableEvent:        { dir: 'both', cmd: 'boot',      out: ['toBoot', 'player', 'table'], req: TBL },
  dsgPlayTableEvent:        { dir: 'both', cmd: 'play',      out: ['table'], req: TBL },
  dsgSetPlayingPlayerTableEvent: { dir: 'in', req: TBL },
  dsgTextTableEvent:        { dir: 'both', cmd: 'tableText', out: ['text', 'table'], req: TBL },
  dsgSystemMessageTableEvent:    { dir: 'in', req: TBL },

  // ---- gameplay ----
  dsgGameStateTableEvent:   { dir: 'in', req: TBL },
  dsgMoveTableEvent:        { dir: 'both', cmd: 'move',      out: ['move', 'moves', 'player', 'table'], req: TBL },
  dsgTimerChangeTableEvent: { dir: 'in', req: TBL },
  dsgStartSetTimerEvent:    { dir: 'in', req: TBL },
  dsgSwapSeatsTableEvent:   { dir: 'both', cmd: 'swapSeats', out: ['swap', 'silent', 'player', 'table'], req: TBL },
  dsgSwap2PassTableEvent:   { dir: 'both', cmd: 'swap2Pass', out: ['silent', 'player', 'table'], req: TBL },
  dsgRejectGoStateEvent:    { dir: 'both', cmd: 'rejectGoState', out: ['player', 'table'], req: TBL },
  dsgResignTableEvent:      { dir: 'out', cmd: 'resign',    out: ['player', 'table'] },
  dsgForceCancelResignTableEvent: { dir: 'out', cmd: 'forceCancelResign', out: ['action', 'player', 'table'] },
  dsgWaitingPlayerReturnTimeUpTableEvent: { dir: 'in', req: TBL },

  // ---- requests / replies ----
  dsgUndoRequestTableEvent:  { dir: 'both', cmd: 'undoRequest',  out: ['player', 'table'], req: TBL },
  dsgUndoReplyTableEvent:    { dir: 'both', cmd: 'undoReply',    out: ['accepted', 'player', 'table'], req: TBL },
  dsgCancelRequestTableEvent:{ dir: 'both', cmd: 'cancelRequest', out: ['player', 'table'], req: TBL },
  // dir:'both' — the server broadcasts the reply back (the old reducer handled it inbound);
  // the fixture only captured the outbound direction. [code-review fix]
  dsgCancelReplyTableEvent:  { dir: 'both', cmd: 'cancelReply',  out: ['accepted', 'player', 'table'], req: TBL },
  dsgInviteTableEvent:       { dir: 'both', cmd: 'invite',       out: ['toInvite', 'inviteText', 'player', 'table'], req: TBL },
  dsgInviteResponseTableEvent: { dir: 'both', cmd: 'inviteResponse', out: ['toPlayer', 'responseText', 'accept', 'ignore', 'table'], req: TBL },

  // ---- arena ----
  dsgArenaCreateTableEvent:      { dir: 'out', cmd: 'arenaCreate', out: ['timed', 'initialMinutes', 'incrementalSeconds', 'rated', 'game', 'playAs', 'player', 'table'] },
  dsgArenaRequestJoinTableEvent: { dir: 'both', cmd: 'arenaRequestJoin', out: ['table'], req: TBL },
  dsgArenaAcceptTableJoinEvent:  { dir: 'out', cmd: 'arenaAccept', out: ['playerToAccept', 'table'] },
  dsgArenaRejectTableJoinEvent:  { dir: 'both', cmd: 'arenaReject', out: ['playerToReject', 'table'], req: TBL },
};

// Inbound *Error events the server emits (decode must recognize, not reject as unknown).
export const ERROR_EVENTS = [
  'dsgLoginErrorEvent',
  'dsgMoveTableErrorEvent',
  'dsgPlayTableErrorEvent',
  'dsgSitTableErrorEvent',
  'dsgResignTableErrorEvent',
  'dsgUndoRequestTableErrorEvent',
  'dsgUndoReplyTableErrorEvent',
  'dsgExitTableErrorEvent',
  'dsgChangeStateTableErrorEvent',
  'dsgTextTableErrorEvent',
  'dsgStandTableErrorEvent',
  'dsgCancelRequestTableErrorEvent',
];

// The pinger message — answered by middleware, but a valid inbound type.
export const PING = 'dsgPingEvent';

// Every type decode should accept as a known inbound frame.
export const INBOUND_TYPES = new Set([
  ...Object.keys(MESSAGES).filter((t) => MESSAGES[t].dir !== 'out'),
  ...ERROR_EVENTS,
  PING,
]);

// Outbound command descriptors keyed by their event type.
export const COMMANDS = Object.fromEntries(
  Object.entries(MESSAGES)
    .filter(([, d]) => d.cmd)
    .map(([type, d]) => [d.cmd, { type, out: d.out || [] }])
);
