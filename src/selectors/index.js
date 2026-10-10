// Selectors — the read seam for the normalized Redux state. Components ask these named
// questions instead of re-deriving them by reaching into the state shape, so the shape
// (normalized {tables, table, ...}) stays private and each derivation is tested once.
// Holds both selectors over state (selectCurrentTable) and the pure read-rules they build
// on (isGuestName, tableVisibleToGuest) — the latter take a name / a table so the lobby
// filters can run in render without churning mapStateToProps references.
//
// Deliberately NOT one selector per state key: bare pass-throughs (state.me, state.users,
// state.admin, ...) are inlined at call sites — wrapping them would be ceremony, not depth.
// Only multi-step reaches and duplicated derivations earn a home here.

// The table the user is currently seated at. The raw reach state.tables[state.table] was
// duplicated across 16 call sites (15 components + the Table page); the single place that
// knows the current-table is
// a normalized {tables} lookup keyed by {table}. Returns undefined when not at a table
// (faithful to the original expression, which the Table-view components already assume).
export const selectCurrentTable = (state) => state.tables[state.table];

// Guest detection: a guest's name starts with "guest" (case-insensitive). The rule is
// security-relevant — guests must not see rated tables — and was duplicated in the Arena and
// Room lobbies; this is its one tested home so the two lobbies can't drift apart.
export const isGuestName = (name) => (name || '').toLowerCase().startsWith('guest');

// Whether a viewer may see a given lobby table: guests never see rated tables; registered
// users see everything. Pure over (table, isGuest) so it runs in render without churning
// mapStateToProps references.
export const tableVisibleToGuest = (table, isGuest) => !isGuest || !table.rated;

// Arena owner's join-request snapshot ({table, requests, answersAction}), but only when it is
// for the table I am at: the record is stored as received, and a snapshot for another table
// (or one left over from a table I just left) must never render.
export const selectArenaJoinRequests = (state) => {
  const record = state.arenaJoinRequests;
  return record && record.table === state.table ? record : undefined;
};

// The accept/decline I sent and still await the server's snapshot for ({table, player}),
// only for the table I am at.
export const selectArenaOwnerPending = (state) => {
  const pending = state.arenaOwnerPending;
  return pending && pending.table === state.table ? pending : undefined;
};

// Requester lobby card state (spec C3). 'busy': a request or withdraw for this table
// ({table, op} in state.arenaRequestsInFlight) awaits the server's answer, so taps are
// ignored. 'requested': the latest snapshot lists it, so a tap offers withdraw. The lobby
// keys tables by Object.keys (strings) while the server sends ints, hence the Number().
export const arenaTableStatus = (tableId, myRequests, inFlight) => {
  const id = Number(tableId);
  if ((inFlight || []).some((e) => e.table === id)) return 'busy';
  if ((myRequests || []).includes(id)) return 'requested';
  return 'none';
};
