// Transient UI state for live Tombstone Pente, cloned from ui/renjuOpeningUi.js. `pending` is
// set when a move or a skip is SENT and blocks double sends (board + button) until a server
// echo (or rejection) arrives (ADVANCING_EVENTS). It is owned entirely by this slice; the
// game reducers never touch it.

const MARK_PENDING = 'TOMBSTONE_UI/MARK_PENDING';

// Echoes that mean the sent move/skip was applied, rejected, or the game/table was reset.
export const ADVANCING_EVENTS = new Set([
  'dsgMoveTableEvent',
  'dsgTombstoneSkipDeadTableEvent',
  'dsgMoveTableErrorEvent',
  'dsgTombstoneSkipDeadTableErrorEvent',
  'dsgUndoReplyTableEvent',
  'dsgGameStateTableEvent',
  'dsgChangeStateTableEvent',
  'dsgExitTableEvent',
  'dsgBootTableEvent',
]);

export const INITIAL = { pending: false };

export const tombstoneMarkPending = () => ({ type: MARK_PENDING });

export function tombstoneUiReducer(state = INITIAL, action) {
  if (action.type === MARK_PENDING) return state.pending ? state : { pending: true };
  if (ADVANCING_EVENTS.has(action.type)) return state.pending ? INITIAL : state;
  return state;
}
