# Arena Persistent Join Requests (React live room) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the React live game room render arena join requests purely from server-pushed state: snapshots for the owner, a "requested" set for the requester, reason-coded end notices, a withdraw command, and no client expiry timers.

**Architecture:** The protocol descriptors (`src/protocol/messages.js`) gain the three new server-to-client events and the new withdraw command, and the two retired server-to-client frames become outbound-only. Pure reducer helpers in `src/redux_reducers/utils.js` store the owner snapshot (`state.arenaJoinRequests`), the requester set (`state.arenaMyRequests`) and the two in-flight markers, and turn end events into snackbar notifications. The owner list's freeze and minimum-interactive-window rule (spec C2) is a pure state machine with a timer controller in `src/ui/arenaRequestFreeze.js`, wrapped by a thin React hook in `src/ui/useFrozenRequests.js`. The components (`JoinRequestComponent`, `TableCard`, `Arena`, a new `ArenaWithdrawModal`) only read that state and dispatch.

**Tech Stack:** React 18.3, MUI 5, Redux 4 (`legacy_createStore`, single reducer), `@giantmachines/redux-websocket`, RSBuild/Rspack, vitest 4 (node environment by default, `// @vitest-environment jsdom` per file when React must render).

**Spec:** `/Users/waliedothman/mariposa/coding/pente.org-project/pente.org/docs/superpowers/specs/2026-10-10-arena-persistent-join-requests-design.md` (sections "Wire protocol", "Clients" C1–C5, "Testing"). Code map: `/private/tmp/claude-501/-Users-waliedothman-mariposa-coding-pente-org-project/a8f6bd48-e6f7-4b99-b929-41eb69f07e7a/scratchpad/arena-map.md` (section `===== react =====`).

**Repo / branch:** `/Users/waliedothman/mariposa/coding/pente.org-project/react_live_game_room`, branch `arena-persistent-join-requests` (already checked out). Abbreviated below as `$RX`; it is a placeholder, not an environment variable, so write the absolute path when running a command (the login shell is fish).

## Global Constraints

- Envelope unchanged: `{"<key>": {fields}}`, lowercase `dsg…` keys. Every outbound command still gets `time: 0` from `buildCommand`.
- C→S, existing, shape unchanged: `dsgArenaRequestJoinTableEvent {table}`, `dsgArenaAcceptTableJoinEvent {table, playerToAccept}`, `dsgArenaRejectTableJoinEvent {table, playerToReject}`.
- C→S, new: `dsgArenaWithdrawJoinRequestEvent {table}`.
- S→C, new: `dsgArenaJoinRequestsEvent {table, requests: [{player, seq}]}` (owner; full pending list, `seq` ascending, server-assigned, never reused); `dsgArenaMyRequestsEvent {tables: [int]}` (requester; full set); `dsgArenaRequestEndedEvent {table, player, owner, reason}`.
- Reasons, verbatim: `DECLINED`, `TABLE_FULL`, `TABLE_CLOSED`, `DUPLICATE`, `BLOCKED`, `NOT_AVAILABLE`, `GUEST_RATED`, `BOOTED`, `NO_LONGER_AVAILABLE`. `BOOTED` means the requester was booted from that table less than 5 minutes ago (R2).
- No longer sent S→C: `dsgArenaRequestJoinTableEvent` and `dsgArenaRejectTableJoinEvent`.
- Notice texts, verbatim (C4): `DECLINED`: "<owner> declined your request"; `TABLE_FULL`: "Table <n> is no longer available"; `TABLE_CLOSED`: "Table <n> was closed"; `DUPLICATE`: "You already sent a request to <owner>"; `BOOTED`: "<owner> removed you from table <n>, try again in a few minutes"; `BLOCKED`: "You can't request table <n> again until its next game"; `NOT_AVAILABLE`: "You can't join table <n> right now"; `GUEST_RATED`: "Guests can't join rated tables"; `NO_LONGER_AVAILABLE`: "<player> is no longer available".
- Withdraw confirm text, verbatim (C3): "Withdraw your request to table <n>? You won't be able to request it again until its next game."
- Freeze is 400 ms (milliseconds); the minimum interactive window is 1000 ms. These are the only arena timers allowed in the client. No request expiry, no countdown (C1).
- No optimistic removal on accept or decline (C2).
- Reducer helpers stay pure: side effects go through `emit(state, {sound, tab})` and `state.notification = {kind: 'info', message}` only.
- Deploy order: from Task 1 on, this client ignores the retired server-to-client `dsgArenaRequestJoinTableEvent` and `dsgArenaRejectTableJoinEvent`, so this build must reach production together with or after the pente.org server change for this spec, never before it.
- Commits: `git -C $RX commit -S -m "…"`. No co-author, "Generated with" or similar trailer lines. Never commit `.env.local` or `.env.development`.
- Test runs: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run <file>`; full suite `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`. Scratch files go under `/private/tmp/claude-501/arena-react`, never inside the repo.
- Style: components, reducer and `utils.js` use 3-space indentation; `src/protocol/**`, `src/ui/**`, `src/selectors/**` and all `*.test.js` files use 2-space indentation.

## Review Focus

1. **Server omits null fields.** Gson's default serializer drops null fields, so a `dsgArenaRequestEndedEvent` can arrive without `owner`, and a snapshot without `requests` or `tables`. Expected: the frame is still decoded and applied (empty list, fallback owner text), never dropped, because a dropped answer would leave the client stuck in-flight. Pinned in Task 1 (decode tests), Task 3 (missing `requests`), Task 4 (missing `tables`, `DECLINED` without `owner`).
2. **Table id type.** The lobby iterates `Object.keys(tables)` (strings) while the server sends `tables: [int]`. Expected: the "Requested" mark and the busy state match either way. Pinned in Task 6 (`arenaTableStatus('3', [3], [])`).
3. **Reused table number.** The owner leaves table 3 and later creates a new table 3. Expected: no stale rows from the old table flash up. Pinned in Task 3 (own exit clears the snapshot and the in-flight marker).
4. **Own accept/decline answered inside the minimum window.** Expected: the answering snapshot freezes and applies at once, so the declined row never sits interactive for up to 1 s (second). Pinned in Task 2 (`urgent` snapshot) and Task 3 (`answersAction`).
5. **A burst of snapshots.** Many requesters arriving fast. Expected: after every unfreeze the owner gets at least 1000 ms of interactive list. Pinned in Task 2 (controller burst test with fake timers).
6. **No unlocked frame after an answer.** The reducer clears the owner's in-flight marker in the same step that stores the answering snapshot. Expected: the owner's rows never render with enabled Accept/Decline between that store and the freeze. Pinned in Task 2 (hook reports `frozen` for a not-yet-pushed record; layout effects push before paint; per-render test).
7. **Requests to two tables in flight.** Expected: the answer for one table never unlocks the other's card. Pinned in Task 4 (per-table `{table, op}` in-flight entries).

## Decisions on spec gaps

- **Min window vs. "Then the freeze applies" (C2).** A snapshot that answers this client's own accept/decline (the first snapshot for that table after the click) is marked `answersAction` and is treated as urgent: it freezes immediately even inside the minimum window. All other snapshots follow the window rule.
- **"While the list is visible" (C2).** The list counts as visible when it shows at least one row. A snapshot that arrives while no rows are shown is applied at once (nothing under the pointer) and opens a minimum window.
- **"The list hides" (C2).** When the applied snapshot is empty the component renders a muted "No join requests yet" caption in place of the list. The chat pane is not swapped in.
- **Requesting lock (C3).** Each tap records `{table, op}` (`op` is `request` or `withdraw`) and the card stays busy until that table's own answer is visible: a snapshot listing it (request), a snapshot without it (withdraw), or a `dsgArenaRequestEndedEvent` for it (a refused request never enters the set). Clearing every in-flight table on any snapshot (the literal reading of "until the next `dsgArenaMyRequestsEvent`") would let the answer for table 3 unlock table 5 before table 5's answer, and a second tap on 5 would then come back `DUPLICATE`, breaking C3's "double-taps never produce `DUPLICATE`". R2 sends an end event for every refusal and R11 a snapshot for every request and withdraw, so no card stays busy; socket close resets the list.
- **Withdraw confirm re-checks.** If the request ends (`DECLINED`, `TABLE_FULL`, `TABLE_CLOSED`) while the dialog is open, the dialog closes itself and Withdraw is not sent, since R3 might otherwise add the player to the blocked set for a request that no longer exists.
- **New-request cue (C2).** One sound and one tab nudge per snapshot, naming every new player ("bob wants…", "bob, carol want…"). The cue fires only for the table the client is seated at.
- **Decode strictness.** New inbound descriptors require only `table` (none for `dsgArenaMyRequestsEvent`), see Review Focus 1.
- **Rows for requesters missing from `state.users`** render with the plain name and no rating instead of being hidden, so rows never shift because the user list lags.
- **Withdraw dialog** goes through the existing modal seam (`MODALS.ARENA_WITHDRAW`, payload = table number).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/protocol/messages.js:67-72` | Modify | Arena descriptors: retire S→C request/reject, add withdraw command, add three inbound events |
| `src/protocol/__fixtures__/wire-fixtures.json:51-75` | Modify | Drop the captured `in` frames for the two retired S→C events |
| `src/protocol/__tests__/decode.test.js` | Modify (append) | Decode tests for the new events and the retired ones |
| `src/protocol/__tests__/commands.test.js` | Modify (append) | Withdraw and lowercase-reject command tests |
| `src/ui/arenaRequestFreeze.js` | Create | Pure freeze/min-window reducer, `timerFor`, timer controller |
| `src/ui/useFrozenRequests.js` | Create | Thin React hook over the controller |
| `src/ui/__tests__/arenaRequestFreeze.test.js` | Create | Reducer + controller tests (node, fake timers) |
| `src/ui/__tests__/useFrozenRequests.test.js` | Create | Hook wiring test (jsdom, fake timers) |
| `src/redux_reducers/utils.js:108-126, 550-577` | Modify | New arena helpers; remove old ones; clear owner state on own exit |
| `src/redux_reducers/rootReducer.js:2-61, 66-82, 129-130, 147-149` | Modify | Register new handlers/actions; drop old ones; initial state keys |
| `src/redux_actions/actionTypes.js:16` | Modify | `ARENA_OWNER_ACTION_SENT`, `ARENA_REQUEST_SENT`; remove `REMOVE_ARENA_JOIN_REQUEST` (Task 5) |
| `src/Classes/TableClass.js:102-113` | Modify | Remove `addArenaPlayerRequest` / `removeArenaPlayerRequest` |
| `src/selectors/index.js` | Modify (append) | `selectArenaJoinRequests`, `selectArenaOwnerPending`, `arenaTableStatus` |
| `src/selectors/__tests__/selectors.test.js` | Modify (append) | Selector tests |
| `src/redux_reducers/__tests__/arenaRequests.test.js` | Create | Owner and requester reducer tests |
| `src/Components/Arena/JoinRequestComponent.js` | Rewrite | Owner list: frozen rows, overlay, row spinner, mute mapped |
| `src/Pages/Table.js:122` | Modify | Stop passing `table.arenaPlayerRequests` |
| `src/Components/Table/TableCard.js` | Modify | Remove countdown; `requested` chip and `busy` spinner |
| `src/Pages/Arena.js` | Modify | Tap logic (request / withdraw / ignore), status props, withdraw modal |
| `src/Components/Arena/ArenaWithdrawModal.js` | Create | Withdraw confirm dialog |
| `src/ui/modals.js:26-30` | Modify | `MODALS.ARENA_WITHDRAW` |
| `CONTEXT.md:79` | Modify | Add `ARENA_WITHDRAW` to the MODALS registry line |

---

### Task 1: Protocol descriptors for the new arena events

**Files:**
- Modify: `$RX/src/protocol/messages.js:67-72`
- Modify: `$RX/src/protocol/__fixtures__/wire-fixtures.json:51-75`
- Test: `$RX/src/protocol/__tests__/decode.test.js` (append at end of file)
- Test: `$RX/src/protocol/__tests__/commands.test.js` (append at end of file)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Commands.arenaWithdraw({table: number})` → `{dsgArenaWithdrawJoinRequestEvent: {table, time: 0}}`.
  - Inbound actions reaching the reducer: `{type: 'dsgArenaJoinRequestsEvent', payload: {table, requests?, time?}}`, `{type: 'dsgArenaMyRequestsEvent', payload: {tables?, time?}}`, `{type: 'dsgArenaRequestEndedEvent', payload: {table, player?, owner?, reason?, time?}}`.
  - `dsgArenaRequestJoinTableEvent` and `dsgArenaRejectTableJoinEvent` inbound frames now decode as `{ok: false, error: {kind: 'unknown'}}` and are swallowed by `protocolMiddleware`.

- [ ] **Step 1: Write the failing decode tests**

Append to `$RX/src/protocol/__tests__/decode.test.js`:

```js
describe('arena join-request events (spec 2026-10-10)', () => {
  const frame = (obj) => decode({ type: 'REDUX_WEBSOCKET::MESSAGE', payload: { message: JSON.stringify(obj) } });

  test('owner snapshot decodes with its requests', () => {
    const r = frame({ dsgArenaJoinRequestsEvent: { table: 3, requests: [{ player: 'bob', seq: 7 }], time: 1 } });
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe('dsgArenaJoinRequestsEvent');
    expect(r.event.payload.requests).toEqual([{ player: 'bob', seq: 7 }]);
  });

  test('owner snapshot whose requests field the server omitted still decodes', () => {
    const r = frame({ dsgArenaJoinRequestsEvent: { table: 3, time: 1 } });
    expect(r.ok).toBe(true);
  });

  test('owner snapshot without a table id is rejected', () => {
    const r = frame({ dsgArenaJoinRequestsEvent: { requests: [] } });
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('my-requests decodes, also when tables was omitted', () => {
    expect(frame({ dsgArenaMyRequestsEvent: { tables: [2, 5], time: 1 } }).ok).toBe(true);
    expect(frame({ dsgArenaMyRequestsEvent: { time: 1 } }).ok).toBe(true);
  });

  test('request-ended decodes without an owner (null field omitted by the server)', () => {
    const r = frame({ dsgArenaRequestEndedEvent: { table: 4, player: 'carol', reason: 'TABLE_CLOSED', time: 1 } });
    expect(r.ok).toBe(true);
    expect(r.event.payload.reason).toBe('TABLE_CLOSED');
  });

  test('request-ended BOOTED decodes and carries the owner it names', () => {
    const r = frame({ dsgArenaRequestEndedEvent: { table: 4, player: 'carol', owner: 'olga', reason: 'BOOTED', time: 1 } });
    expect(r.ok).toBe(true);
    expect(r.event.payload.reason).toBe('BOOTED');
    expect(r.event.payload.owner).toBe('olga');
  });

  test('the retired server->client request/reject frames are dropped as unknown', () => {
    for (const type of ['dsgArenaRequestJoinTableEvent', 'dsgArenaRejectTableJoinEvent']) {
      const r = frame({ [type]: { player: 'x', table: 1, time: 1 } });
      expect(r.ok).toBe(false);
      expect(r.error.kind).toBe('unknown');
    }
  });
});
```

- [ ] **Step 2: Write the failing command tests**

Append to `$RX/src/protocol/__tests__/commands.test.js`:

```js
describe('arena join-request commands (spec 2026-10-10)', () => {
  test('arenaWithdraw frame', () => {
    expect(Commands.arenaWithdraw({ table: 4 }))
      .toEqual({ dsgArenaWithdrawJoinRequestEvent: { table: 4, time: 0 } });
  });

  test('arenaWithdraw requires the table', () => {
    expect(() => Commands.arenaWithdraw({})).toThrow(/missing required field "table"/);
  });

  test('arenaReject sends the lowercase key the server decodes', () => {
    expect(Object.keys(Commands.arenaReject({ playerToReject: 'bob', table: 4 })))
      .toEqual(['dsgArenaRejectTableJoinEvent']);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/protocol`
Expected: FAIL. The new-event tests report `error.kind` `'unknown'` instead of `ok: true`, the retired-frame test reports `ok: true`, and `Commands.arenaWithdraw is not a function`.

- [ ] **Step 4: Update the descriptors**

In `$RX/src/protocol/messages.js` replace lines 67-71:

```js
  // ---- arena ----
  dsgArenaCreateTableEvent:      { dir: 'out', cmd: 'arenaCreate', out: ['timed', 'initialMinutes', 'incrementalSeconds', 'rated', 'game', 'playAs', 'player', 'table'] },
  dsgArenaRequestJoinTableEvent: { dir: 'both', cmd: 'arenaRequestJoin', out: ['table'], req: TBL },
  dsgArenaAcceptTableJoinEvent:  { dir: 'out', cmd: 'arenaAccept', out: ['playerToAccept', 'table'] },
  dsgArenaRejectTableJoinEvent:  { dir: 'both', cmd: 'arenaReject', out: ['playerToReject', 'table'], req: TBL },
```

with:

```js
  // ---- arena ----
  // Join requests are server-driven (spec 2026-10-10): the server pushes full snapshots
  // and reason-coded end notices; request/accept/reject/withdraw travel client->server only.
  dsgArenaCreateTableEvent:      { dir: 'out', cmd: 'arenaCreate', out: ['timed', 'initialMinutes', 'incrementalSeconds', 'rated', 'game', 'playAs', 'player', 'table'] },
  dsgArenaRequestJoinTableEvent: { dir: 'out', cmd: 'arenaRequestJoin', out: ['table'] },
  dsgArenaAcceptTableJoinEvent:  { dir: 'out', cmd: 'arenaAccept', out: ['playerToAccept', 'table'] },
  dsgArenaRejectTableJoinEvent:  { dir: 'out', cmd: 'arenaReject', out: ['playerToReject', 'table'] },
  dsgArenaWithdrawJoinRequestEvent: { dir: 'out', cmd: 'arenaWithdraw', out: ['table'] },
  // Inbound `req` is kept minimal on purpose: the server's Gson omits null fields, so only
  // the primitive `table` is guaranteed. Reducers default the missing lists.
  dsgArenaJoinRequestsEvent:     { dir: 'in', req: TBL },
  dsgArenaMyRequestsEvent:       { dir: 'in', req: [] },
  dsgArenaRequestEndedEvent:     { dir: 'in', req: TBL },
```

- [ ] **Step 5: Drop the retired inbound fixtures**

The characterization test in `decode.test.js` decodes every fixture that has an `in` frame, and those two frames are no longer valid inbound. In `$RX/src/protocol/__fixtures__/wire-fixtures.json` replace lines 51-75:

```json
    "dsgArenaRejectTableJoinEvent": {
      "in": {
        "playerToReject": "guest39",
        "message": "Wait one minute after rejection before requesting again.",
        "player": "guest38",
        "table": 1,
        "time": 1781359114553
      },
      "out": {
        "playerToReject": "guest39",
        "table": 1,
        "time": 0
      }
    },
    "dsgArenaRequestJoinTableEvent": {
      "in": {
        "player": "guest39",
        "table": 1,
        "time": 1781359113637
      },
      "out": {
        "table": 1,
        "time": 0
      }
    },
```

with:

```json
    "dsgArenaRejectTableJoinEvent": {
      "out": {
        "playerToReject": "guest39",
        "table": 1,
        "time": 0
      }
    },
    "dsgArenaRequestJoinTableEvent": {
      "out": {
        "table": 1,
        "time": 0
      }
    },
```

- [ ] **Step 6: Run the protocol tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/protocol`
Expected: PASS, all four protocol test files green (the outbound fixture tests still build both arena frames).

- [ ] **Step 7: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: `Test Files  26 passed (26)`, 0 failed. (The reducer still registers handlers for the retired events; they are now unreachable and are removed in Tasks 3 and 4.)

- [ ] **Step 8: Commit**

```bash
git -C $RX add src/protocol/messages.js src/protocol/__fixtures__/wire-fixtures.json src/protocol/__tests__/decode.test.js src/protocol/__tests__/commands.test.js
git -C $RX commit -S -m "feat(arena): protocol descriptors for server-driven join requests"
```

---

### Task 2: Freeze and minimum-window state machine plus hook

**Files:**
- Create: `$RX/src/ui/arenaRequestFreeze.js`
- Create: `$RX/src/ui/useFrozenRequests.js`
- Test: `$RX/src/ui/__tests__/arenaRequestFreeze.test.js`
- Test: `$RX/src/ui/__tests__/useFrozenRequests.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks. A "request row" is `{player: string, seq: number}`.
- Produces:
  - `FREEZE_MS = 400`, `MIN_WINDOW_MS = 1000`, `PHASE = {IDLE: 'idle', FROZEN: 'frozen', WINDOW: 'window'}`.
  - `initialFreezeState = {phase: 'idle', shown: [], held: null, epoch: 0}`.
  - `freezeReducer(state, event) → state` with events `{type: 'snapshot', requests: Row[], urgent: boolean}` and `{type: 'tick', epoch: number}`.
  - `timerFor(state) → number | null`.
  - `createFreezeController(onChange: (state) => void, timers?: {set, clear}) → {push(requests: Row[], urgent?: boolean), getState(), dispose()}`.
  - `useFrozenRequests(record: {table, requests: Row[], answersAction: boolean} | undefined) → {rows: Row[], frozen: boolean}` (Task 5 consumes this).

- [ ] **Step 1: Write the failing state-machine and controller tests**

Create `$RX/src/ui/__tests__/arenaRequestFreeze.test.js`:

```js
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FREEZE_MS,
  MIN_WINDOW_MS,
  PHASE,
  initialFreezeState,
  freezeReducer,
  timerFor,
  createFreezeController,
} from '../arenaRequestFreeze';

const rows = (...players) => players.map((player, i) => ({ player, seq: i + 1 }));
const snapshot = (requests, urgent = false) => ({ type: 'snapshot', requests, urgent });
const tick = (s) => freezeReducer(s, { type: 'tick', epoch: s.epoch });
const names = (s) => s.shown.map((r) => r.player);
// a visible list, idle (its first minimum window has ended)
const idleShowing = (...players) => tick(freezeReducer(initialFreezeState, snapshot(rows(...players))));

describe('freezeReducer — the pure C2 state machine', () => {
  test('starts idle with nothing shown and no timer', () => {
    expect(initialFreezeState.phase).toBe(PHASE.IDLE);
    expect(initialFreezeState.shown).toEqual([]);
    expect(timerFor(initialFreezeState)).toBeNull();
  });

  test('a snapshot while no rows are shown applies at once and opens the interactive window', () => {
    const s = freezeReducer(initialFreezeState, snapshot(rows('a')));
    expect(names(s)).toEqual(['a']);
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(timerFor(s)).toBe(MIN_WINDOW_MS);
  });

  test('the window ending with nothing held goes idle', () => {
    const s = idleShowing('a');
    expect(s.phase).toBe(PHASE.IDLE);
    expect(names(s)).toEqual(['a']);
    expect(timerFor(s)).toBeNull();
  });

  test('a snapshot while rows are shown and idle freezes without changing the rows', () => {
    const s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(s)).toEqual(['a']);
    expect(timerFor(s)).toBe(FREEZE_MS);
  });

  test('the freeze ending applies the held snapshot and opens the window', () => {
    const s = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b'))));
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(names(s)).toEqual(['a', 'b']);
    expect(s.held).toBeNull();
  });

  test('snapshots during a freeze replace the held one; only the last is applied', () => {
    let s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    s = freezeReducer(s, snapshot(rows('a', 'b', 'c')));
    s = freezeReducer(s, snapshot(rows('c')));
    expect(names(tick(s))).toEqual(['c']);
  });

  test('a snapshot during a freeze does not restart the freeze timer', () => {
    const frozen = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(freezeReducer(frozen, snapshot(rows('c'))).epoch).toBe(frozen.epoch);
  });

  test('a snapshot inside the window is held without changing rows; the window end starts the next freeze', () => {
    let s = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')))); // window, showing a,b
    s = freezeReducer(s, snapshot(rows('b')));
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(names(s)).toEqual(['a', 'b']);
    s = tick(s);
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(s)).toEqual(['a', 'b']);
    s = tick(s);
    expect(names(s)).toEqual(['b']);
  });

  test('an urgent snapshot (the answer to my own accept/decline) freezes at once even inside the window', () => {
    const win = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b'))));
    const s = freezeReducer(win, snapshot(rows('b'), true));
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(tick(s))).toEqual(['b']);
  });

  test('an empty snapshot while visible freezes, then leaves nothing shown (the list hides)', () => {
    let s = freezeReducer(idleShowing('a'), snapshot([]));
    expect(s.phase).toBe(PHASE.FROZEN);
    s = tick(s);
    expect(s.shown).toEqual([]);
  });

  test('a stale tick (older epoch) is ignored', () => {
    const s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(freezeReducer(s, { type: 'tick', epoch: s.epoch - 1 })).toBe(s);
  });

  test('a tick while idle is ignored', () => {
    const s = idleShowing('a');
    expect(tick(s)).toBe(s);
  });
});

describe('createFreezeController — owns the single timer (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('applies the first snapshot synchronously and reports each change', () => {
    const phases = [];
    const c = createFreezeController((s) => phases.push(s.phase));
    c.push(rows('a'));
    expect(names(c.getState())).toEqual(['a']);
    expect(phases).toEqual([PHASE.WINDOW]);
  });

  test('a freeze lasts FREEZE_MS, then the newest snapshot shows', () => {
    const c = createFreezeController(() => {});
    c.push(rows('a'));
    vi.advanceTimersByTime(MIN_WINDOW_MS);
    expect(c.getState().phase).toBe(PHASE.IDLE);
    c.push(rows('a', 'b'));
    vi.advanceTimersByTime(FREEZE_MS - 1);
    expect(c.getState().phase).toBe(PHASE.FROZEN);
    expect(names(c.getState())).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(c.getState().phase).toBe(PHASE.WINDOW);
    expect(names(c.getState())).toEqual(['a', 'b']);
  });

  test('a burst of snapshots never locks the owner out: every unfreeze gives >= MIN_WINDOW_MS of interactivity', () => {
    const c = createFreezeController(() => {});
    c.push(rows('a'));
    const runs = [];
    let interactive = 0;
    for (let t = 0; t < 6000; t++) {
      if (t % 50 === 0) c.push(rows('a', 'n' + t)); // a fresh snapshot every 50 ms
      const frozenBefore = c.getState().phase === PHASE.FROZEN;
      vi.advanceTimersByTime(1);
      const frozenAfter = c.getState().phase === PHASE.FROZEN;
      if (frozenBefore) {
        interactive = 0;
      } else {
        interactive += 1;
        if (frozenAfter) {
          runs.push(interactive);
          interactive = 0;
        }
      }
    }
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs) {
      expect(run).toBeGreaterThanOrEqual(MIN_WINDOW_MS);
    }
    // once the burst stops, the newest snapshot is applied and the list settles
    vi.advanceTimersByTime(3000);
    expect(names(c.getState())).toEqual(['a', 'n5950']);
    expect(c.getState().phase).toBe(PHASE.IDLE);
  });

  test('dispose cancels the timer and ignores later pushes', () => {
    const onChange = vi.fn();
    const c = createFreezeController(onChange);
    c.push(rows('a'));
    expect(vi.getTimerCount()).toBe(1);
    c.dispose();
    expect(vi.getTimerCount()).toBe(0);
    c.push(rows('b'));
    vi.advanceTimersByTime(5000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/ui/__tests__/arenaRequestFreeze.test.js`
Expected: FAIL, `Failed to resolve import "../arenaRequestFreeze"`.

- [ ] **Step 3: Implement the state machine and controller**

Create `$RX/src/ui/arenaRequestFreeze.js`:

```js
// Owner join-request list: freeze + minimum-interactive-window rule (arena spec C2).
//
// The server pushes full snapshots of the owner's pending requests. Applying each one the
// moment it lands would shift rows under the owner's pointer, so:
//   - FREEZE: a snapshot that lands while rows are shown freezes the list (taps ignored,
//     spinner) for FREEZE_MS, then the newest held snapshot is applied;
//   - WINDOW: after rows change the list stays interactive for at least MIN_WINDOW_MS;
//     snapshots landing then are held (rows unchanged) and start the next freeze when the
//     window ends, so a burst of updates cannot lock the owner out;
//   - URGENT: the snapshot answering the owner's own accept/decline freezes at once, even
//     inside the window, so a just-declined row never sits there interactive;
//   - HIDDEN: with no rows shown there is nothing under the pointer, so a snapshot applies
//     at once and opens a window.
//
// freezeReducer is pure; createFreezeController owns the one timer; useFrozenRequests (a
// thin hook) wires the controller to React. `epoch` changes exactly when a new timer must
// start, so a late tick from a superseded timer is ignored.

export const FREEZE_MS = 400;
export const MIN_WINDOW_MS = 1000;

export const PHASE = { IDLE: 'idle', FROZEN: 'frozen', WINDOW: 'window' };

export const initialFreezeState = { phase: PHASE.IDLE, shown: [], held: null, epoch: 0 };

export function freezeReducer(state, event) {
  switch (event.type) {
    case 'snapshot': {
      const { requests, urgent } = event;
      if (state.phase === PHASE.FROZEN) {
        return { ...state, held: requests };
      }
      if (state.shown.length === 0) {
        return { phase: PHASE.WINDOW, shown: requests, held: null, epoch: state.epoch + 1 };
      }
      if (state.phase === PHASE.WINDOW && !urgent) {
        return { ...state, held: requests };
      }
      return { phase: PHASE.FROZEN, shown: state.shown, held: requests, epoch: state.epoch + 1 };
    }
    case 'tick': {
      if (event.epoch !== state.epoch) {
        return state;
      }
      if (state.phase === PHASE.FROZEN) {
        return { phase: PHASE.WINDOW, shown: state.held, held: null, epoch: state.epoch + 1 };
      }
      if (state.phase === PHASE.WINDOW) {
        if (state.held === null) {
          return { ...state, phase: PHASE.IDLE };
        }
        return { ...state, phase: PHASE.FROZEN, epoch: state.epoch + 1 };
      }
      return state;
    }
    default:
      return state;
  }
}

// How long the current phase lasts, or null when nothing is pending.
export function timerFor(state) {
  if (state.phase === PHASE.FROZEN) return FREEZE_MS;
  if (state.phase === PHASE.WINDOW) return MIN_WINDOW_MS;
  return null;
}

// Arrow wrappers, not bare setTimeout/clearTimeout: browsers throw "Illegal invocation"
// when those are called as methods of another object, and the wrappers also resolve the
// global at call time so vitest fake timers apply.
const DEFAULT_TIMERS = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle),
};

export function createFreezeController(onChange, timers = DEFAULT_TIMERS) {
  let state = initialFreezeState;
  let handle = null;
  let disposed = false;

  const transition = (event) => {
    if (disposed) return;
    const next = freezeReducer(state, event);
    if (next === state) return;
    const restart = next.epoch !== state.epoch;
    state = next;
    if (restart) {
      if (handle !== null) timers.clear(handle);
      handle = null;
      const ms = timerFor(state);
      if (ms !== null) {
        const epoch = state.epoch;
        handle = timers.set(() => {
          handle = null;
          transition({ type: 'tick', epoch });
        }, ms);
      }
    }
    onChange(state);
  };

  return {
    push: (requests, urgent = false) => transition({ type: 'snapshot', requests, urgent }),
    getState: () => state,
    dispose: () => {
      disposed = true;
      if (handle !== null) timers.clear(handle);
      handle = null;
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/ui/__tests__/arenaRequestFreeze.test.js`
Expected: PASS (16 tests).

- [ ] **Step 5: Write the failing hook test**

Create `$RX/src/ui/__tests__/useFrozenRequests.test.js`:

```js
// @vitest-environment jsdom
//
// Wiring test for the thin hook: the timing rules themselves are pinned in
// arenaRequestFreeze.test.js. This checks the hook pushes a record once per new record
// object, exposes {rows, frozen}, never renders a new record unlocked, and cancels its
// timer on unmount.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import {useFrozenRequests} from '../useFrozenRequests';
import {FREEZE_MS, MIN_WINDOW_MS} from '../arenaRequestFreeze';

let seen;
let renders; // every render's result, in order (act() would hide intermediate renders)
function Probe({record}) {
  seen = useFrozenRequests(record);
  renders.push({players: seen.rows.map((r) => r.player), frozen: seen.frozen});
  return null;
}

const rec = (...players) => ({
  table: 3,
  requests: players.map((player, i) => ({player, seq: i + 1})),
  answersAction: false,
});
const names = () => seen.rows.map((r) => r.player);

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  renders = [];
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const render = (record) => act(() => {
  root.render(<Probe record={record}/>);
});
const advance = (ms) => act(() => {
  vi.advanceTimersByTime(ms);
});

describe('useFrozenRequests', () => {
  test('no record (not my table) shows no rows', () => {
    render(undefined);
    expect(names()).toEqual([]);
    expect(seen.frozen).toBe(false);
  });

  test('the first record is shown at once and is interactive', () => {
    render(rec('a'));
    expect(names()).toEqual(['a']);
    expect(seen.frozen).toBe(false);
  });

  test('a new record while rows are shown freezes for FREEZE_MS, then applies', () => {
    render(rec('a'));
    advance(MIN_WINDOW_MS);
    render(rec('a', 'b'));
    expect(seen.frozen).toBe(true);
    expect(names()).toEqual(['a']);
    advance(FREEZE_MS);
    expect(seen.frozen).toBe(false);
    expect(names()).toEqual(['a', 'b']);
  });

  test('re-rendering with the same record object does not freeze again', () => {
    const r = rec('a');
    render(r);
    advance(MIN_WINDOW_MS);
    render(r);
    expect(seen.frozen).toBe(false);
  });

  test('an answersAction record freezes at once inside the window', () => {
    render(rec('a', 'b'));
    render({...rec('b'), answersAction: true});
    expect(seen.frozen).toBe(true);
  });

  test('the very render that first sees a new record already reports it frozen', () => {
    // The reducer clears the owner's in-flight marker in the same step that stores the
    // answering snapshot, so the component's other lock is gone on that render. If the
    // hook reported unfrozen until its effect ran, the old rows would show enabled
    // Accept/Decline for a frame.
    render(rec('a', 'b'));
    advance(MIN_WINDOW_MS);
    renders = [];
    render({...rec('b'), answersAction: true});
    expect(renders.length).toBeGreaterThan(0);
    expect(renders.every((r) => r.frozen)).toBe(true);
    expect(renders[0].players).toEqual(['a', 'b']);
  });

  test('unmount cancels the pending freeze timer', () => {
    render(rec('a'));
    advance(MIN_WINDOW_MS);
    render(rec('a', 'b'));
    const before = vi.getTimerCount();
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(before - 1);
    root = createRoot(container); // afterEach unmounts this fresh root
  });
});
```

- [ ] **Step 6: Run the hook test to verify it fails**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/ui/__tests__/useFrozenRequests.test.js`
Expected: FAIL, `Failed to resolve import "../useFrozenRequests"`.

- [ ] **Step 7: Implement the hook**

Create `$RX/src/ui/useFrozenRequests.js`:

```js
// Thin React wrapper over the arena request freeze controller (spec C2). Takes the owner's
// snapshot record from Redux ({table, requests, answersAction} or undefined) and returns
// the rows to render plus whether the list is frozen. Pushes once per new record object,
// so unrelated re-renders never freeze the list.
//
// No unlocked frame between a new record and its freeze:
//   - a render whose record has not been pushed yet reports `frozen` (the reducer clears
//     the owner's in-flight marker in the same step that stores the answering snapshot,
//     so the component's other lock is already gone on that render);
//   - layout effects, not passive ones: a websocket-driven render runs at default priority,
//     so a passive effect may run only after the browser paints. State set in a layout
//     effect re-renders synchronously before paint. Both effects must be layout effects so
//     the controller exists before the first push.

import { useLayoutEffect, useRef, useState } from 'react';
import { createFreezeController, initialFreezeState, PHASE } from './arenaRequestFreeze';

const NO_REQUESTS = [];

export function useFrozenRequests(record) {
  const [state, setState] = useState(initialFreezeState);
  const [pushed, setPushed] = useState(undefined);
  const controllerRef = useRef(null);

  useLayoutEffect(() => {
    const controller = createFreezeController(setState);
    controllerRef.current = controller;
    return () => controller.dispose();
  }, []);

  useLayoutEffect(() => {
    controllerRef.current.push(
      record ? record.requests : NO_REQUESTS,
      !!(record && record.answersAction)
    );
    setPushed(record);
  }, [record]);

  const stale = record !== pushed;
  return { rows: state.shown, frozen: stale || state.phase === PHASE.FROZEN };
}
```

- [ ] **Step 8: Run both ui tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/ui`
Expected: PASS (arenaRequestFreeze 16, useFrozenRequests 7, plus the existing modals and renjuOpeningUi files).

- [ ] **Step 9: Commit**

```bash
git -C $RX add src/ui/arenaRequestFreeze.js src/ui/useFrozenRequests.js src/ui/__tests__/arenaRequestFreeze.test.js src/ui/__tests__/useFrozenRequests.test.js
git -C $RX commit -S -m "feat(arena): freeze and minimum-window state machine for the owner request list"
```

---

### Task 3: Owner-side reducer state (snapshots, in-flight accept/decline)

**Files:**
- Modify: `$RX/src/redux_reducers/utils.js:108-126` (`exitTable`), `:550-571` (remove `arenaJoinRequest`, `arenaRemoveJoinRequest`; add new helpers)
- Modify: `$RX/src/redux_reducers/rootReducer.js:2-18` (action imports), `:23-61` (utils imports), `:129` (handler), `:147-149` (remove case)
- Modify: `$RX/src/redux_actions/actionTypes.js:16-17`
- Modify: `$RX/src/Classes/TableClass.js:102-113`
- Modify: `$RX/src/selectors/index.js` (append)
- Test: `$RX/src/redux_reducers/__tests__/arenaRequests.test.js` (create)
- Test: `$RX/src/selectors/__tests__/selectors.test.js` (append)

**Interfaces:**
- Consumes: inbound action `{type: 'dsgArenaJoinRequestsEvent', payload: {table, requests?}}` (Task 1).
- Produces:
  - `ARENA_OWNER_ACTION_SENT = 'ARENA_OWNER_ACTION_SENT'` (payload `{table: number, player: string}`), exported from `redux_actions/actionTypes.js`.
  - `state.arenaJoinRequests: {table: number, requests: {player, seq}[], answersAction: boolean} | undefined` (requests sorted by `seq`, unique by player).
  - `state.arenaOwnerPending: {table: number, player: string} | undefined`.
  - `selectArenaJoinRequests(state)` → the record when `record.table === state.table`, else `undefined`.
  - `selectArenaOwnerPending(state)` → the pending marker when it is for `state.table`, else `undefined`.
  - utils exports `arenaJoinRequests(data, state)`, `arenaOwnerActionSent(data, state)`.
  - Removed: `arenaJoinRequest`, `arenaRemoveJoinRequest`, `Table.addArenaPlayerRequest`, `Table.removeArenaPlayerRequest`. The `REMOVE_ARENA_JOIN_REQUEST` constant stays exported until Task 5 removes its last importer.

- [ ] **Step 1: Write the failing reducer tests**

Create `$RX/src/redux_reducers/__tests__/arenaRequests.test.js`:

```js
// Arena join requests are server-driven (spec 2026-10-10). These pin the pure reducer side:
// the owner's snapshot record and in-flight accept/decline marker, and (Task 4) the
// requester's request set, in-flight taps and end notices.
import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';
import Table from '../../Classes/TableClass';
import { ARENA_OWNER_ACTION_SENT } from '../../redux_actions/actionTypes';
import { selectArenaJoinRequests, selectArenaOwnerPending } from '../../selectors';

const init = () => liveGameApp(undefined, { type: '@@INIT' });
const dispatch = (state, type, payload) => liveGameApp(state, { type, payload });

// `me` seated alone at table `num`, as an arena owner is.
const atTable = (num, me = 'owner') => {
  const table = new Table({ table: num });
  table.me = me;
  table.players = [me];
  return { ...init(), me, table: num, tables: { [num]: table } };
};
const snap = (table, ...pairs) => ({ table, requests: pairs.map(([player, seq]) => ({ player, seq })) });
const players = (s) => selectArenaJoinRequests(s).requests.map((r) => r.player);

describe('owner snapshot — dsgArenaJoinRequestsEvent', () => {
  test('stores the snapshot for my table, ordered by seq and unique by player', () => {
    const s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['carol', 9], ['bob', 4], ['carol', 12]));
    expect(players(s)).toEqual(['bob', 'carol']);
    expect(selectArenaJoinRequests(s).table).toBe(3);
  });

  test('a snapshot without requests (field omitted by the server) is an empty list', () => {
    const s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', { table: 3 });
    expect(selectArenaJoinRequests(s).requests).toEqual([]);
  });

  test('each snapshot replaces the previous one', () => {
    let s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1], ['carol', 2]));
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(3, ['carol', 2]));
    expect(players(s)).toEqual(['carol']);
  });

  test('a snapshot for another table is not selected for my table', () => {
    const s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(9, ['bob', 1]));
    expect(selectArenaJoinRequests(s)).toBeUndefined();
  });

  test('a new player in the snapshot fires the sound and tab cue', () => {
    const s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1]));
    expect(s.pendingNotifications).toContainEqual({ sound: 'newPlayer', tab: 'bob wants to join your table' });
  });

  test('only players absent from the previous snapshot are cued, once per snapshot', () => {
    let s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1]));
    const before = s.pendingNotifications.length;
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1], ['carol', 2], ['dave', 3]));
    expect(s.pendingNotifications.length).toBe(before + 1);
    expect(s.pendingNotifications.at(-1)).toEqual({ sound: 'newPlayer', tab: 'carol, dave want to join your table' });
  });

  test('a snapshot that only removes players fires no cue', () => {
    let s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1], ['carol', 2]));
    const before = s.pendingNotifications.length;
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(3, ['carol', 2]));
    expect(s.pendingNotifications.length).toBe(before);
  });

  test('no cue for a snapshot of a table I am not seated at', () => {
    const s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(9, ['bob', 1]));
    expect(s.pendingNotifications).toEqual([]);
  });
});

describe('owner accept/decline in flight', () => {
  test('ARENA_OWNER_ACTION_SENT marks the row in flight for my table', () => {
    const s = dispatch(atTable(3), ARENA_OWNER_ACTION_SENT, { table: 3, player: 'bob' });
    expect(selectArenaOwnerPending(s)).toEqual({ table: 3, player: 'bob' });
  });

  test('the next snapshot for that table clears the marker and is flagged as the answer', () => {
    let s = dispatch(atTable(3), ARENA_OWNER_ACTION_SENT, { table: 3, player: 'bob' });
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(3, ['carol', 2]));
    expect(selectArenaOwnerPending(s)).toBeUndefined();
    expect(selectArenaJoinRequests(s).answersAction).toBe(true);
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(3, ['carol', 2], ['dave', 5]));
    expect(selectArenaJoinRequests(s).answersAction).toBe(false);
  });

  test('a snapshot for another table leaves the marker alone', () => {
    let s = dispatch(atTable(3), ARENA_OWNER_ACTION_SENT, { table: 3, player: 'bob' });
    s = dispatch(s, 'dsgArenaJoinRequestsEvent', snap(9, ['zed', 1]));
    expect(selectArenaOwnerPending(s)).toEqual({ table: 3, player: 'bob' });
  });
});

describe('owner state lifetime', () => {
  test('leaving my table clears the snapshot and the in-flight marker (table numbers are reused)', () => {
    let s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1]));
    s = dispatch(s, ARENA_OWNER_ACTION_SENT, { table: 3, player: 'bob' });
    s = dispatch(s, 'dsgExitTableEvent', { player: 'owner', table: 3 });
    expect(s.arenaJoinRequests).toBeUndefined();
    expect(s.arenaOwnerPending).toBeUndefined();
  });

  test('another player leaving my table keeps my snapshot', () => {
    const base = atTable(3);
    base.tables[3].players = ['owner', 'zed'];
    let s = dispatch(base, 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1]));
    s = dispatch(s, 'dsgExitTableEvent', { player: 'zed', table: 3 });
    expect(players(s)).toEqual(['bob']);
  });

  test('socket close resets the owner state', () => {
    let s = dispatch(atTable(3), 'dsgArenaJoinRequestsEvent', snap(3, ['bob', 1]));
    s = dispatch(s, 'REDUX_WEBSOCKET::CLOSED');
    expect(s.arenaJoinRequests).toBeUndefined();
  });

  test('the retired incremental request event no longer touches state', () => {
    const s = dispatch(atTable(3), 'dsgArenaRequestJoinTableEvent', { player: 'bob', table: 3 });
    expect(s.arenaJoinRequests).toBeUndefined();
    expect(s.pendingNotifications).toEqual([]);
    expect(new Table().addArenaPlayerRequest).toBeUndefined();
  });
});
```

Append to `$RX/src/selectors/__tests__/selectors.test.js` (and add `selectArenaJoinRequests, selectArenaOwnerPending` to the import on line 2 so it reads `import { selectCurrentTable, isGuestName, tableVisibleToGuest, selectArenaJoinRequests, selectArenaOwnerPending } from '../index';`):

```js
describe('arena owner selectors — only the current table counts', () => {
  const record = { table: 3, requests: [{ player: 'bob', seq: 1 }], answersAction: false };

  test('selectArenaJoinRequests returns the record for my table', () => {
    expect(selectArenaJoinRequests({ table: 3, arenaJoinRequests: record })).toBe(record);
  });

  test('selectArenaJoinRequests is undefined for another table or none', () => {
    expect(selectArenaJoinRequests({ table: 4, arenaJoinRequests: record })).toBeUndefined();
    expect(selectArenaJoinRequests({ table: 3 })).toBeUndefined();
  });

  test('selectArenaOwnerPending returns the marker only for my table', () => {
    const pending = { table: 3, player: 'bob' };
    expect(selectArenaOwnerPending({ table: 3, arenaOwnerPending: pending })).toBe(pending);
    expect(selectArenaOwnerPending({ table: 4, arenaOwnerPending: pending })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/redux_reducers/__tests__/arenaRequests.test.js src/selectors`
Expected: FAIL, `selectArenaJoinRequests is not a function` (selectors) and the import of `ARENA_OWNER_ACTION_SENT` is `undefined`, so reducer tests fail on `selectArenaJoinRequests`.

- [ ] **Step 3: Add the action type**

In `$RX/src/redux_actions/actionTypes.js` replace line 16:

```js
export const REMOVE_ARENA_JOIN_REQUEST = 'REMOVE_ARENA_JOIN_REQUEST';
```

with:

```js
export const REMOVE_ARENA_JOIN_REQUEST = 'REMOVE_ARENA_JOIN_REQUEST'; // removed in Task 5 with its last importer
// Arena (spec 2026-10-10): the owner tapped Accept/Decline; payload {table, player}.
export const ARENA_OWNER_ACTION_SENT = 'ARENA_OWNER_ACTION_SENT';
```

- [ ] **Step 4: Add the selectors**

Append to `$RX/src/selectors/index.js`:

```js

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
```

- [ ] **Step 5: Replace the old owner helpers in utils.js**

In `$RX/src/redux_reducers/utils.js` replace lines 550-571 (`arenaJoinRequest` through `arenaRemoveJoinRequest`, keep `arenaRejectRequest` for Task 4):

```js
export function arenaJoinRequest(data, state) {
   if (data.table === state.table) {
      const tables = {...state.tables};
      const table = tables[state.table].newInstance();
      table.addArenaPlayerRequest(data.player);
      tables[data.table] = table;
      state.tables = tables;
      // Arena join request for my table; play the sound and nudge the tab.
      emit(state, {sound: 'newPlayer', tab: data.player + ' wants to join your table'});
   }
}


export function arenaRemoveJoinRequest(data, state) {
   if (data.table === state.table) {
      const tables = {...state.tables};
      const table = tables[state.table].newInstance();
      table.removeArenaPlayerRequest(data.player);
      tables[data.table] = table;
      state.tables = tables;
   }
}
```

with:

```js
// ---- arena join requests (server-driven, spec 2026-10-10) ----

// Order the owner's pending list by the server's seq and keep one row per player, so rows can
// be keyed by player name. A missing list (Gson omits null fields) is an empty list.
function normalizeJoinRequests(requests) {
   const list = Array.isArray(requests) ? [...requests] : [];
   list.sort((a, b) => a.seq - b.seq);
   const seen = new Set();
   return list.filter(r => {
      if (!r || typeof r.player !== 'string' || seen.has(r.player)) {
         return false;
      }
      seen.add(r.player);
      return true;
   });
}

// dsgArenaJoinRequestsEvent: the full pending list for a table I own. Stored as received
// (selectArenaJoinRequests filters by my current table). The first snapshot for that table
// after my accept/decline answers it: it clears the in-flight marker and is flagged so the
// owner list freezes on it at once. Players absent from the previous snapshot get the cue.
export function arenaJoinRequests(data, state) {
   const requests = normalizeJoinRequests(data.requests);
   const previous = state.arenaJoinRequests && state.arenaJoinRequests.table === data.table
      ? state.arenaJoinRequests.requests : [];
   const pending = state.arenaOwnerPending;
   const answersAction = !!pending && pending.table === data.table;
   state.arenaJoinRequests = {table: data.table, requests, answersAction};
   if (answersAction) {
      delete state.arenaOwnerPending;
   }
   const before = new Set(previous.map(r => r.player));
   const added = requests.filter(r => !before.has(r.player)).map(r => r.player);
   if (added.length > 0 && data.table === state.table) {
      const verb = added.length === 1 ? ' wants' : ' want';
      emit(state, {sound: 'newPlayer', tab: added.join(', ') + verb + ' to join your table'});
   }
}

// ARENA_OWNER_ACTION_SENT: I tapped Accept/Decline on `player`; the list ignores taps until
// the server's next snapshot for that table (guaranteed by spec R11). No optimistic removal.
export function arenaOwnerActionSent(data, state) {
   state.arenaOwnerPending = {table: data.table, player: data.player};
}
```

- [ ] **Step 6: Clear owner state when I leave my table**

In `$RX/src/redux_reducers/utils.js` (`exitTable`, lines 120-124) replace:

```js
   if (exitEvent.player === state.me) {
      state.table = undefined;
      state.game = undefined;
      state.table_messages = [];
   }
```

with:

```js
   if (exitEvent.player === state.me) {
      state.table = undefined;
      state.game = undefined;
      state.table_messages = [];
      // table numbers are reused: never carry an arena request list to my next table
      delete state.arenaJoinRequests;
      delete state.arenaOwnerPending;
   }
```

Also update the comment in `processUser` (`utils.js:30-32`) so it names the live helper. Replace:

```js
      // In an arena room, don't play the new-player sound when other players
      // join the room. The sound is played instead when you receive a join
      // request (arenaJoinRequest) and when a player joins your table (joinTable).
```

with:

```js
      // In an arena room, don't play the new-player sound when other players
      // join the room. The sound is played instead when a join-request snapshot
      // names a new requester (arenaJoinRequests) and when a player joins your
      // table (joinTable).
```

- [ ] **Step 7: Rewire rootReducer**

In `$RX/src/redux_reducers/rootReducer.js`:

Replace lines 2-4:

```js
import {
   ARM_DRAW_OFFER,
   CONNECT_SERVER,
```

with:

```js
import {
   ARENA_OWNER_ACTION_SENT,
   ARM_DRAW_OFFER,
   CONNECT_SERVER,
```

Delete the import line `   REMOVE_ARENA_JOIN_REQUEST,` (originally line 14).

Replace lines 27-29:

```js
   arenaJoinRequest,
   arenaRemoveJoinRequest,
   arenaRejectRequest,
```

with:

```js
   arenaJoinRequests,
   arenaOwnerActionSent,
   arenaRejectRequest,
```

Replace the handler on line 129:

```js
   dsgArenaRequestJoinTableEvent: (p, s) => arenaJoinRequest(p, s),
```

with:

```js
   dsgArenaJoinRequestsEvent: (p, s) => arenaJoinRequests(p, s),
```

Replace lines 147-149:

```js
      case REMOVE_ARENA_JOIN_REQUEST:
         arenaRemoveJoinRequest(action.payload, newState);
         break;
```

with:

```js
      case ARENA_OWNER_ACTION_SENT:
         arenaOwnerActionSent(action.payload, newState);
         break;
```

- [ ] **Step 8: Remove the Table request-list methods**

In `$RX/src/Classes/TableClass.js` delete lines 102-114 (the blank line after `removeArenaPlayerRequest` included):

```js
   addArenaPlayerRequest = (player) => {
      if (!this.arenaPlayerRequests) {
         this.arenaPlayerRequests = [];
      }
      this.arenaPlayerRequests.push(player);
   }

   removeArenaPlayerRequest = (player) => {
      if (this.arenaPlayerRequests) {
         this.arenaPlayerRequests = this.arenaPlayerRequests.filter(p => p !== player);
      }
   }

```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/redux_reducers/__tests__/arenaRequests.test.js src/selectors`
Expected: PASS (arenaRequests 15 tests; selectors 14 tests).

- [ ] **Step 10: Run the full suite and check for stale references**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: all test files pass, 0 failed.
Run: `grep -rnE "arenaJoinRequest([^s]|$)|arenaRemoveJoinRequest|addArenaPlayerRequest|removeArenaPlayerRequest" $RX/src --include='*.js' | grep -v graphify-out | grep -v __tests__`
Expected: no output. (`JoinRequestComponent.js` still imports `REMOVE_ARENA_JOIN_REQUEST` and `Table.js` still reads `table.arenaPlayerRequests`; both are rewritten in Task 5.)

- [ ] **Step 11: Commit**

```bash
git -C $RX add src/redux_reducers/utils.js src/redux_reducers/rootReducer.js src/redux_actions/actionTypes.js src/Classes/TableClass.js src/selectors/index.js src/selectors/__tests__/selectors.test.js src/redux_reducers/__tests__/arenaRequests.test.js
git -C $RX commit -S -m "feat(arena): owner join-request snapshot state and in-flight accept/decline"
```

---

### Task 4: Requester-side reducer state and end notices

**Files:**
- Modify: `$RX/src/redux_reducers/utils.js` (replace `arenaRejectRequest`, formerly lines 573-577; after Task 3 it directly follows `arenaOwnerActionSent`)
- Modify: `$RX/src/redux_reducers/rootReducer.js` (imports, `initialState` lines 66-82, handler formerly line 130, new switch case)
- Modify: `$RX/src/redux_actions/actionTypes.js` (after `ARENA_OWNER_ACTION_SENT`)
- Test: `$RX/src/redux_reducers/__tests__/arenaRequests.test.js` (append)

**Interfaces:**
- Consumes: inbound actions `dsgArenaMyRequestsEvent {tables?}` and `dsgArenaRequestEndedEvent {table, player?, owner?, reason?}` (Task 1).
- Produces:
  - `ARENA_REQUEST_SENT = 'ARENA_REQUEST_SENT'` (payload: `{table: number, op: 'request' | 'withdraw'}`), exported from `redux_actions/actionTypes.js`.
  - `state.arenaMyRequests: number[]` (initial `[]`), `state.arenaRequestsInFlight: {table: number, op: 'request' | 'withdraw'}[]` (initial `[]`, at most one entry per table). An entry ends when its own answer is visible: a `request` when a snapshot lists its table, a `withdraw` when a snapshot no longer lists it, either one when a `dsgArenaRequestEndedEvent` for its table arrives.
  - utils exports `arenaMyRequests(data, state)`, `arenaRequestSent({table, op}, state)`, `arenaEndedMessage(data) → string | undefined`, `arenaRequestEnded(data, state)`.
  - `dsgArenaRequestEndedEvent` sets `state.notification = {kind: 'info', message}` (rendered by the existing `MessageSnack` on both the Arena and Table pages).
  - Removed: `arenaRejectRequest` and its handler.

- [ ] **Step 1: Write the failing tests**

Append to `$RX/src/redux_reducers/__tests__/arenaRequests.test.js` (add `ARENA_REQUEST_SENT` to the existing actionTypes import so it reads `import { ARENA_OWNER_ACTION_SENT, ARENA_REQUEST_SENT } from '../../redux_actions/actionTypes';`):

```js
describe('requester — dsgArenaMyRequestsEvent and in-flight taps', () => {
  test('initial state has no requests and nothing in flight', () => {
    const s = init();
    expect(s.arenaMyRequests).toEqual([]);
    expect(s.arenaRequestsInFlight).toEqual([]);
  });

  const req = (table) => ({ table, op: 'request' });
  const wd = (table) => ({ table, op: 'withdraw' });
  const inFlightTables = (s) => s.arenaRequestsInFlight.map((e) => e.table);

  test('ARENA_REQUEST_SENT marks a table in flight once', () => {
    let s = dispatch(init(), ARENA_REQUEST_SENT, req(4));
    s = dispatch(s, ARENA_REQUEST_SENT, req(4));
    s = dispatch(s, ARENA_REQUEST_SENT, wd(7));
    expect(s.arenaRequestsInFlight).toEqual([req(4), wd(7)]);
  });

  test('the snapshot replaces my request set and ends the requests it now lists', () => {
    let s = dispatch(init(), ARENA_REQUEST_SENT, req(4));
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [4, 2] });
    expect(s.arenaMyRequests).toEqual([4, 2]);
    expect(s.arenaRequestsInFlight).toEqual([]);
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [2] });
    expect(s.arenaMyRequests).toEqual([2]);
  });

  test('the answer to one table does not unlock another table still in flight (no DUPLICATE across tables)', () => {
    let s = dispatch(init(), ARENA_REQUEST_SENT, req(3));
    s = dispatch(s, ARENA_REQUEST_SENT, req(5));
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [3] }); // answers table 3 only
    expect(inFlightTables(s)).toEqual([5]);
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [3, 5] });
    expect(s.arenaRequestsInFlight).toEqual([]);
  });

  test('a withdraw ends when a snapshot no longer lists its table', () => {
    let s = dispatch(init(), 'dsgArenaMyRequestsEvent', { tables: [4, 6] });
    s = dispatch(s, ARENA_REQUEST_SENT, wd(4));
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [4, 6] }); // an older change, still lists 4
    expect(inFlightTables(s)).toEqual([4]);
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [6] });
    expect(s.arenaRequestsInFlight).toEqual([]);
  });

  test('a refused request ends on its end notice (the table never enters the set)', () => {
    let s = dispatch(init(), ARENA_REQUEST_SENT, req(4));
    s = dispatch(s, ARENA_REQUEST_SENT, req(7));
    s = dispatch(s, 'dsgArenaRequestEndedEvent', { table: 4, reason: 'BLOCKED' });
    expect(inFlightTables(s)).toEqual([7]);
  });

  test('a snapshot without tables (field omitted by the server) is an empty set', () => {
    let s = dispatch(init(), 'dsgArenaMyRequestsEvent', { tables: [4] });
    s = dispatch(s, 'dsgArenaMyRequestsEvent', {});
    expect(s.arenaMyRequests).toEqual([]);
  });

  test('socket close resets the requester state', () => {
    let s = dispatch(init(), 'dsgArenaMyRequestsEvent', { tables: [4] });
    s = dispatch(s, ARENA_REQUEST_SENT, req(5));
    s = dispatch(s, 'REDUX_WEBSOCKET::CLOSED');
    expect(s.arenaMyRequests).toEqual([]);
    expect(s.arenaRequestsInFlight).toEqual([]);
  });
});

describe('dsgArenaRequestEndedEvent — one short notice per reason (C4)', () => {
  const ended = (reason, extra = {}) =>
    dispatch(init(), 'dsgArenaRequestEndedEvent', { table: 6, player: 'carol', owner: 'olga', reason, ...extra });

  test.each([
    ['DECLINED', 'olga declined your request'],
    ['TABLE_FULL', 'Table 6 is no longer available'],
    ['TABLE_CLOSED', 'Table 6 was closed'],
    ['DUPLICATE', 'You already sent a request to olga'],
    ['BOOTED', 'olga removed you from table 6, try again in a few minutes'],
    ['BLOCKED', "You can't request table 6 again until its next game"],
    ['NOT_AVAILABLE', "You can't join table 6 right now"],
    ['GUEST_RATED', "Guests can't join rated tables"],
    ['NO_LONGER_AVAILABLE', 'carol is no longer available'],
  ])('%s -> "%s"', (reason, message) => {
    expect(ended(reason).notification).toEqual({ kind: 'info', message });
  });

  test('DECLINED without an owner name (null omitted by the server) still reads well', () => {
    const s = dispatch(init(), 'dsgArenaRequestEndedEvent', { table: 6, player: 'carol', reason: 'DECLINED' });
    expect(s.notification).toEqual({ kind: 'info', message: 'The table owner declined your request' });
  });

  test('DUPLICATE and BOOTED without an owner name still read well', () => {
    const noOwner = (reason) =>
      dispatch(init(), 'dsgArenaRequestEndedEvent', { table: 6, player: 'carol', reason }).notification;
    expect(noOwner('DUPLICATE')).toEqual({ kind: 'info', message: 'You already sent a request to the table owner' });
    expect(noOwner('BOOTED')).toEqual({ kind: 'info', message: 'The table owner removed you from table 6, try again in a few minutes' });
  });

  test('the owner named in a notice comes from the event, not from my table model', () => {
    // table 6 in my model is seated by zed; the event names olga, who owned it when the server refused
    const s = dispatch(atTable(6, 'zed'), 'dsgArenaRequestEndedEvent',
      { table: 6, player: 'carol', owner: 'olga', reason: 'DUPLICATE' });
    expect(s.notification).toEqual({ kind: 'info', message: 'You already sent a request to olga' });
  });

  test('an unknown or missing reason shows nothing', () => {
    expect(ended('SOMETHING_NEW').notification).toBeUndefined();
    expect(dispatch(init(), 'dsgArenaRequestEndedEvent', { table: 6 }).notification).toBeUndefined();
  });

  test('an end notice does not change my request set (the server sends a snapshot for that)', () => {
    let s = dispatch(init(), 'dsgArenaMyRequestsEvent', { tables: [6] });
    s = dispatch(s, 'dsgArenaRequestEndedEvent', { table: 6, owner: 'olga', reason: 'DECLINED' });
    expect(s.arenaMyRequests).toEqual([6]);
  });

  test('the retired free-text reject event no longer shows a notice', () => {
    const s = dispatch({ ...init(), me: 'carol' }, 'dsgArenaRejectTableJoinEvent',
      { playerToReject: 'carol', message: 'old', player: 'olga', table: 6 });
    expect(s.notification).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/redux_reducers/__tests__/arenaRequests.test.js`
Expected: FAIL. `initial state` sees `undefined` instead of `[]`, notices are `undefined`, and the retired reject test sees `{kind: 'info', message: 'old'}`.

- [ ] **Step 3: Add the action type**

In `$RX/src/redux_actions/actionTypes.js`, directly after the `ARENA_OWNER_ACTION_SENT` line added in Task 3, add:

```js
// Arena (spec 2026-10-10): I sent a join request or withdraw for a table;
// payload {table, op: 'request' | 'withdraw'}. The lobby card ignores taps until the server
// answers that table.
export const ARENA_REQUEST_SENT = 'ARENA_REQUEST_SENT';
```

- [ ] **Step 4: Replace arenaRejectRequest with the requester helpers**

In `$RX/src/redux_reducers/utils.js` replace:

```js
export function arenaRejectRequest(data, state) {
   if (data.playerToReject === state.me) {
      state.notification = {kind: 'info', message: data.message};
   }
}
```

with:

```js
// dsgArenaMyRequestsEvent: the full set of tables I have pending requests at. It also ends
// the in-flight taps it answers (spec C3): a request once its table is listed, a withdraw
// once its table is gone. Clearing every in-flight table on any snapshot would let the
// answer for table 3 unlock table 5 before table 5's own answer, and a second tap on 5
// would then come back DUPLICATE.
export function arenaMyRequests(data, state) {
   const tables = Array.isArray(data.tables) ? [...data.tables] : [];
   state.arenaMyRequests = tables;
   const answered = e => (e.op === 'withdraw') !== tables.includes(e.table);
   state.arenaRequestsInFlight = (state.arenaRequestsInFlight || []).filter(e => !answered(e));
}

// ARENA_REQUEST_SENT ({table, op}): a request or withdraw for `table` awaits the server's
// answer. One entry per table; the card ignores taps while it is there.
export function arenaRequestSent(data, state) {
   const inFlight = state.arenaRequestsInFlight || [];
   if (!inFlight.some(e => e.table === data.table)) {
      state.arenaRequestsInFlight = [...inFlight, {table: data.table, op: data.op}];
   }
}

// Spec C4 notice texts, keyed by dsgArenaRequestEndedEvent.reason. Owner names come from the
// event's own `owner` field, never from state.tables: the server names the owner it refused for.
const ARENA_ENDED_MESSAGES = {
   DECLINED: (d) => (d.owner || 'The table owner') + ' declined your request',
   TABLE_FULL: (d) => 'Table ' + d.table + ' is no longer available',
   TABLE_CLOSED: (d) => 'Table ' + d.table + ' was closed',
   DUPLICATE: (d) => 'You already sent a request to ' + (d.owner || 'the table owner'),
   BOOTED: (d) => (d.owner || 'The table owner') + ' removed you from table ' + d.table
      + ', try again in a few minutes',
   BLOCKED: (d) => 'You can\'t request table ' + d.table + ' again until its next game',
   NOT_AVAILABLE: (d) => 'You can\'t join table ' + d.table + ' right now',
   GUEST_RATED: () => 'Guests can\'t join rated tables',
   NO_LONGER_AVAILABLE: (d) => d.player + ' is no longer available',
};

export function arenaEndedMessage(data) {
   const build = ARENA_ENDED_MESSAGES[data.reason];
   return build ? build(data) : undefined;
}

// dsgArenaRequestEndedEvent: the server addresses it to whoever needs the notice (requester,
// or the owner for NO_LONGER_AVAILABLE), so show it as is. Unknown reasons are ignored. It
// also ends any in-flight tap on that table: a refused request (BLOCKED, DUPLICATE, ...)
// never enters my request set, so the snapshot alone would never unlock its card.
export function arenaRequestEnded(data, state) {
   const message = arenaEndedMessage(data);
   if (message) {
      state.notification = {kind: 'info', message};
   }
   const inFlight = state.arenaRequestsInFlight || [];
   if (inFlight.some(e => e.table === data.table)) {
      state.arenaRequestsInFlight = inFlight.filter(e => e.table !== data.table);
   }
}
```

- [ ] **Step 5: Rewire rootReducer**

In `$RX/src/redux_reducers/rootReducer.js`:

Replace:

```js
import {
   ARENA_OWNER_ACTION_SENT,
   ARM_DRAW_OFFER,
```

with:

```js
import {
   ARENA_OWNER_ACTION_SENT,
   ARENA_REQUEST_SENT,
   ARM_DRAW_OFFER,
```

Replace:

```js
   arenaJoinRequests,
   arenaOwnerActionSent,
   arenaRejectRequest,
```

with:

```js
   arenaJoinRequests,
   arenaMyRequests,
   arenaOwnerActionSent,
   arenaRequestEnded,
   arenaRequestSent,
```

In `initialState` replace:

```js
   renjuOpeningUi: RENJU_UI_INITIAL,
   pendingNotifications: [],
};
```

with:

```js
   renjuOpeningUi: RENJU_UI_INITIAL,
   pendingNotifications: [],
   arenaMyRequests: [],
   arenaRequestsInFlight: [],
};
```

Replace the handler line:

```js
   dsgArenaRejectTableJoinEvent: (p, s) => arenaRejectRequest(p, s),
```

with:

```js
   dsgArenaMyRequestsEvent: (p, s) => arenaMyRequests(p, s),
   dsgArenaRequestEndedEvent: (p, s) => arenaRequestEnded(p, s),
```

After the `ARENA_OWNER_ACTION_SENT` case added in Task 3, add:

```js
      case ARENA_REQUEST_SENT:
         arenaRequestSent(action.payload, newState);
         break;
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/redux_reducers`
Expected: PASS (arenaRequests now 38 tests; the other reducer files unchanged and green).

- [ ] **Step 7: Run the full suite and check for stale references**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: all test files pass, 0 failed.
Run: `grep -rn "arenaRejectRequest" $RX/src --include='*.js' | grep -v graphify-out`
Expected: only the comment in `utils.js` `renjuRejectDraw` (line 377, "cf. arenaRejectRequest") remains. Change that comment's `(cf. arenaRejectRequest)` to `(cf. arenaRequestEnded)` so it points at live code, then re-run the grep: no output. Include `utils.js` in the commit below (it already is).

- [ ] **Step 8: Commit**

```bash
git -C $RX add src/redux_reducers/utils.js src/redux_reducers/rootReducer.js src/redux_actions/actionTypes.js src/redux_reducers/__tests__/arenaRequests.test.js
git -C $RX commit -S -m "feat(arena): requester request set, in-flight taps and reason-coded notices"
```

---

### Task 5: Owner request list UI

**Files:**
- Rewrite: `$RX/src/Components/Arena/JoinRequestComponent.js` (whole file, currently 135 lines)
- Modify: `$RX/src/Pages/Table.js:122`
- Modify: `$RX/src/redux_actions/actionTypes.js` (remove the `REMOVE_ARENA_JOIN_REQUEST` line)

**Interfaces:**
- Consumes: `useFrozenRequests(record) → {rows, frozen}` (Task 2); `selectArenaJoinRequests`, `selectArenaOwnerPending`, `ARENA_OWNER_ACTION_SENT` (Task 3); `Commands.arenaAccept`, `Commands.arenaReject` (existing); `MUTE` and the reducer's `mute(player, state)` (existing, `utils.js:494-498`).
- Produces: `<JoinRequestComponent game={…}/>` (default export, connected). No other task depends on it.

- [ ] **Step 1: Rewrite JoinRequestComponent**

Replace the whole content of `$RX/src/Components/Arena/JoinRequestComponent.js` with:

```js
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import User from '../../Classes/UserClass';
import Table from '../../Classes/TableClass';
import {connect} from 'react-redux';
import {ARENA_OWNER_ACTION_SENT, MUTE, send_message} from "../../redux_actions/actionTypes";
import {MODALS, openModal} from '../../ui/modals';
import LaunchIcon from '@mui/icons-material/Launch';
import {ListItemButton} from "@mui/material";
import {Commands} from '../../protocol';
import {selectArenaJoinRequests, selectArenaOwnerPending, selectCurrentTable} from '../../selectors';
import {useFrozenRequests} from '../../ui/useFrozenRequests';

// Arena owner's join-request list (spec C2). Rows come only from the server's latest
// dsgArenaJoinRequestsEvent for this table, in seq order, keyed by player. useFrozenRequests
// applies the freeze (spinner overlay, taps ignored) and the minimum interactive window. An
// Accept/Decline marks its row in flight and the whole list ignores taps until the server's
// next snapshot for this table; nothing is removed optimistically.

const styles = theme => ({
   root: {
      width: '100%',
      backgroundColor: 'white',
   },
   icon: {
      fontSize: 30,
   }
});

const mapStateToProps = state => {
   return {
      users: state.users,
      table: selectCurrentTable(state),
      record: selectArenaJoinRequests(state),
      pending: selectArenaOwnerPending(state),
      me: state.me,
      admin: state.admin
   }
};

const mapDispatchToProps = dispatch => {
   return {
      mute: (player) => {
         dispatch({type: MUTE, payload: player});
      },
      show_boot_dialog: (player) => {
         dispatch(openModal(MODALS.BOOT, player));
      },
      accept_player: (player, table) => {
         dispatch({type: ARENA_OWNER_ACTION_SENT, payload: {table: table, player: player}});
         dispatch(send_message(Commands.arenaAccept({playerToAccept: player, table: table})));
      },
      reject_player: (player, table) => {
         dispatch({type: ARENA_OWNER_ACTION_SENT, payload: {table: table, player: player}});
         dispatch(send_message(Commands.arenaReject({playerToReject: player, table: table})));
      },
   }
};

function UnconnectedArenJoinRequests(props) {
   const {classes, users, game, table, record, pending, me, admin, mute, show_boot_dialog} = props;
   const {rows, frozen} = useFrozenRequests(record);
   const locked = frozen || pending !== undefined;
   const tableId = table && table.table;

   if (rows.length === 0) {
      return (
         <Typography variant="body2" color="textSecondary" style={{padding: 16}}>
            No join requests yet
         </Typography>
      );
   }

   return (
      <Box sx={{position: 'relative', width: '100%'}}>
         <List className={classes.root} style={{width: '100%'}} dense={true} aria-busy={locked}>
            {rows.map(({player: name}) => {
               // A requester who already left the room still gets a stable row (plain name);
               // the server removes their request and a new snapshot follows.
               const user = users[name];
               const inFlight = pending !== undefined && pending.player === name;
               return (
                  <ListItem key={name}>
                     <ListItemAvatar onClick={() => {
                        if (!locked && user && name !== me) {
                           mute(name);
                        }
                     }}>
                        <Avatar alt={name} src={user ? user.avatar : undefined}/>
                     </ListItemAvatar>
                     <ListItemText
                        primary={user ? user.userhtml : name}
                        secondary={user ? user.rating(game) : undefined}
                     />
                     {(game && table && (table.owner || admin) && name !== me) &&
                        <LaunchIcon className={classes.icon} onClick={() => {
                           if (!locked) {
                              show_boot_dialog(name);
                           }
                        }}/>
                     }
                     {inFlight ?
                        <Box sx={{flex: 2, display: 'flex', justifyContent: 'center'}}>
                           <CircularProgress size={24}/>
                        </Box>
                        :
                        <>
                           <ListItemButton disabled={locked}
                                           onClick={() => {
                                              if (!locked) {
                                                 props.accept_player(name, tableId);
                                              }
                                           }}
                                           style={{
                                              flex: 1,
                                              justifyContent: 'center',
                                              backgroundColor: '#4caf50',
                                              color: 'white'
                                           }}>
                              <ListItemText primary={'Accept'} primaryTypographyProps={{align: 'center'}}/>
                           </ListItemButton>
                           <ListItemButton disabled={locked}
                                           onClick={() => {
                                              if (!locked) {
                                                 props.reject_player(name, tableId);
                                              }
                                           }}
                                           style={{
                                              flex: 1,
                                              justifyContent: 'center',
                                              backgroundColor: '#f44336',
                                              color: 'white'
                                           }}>
                              <ListItemText primary={'Decline'} primaryTypographyProps={{align: 'center'}}/>
                           </ListItemButton>
                        </>
                     }
                  </ListItem>
               );
            })}
         </List>
         {frozen &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(255, 255, 255, 0.6)',
               zIndex: 1
            }}>
               <CircularProgress/>
            </Box>
         }
      </Box>
   );
}

UnconnectedArenJoinRequests.propTypes = {
   classes: PropTypes.object.isRequired,
   users: PropTypes.objectOf(
      PropTypes.instanceOf(User).isRequired
   ).isRequired,
   table: PropTypes.instanceOf(Table),
   record: PropTypes.shape({
      table: PropTypes.number,
      requests: PropTypes.arrayOf(PropTypes.shape({
         player: PropTypes.string,
         seq: PropTypes.number,
      })),
      answersAction: PropTypes.bool,
   }),
   pending: PropTypes.shape({
      table: PropTypes.number,
      player: PropTypes.string,
   }),
   me: PropTypes.string,
   admin: PropTypes.bool,
};

const ArenJoinRequests = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedArenJoinRequests));

export default ArenJoinRequests;
```

- [ ] **Step 2: Stop passing the removed table field**

In `$RX/src/Pages/Table.js` replace line 122:

```js
                                 <JoinRequestComponent players={table.arenaPlayerRequests} game={table.game}/>
```

with:

```js
                                 <JoinRequestComponent game={table.game}/>
```

- [ ] **Step 3: Remove the dead action type**

In `$RX/src/redux_actions/actionTypes.js` delete the line:

```js
export const REMOVE_ARENA_JOIN_REQUEST = 'REMOVE_ARENA_JOIN_REQUEST'; // removed in Task 5 with its last importer
```

- [ ] **Step 4: Check nothing references the removed pieces**

Run: `grep -rn "REMOVE_ARENA_JOIN_REQUEST\|arenaPlayerRequests" $RX/src --include='*.js' | grep -v graphify-out`
Expected: no output.

- [ ] **Step 5: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: all test files pass, 0 failed.

- [ ] **Step 6: Compile check**

Components are not imported by the node tests, so a production build is the compile gate. Note first whether `$RX/build` exists (`ls -d $RX/build`).
Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm run build`
Expected: rsbuild reports a successful build with no "export ... was not found" warnings or errors. If `build/` did not exist before this step, delete it afterwards: `rm -rf $RX/build`.

- [ ] **Step 7: Commit**

```bash
git -C $RX add src/Components/Arena/JoinRequestComponent.js src/Pages/Table.js src/redux_actions/actionTypes.js
git -C $RX commit -S -m "feat(arena): owner list renders server snapshots with freeze and in-flight rows"
```

---

### Task 6: Requester lobby UI (Requested mark, busy cards, withdraw confirm)

**Files:**
- Modify: `$RX/src/selectors/index.js` (append `arenaTableStatus`)
- Test: `$RX/src/selectors/__tests__/selectors.test.js` (append)
- Modify: `$RX/src/ui/modals.js:26-30`
- Test: `$RX/src/redux_reducers/__tests__/arenaRequests.test.js` (append two modal tests)
- Modify: `$RX/src/redux_reducers/utils.js:1-3` (import from `ui/modals`) and `arenaMyRequests` (added in Task 4): close the withdraw dialog when its request ends
- Create: `$RX/src/Components/Arena/ArenaWithdrawModal.js`
- Modify: `$RX/src/Components/Table/TableCard.js:1, 9, 14-15, 38-98, 103-106, 153`
- Modify: `$RX/src/Pages/Arena.js:3, 5-6, 15, 18-28, 30-37, 63-67, 74, 114-123, 129, 152-168`
- Modify: `$RX/CONTEXT.md:79`

**Interfaces:**
- Consumes: `ARENA_REQUEST_SENT`, `state.arenaMyRequests`, `state.arenaRequestsInFlight` (Task 4); `Commands.arenaRequestJoin`, `Commands.arenaWithdraw` (Task 1); `openModal`, `closeModal`, `modalProps` (existing `ui/modals.js`).
- Produces:
  - `arenaTableStatus(tableId: number | string, myRequests: number[], inFlight: {table, op}[]) → 'busy' | 'requested' | 'none'`.
  - `arenaMyRequests` (utils) also closes `MODALS.ARENA_WITHDRAW` when a snapshot no longer lists the dialog's table.
  - `MODALS.ARENA_WITHDRAW = 'arenaWithdraw'` (payload = table number).
  - `<TableCard requested={bool} busy={bool} …/>` (the `countdown` prop is gone).
  - `<ArenaWithdrawModal/>` (default export, connected).

- [ ] **Step 1: Write the failing tests**

Append to `$RX/src/selectors/__tests__/selectors.test.js` (add `arenaTableStatus` to the import on line 2):

```js
describe('arenaTableStatus — the requester lobby card state', () => {
  const req = (table) => ({ table, op: 'request' });
  const wd = (table) => ({ table, op: 'withdraw' });

  test('a table awaiting the server answer is busy, even if it is also requested', () => {
    expect(arenaTableStatus(3, [3], [wd(3)])).toBe('busy');
  });

  test('a table in my latest request set is requested', () => {
    expect(arenaTableStatus(3, [3, 5], [])).toBe('requested');
  });

  test('any other table is none', () => {
    expect(arenaTableStatus(4, [3], [req(5)])).toBe('none');
  });

  test('a string id from Object.keys(tables) matches the server ints', () => {
    expect(arenaTableStatus('3', [3], [])).toBe('requested');
    expect(arenaTableStatus('5', [], [req(5)])).toBe('busy');
  });

  test('missing lists count as empty', () => {
    expect(arenaTableStatus(3, undefined, undefined)).toBe('none');
  });
});
```

Append to `$RX/src/redux_reducers/__tests__/arenaRequests.test.js` (add `import { MODALS, openModal, modalProps } from '../../ui/modals';` to the imports at the top):

```js
describe('withdraw confirm goes through the modal seam', () => {
  test('MODALS.ARENA_WITHDRAW opens carrying the table number', () => {
    expect(MODALS.ARENA_WITHDRAW).toBe('arenaWithdraw');
    const s = liveGameApp(init(), openModal(MODALS.ARENA_WITHDRAW, 7));
    expect(s.modals).toEqual({ arenaWithdraw: 7 });
    expect(modalProps(s, MODALS.ARENA_WITHDRAW)).toBe(7);
  });

  test('a request that ends while its dialog is open closes the dialog (no stray withdraw)', () => {
    let s = dispatch(init(), 'dsgArenaMyRequestsEvent', { tables: [7, 9] });
    s = liveGameApp(s, openModal(MODALS.ARENA_WITHDRAW, 7));
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [7] }); // another table changed
    expect(modalProps(s, MODALS.ARENA_WITHDRAW)).toBe(7);
    s = dispatch(s, 'dsgArenaMyRequestsEvent', { tables: [] }); // 7 declined / full / closed
    expect(s.modals).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/selectors src/redux_reducers/__tests__/arenaRequests.test.js`
Expected: FAIL. The selector tests fail with `arenaTableStatus is not a function`; the modal tests fail on `expected undefined to be 'arenaWithdraw'` and on the dialog still being open after the request ended.

- [ ] **Step 3: Add the selector and the modal name**

Append to `$RX/src/selectors/index.js`:

```js

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
```

In `$RX/src/ui/modals.js` replace lines 26-30:

```js
export const MODALS = {
  SETTINGS: 'settings',
  CREATE_ARENA: 'createArena',
  BOOT: 'boot',
};
```

with:

```js
export const MODALS = {
  SETTINGS: 'settings',
  CREATE_ARENA: 'createArena',
  BOOT: 'boot',
  ARENA_WITHDRAW: 'arenaWithdraw', // payload: the table number to withdraw from
};
```

In `$RX/src/redux_reducers/utils.js`, add to the imports at the top (after line 3, `import {Game, GameState} from '../Classes/GameClass';`):

```js
import {MODALS, closeModal, modalProps, modalsReducer} from '../ui/modals';
```

and in `arenaMyRequests` (added in Task 4) replace:

```js
   state.arenaRequestsInFlight = (state.arenaRequestsInFlight || []).filter(e => !answered(e));
}
```

with:

```js
   state.arenaRequestsInFlight = (state.arenaRequestsInFlight || []).filter(e => !answered(e));
   // A request that ended while its withdraw confirm is open (DECLINED, TABLE_FULL,
   // TABLE_CLOSED) closes the dialog, so Withdraw is never sent for a request that no
   // longer exists, and the dialog cannot pop up again if the table is requested later.
   const withdrawTable = modalProps(state, MODALS.ARENA_WITHDRAW);
   if (withdrawTable !== undefined && !tables.includes(withdrawTable)) {
      state.modals = modalsReducer(state.modals, closeModal(MODALS.ARENA_WITHDRAW));
   }
}
```

(`rootReducer` runs `modalsReducer` again after the event handlers; for a non-modal action it returns the same `modals` reference, so this close sticks.)

In `$RX/CONTEXT.md` line 79 replace `` (`SETTINGS`, `CREATE_ARENA`, `BOOT`) `` with `` (`SETTINGS`, `CREATE_ARENA`, `BOOT`, `ARENA_WITHDRAW`) ``.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npx vitest run src/selectors src/redux_reducers/__tests__/arenaRequests.test.js src/ui`
Expected: PASS.

- [ ] **Step 5: Create the withdraw confirm modal**

Create `$RX/src/Components/Arena/ArenaWithdrawModal.js`:

```js
import React from 'react';
import PropTypes from 'prop-types';
import {withStyles} from '@mui/styles';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';
import {connect} from 'react-redux';
import {ARENA_REQUEST_SENT, send_message} from "../../redux_actions/actionTypes";
import {Commands} from '../../protocol';
import {MODALS, closeModal, modalProps} from '../../ui/modals';

// Arena requester: confirm before withdrawing a pending join request (spec C3). The lobby list
// is not frozen and a withdraw blocks re-requests until the table's next game, so a mis-tap
// must not withdraw. On confirm the card goes busy until a dsgArenaMyRequestsEvent without
// the table arrives. If the request ends while the dialog is open, the reducer
// (arenaMyRequests) closes it, so Withdraw is never sent for a request that is gone.

function getModalStyle() {
   const top = 50;
   const left = 50;

   return {
      top: `${top}%`,
      left: `${left}%`,
      transform: `translate(-${top}%, -${left}%)`,
   };
}

const styles = theme => ({
   paper: {
      position: 'absolute',
      backgroundColor: 'white',
      boxShadow: '10px 10px 10px black',
      padding: '2%',
      outline: 'none',
   },
});

const mapStateToProps = state => {
   return {
      table: modalProps(state, MODALS.ARENA_WITHDRAW),
   }
};

const mapDispatchToProps = dispatch => {
   return {
      withdraw: (table) => {
         dispatch(send_message(Commands.arenaWithdraw({table: table})));
         dispatch({type: ARENA_REQUEST_SENT, payload: {table: table, op: 'withdraw'}});
         dispatch(closeModal(MODALS.ARENA_WITHDRAW));
      },
      dismiss: () => {
         dispatch(closeModal(MODALS.ARENA_WITHDRAW));
      }
   }
};

const UnconnectedArenaWithdrawModal = (props) => {
   const {classes, table, withdraw, dismiss} = props;

   return (
      <div>
         <Modal
            aria-labelledby="arena-withdraw-title"
            open={table !== undefined}
            onClose={dismiss}
         >
            <div style={getModalStyle()} className={classes.paper}>
               <Typography variant="subtitle1" id="arena-withdraw-title">
                  Withdraw your request to table {table}? You won't be able to request it again until its next game.
               </Typography>
               <Button onClick={() => withdraw(table)}>Withdraw</Button>
               <Button onClick={dismiss}>Cancel</Button>
            </div>
         </Modal>
      </div>
   );
};

UnconnectedArenaWithdrawModal.propTypes = {
   classes: PropTypes.object.isRequired,
   table: PropTypes.number,
};

const ArenaWithdrawModal = connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(UnconnectedArenaWithdrawModal));

export default ArenaWithdrawModal;
```

- [ ] **Step 6: Replace the TableCard countdown with requested/busy**

In `$RX/src/Components/Table/TableCard.js`:

Replace line 1:

```js
import React, {useEffect, useRef, useState} from 'react';
```

with:

```js
import React from 'react';
```

Replace line 9:

```js
import Box from '@mui/material/Box';
```

with:

```js
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
```

Delete lines 14-15:

```js
const COUNTDOWN_SECONDS = 6;

```

Replace lines 38-98 (from `const TableCard = (props) => {` through the closing `}` of the `{counting && …}` overlay block):

```js
const TableCard = (props) => {
   const {classes, table, users, countdown} = props;
   const seated = table.seats[1] !== "" || table.seats[2] !== "";
   const game = table.game;

   const [remaining, setRemaining] = useState(0);
   const intervalRef = useRef(null);

   useEffect(() => () => clearInterval(intervalRef.current), []);

   const counting = remaining > 0;

   const handleClick = () => {
      if (counting) return;
      props.joinRoom(table.table);
      if (!countdown) return;
      const start = Date.now();
      setRemaining(COUNTDOWN_SECONDS);
      intervalRef.current = setInterval(() => {
         const left = COUNTDOWN_SECONDS - (Date.now() - start) / 1000;
         if (left <= 0) {
            clearInterval(intervalRef.current);
            setRemaining(0);
         } else {
            setRemaining(left);
         }
      }, 100);
   };

   return (
      <Card className={classes.card}
            style={{backgroundColor: table.table_color(), position: 'relative', cursor: counting ? 'default' : 'pointer'}}
            onClick={handleClick}>
         {counting &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.35)',
               zIndex: 1
            }}>
               <Box sx={{position: 'relative', display: 'inline-flex'}}>
                  <CircularProgress variant="determinate"
                                    value={(remaining / COUNTDOWN_SECONDS) * 100}
                                    size={56}/>
                  <Box sx={{
                     position: 'absolute',
                     inset: 0,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center'
                  }}>
                     <Typography variant="h6" component="div" sx={{color: '#fff'}}>
                        {Math.ceil(remaining)}
                     </Typography>
                  </Box>
               </Box>
            </Box>
         }
```

with:

```js
const TableCard = (props) => {
   const {classes, table, users, requested, busy} = props;
   const seated = table.seats[1] !== "" || table.seats[2] !== "";
   const game = table.game;

   // Arena lobby (spec C3): `busy` while a request or withdraw for this table awaits the
   // server's next dsgArenaMyRequestsEvent (taps ignored, spinner); `requested` while the
   // latest snapshot lists the table. Both come from the server; there are no timers.
   const handleClick = () => {
      if (busy) return;
      props.joinRoom(table.table);
   };

   return (
      <Card className={classes.card}
            style={{backgroundColor: table.table_color(), position: 'relative', cursor: busy ? 'default' : 'pointer'}}
            onClick={handleClick}>
         {busy &&
            <Box sx={{
               position: 'absolute',
               inset: 0,
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               backgroundColor: 'rgba(0, 0, 0, 0.35)',
               zIndex: 1
            }}>
               <CircularProgress size={40}/>
            </Box>
         }
```

After the title block (originally lines 103-106):

```js
            <Typography variant="h5" component="h2">
               {table.private() ? (
                  <span><HttpsIcon className={classes.icon}/> {table.game_name()}</span>) : table.game_name()}
            </Typography>
```

insert:

```js
            {requested &&
               <Chip label="Requested" color="primary" size="small" style={{marginTop: 4}}/>
            }
```

In `TableCard.propTypes` replace:

```js
   countdown: PropTypes.bool
```

with:

```js
   requested: PropTypes.bool,
   busy: PropTypes.bool
```

- [ ] **Step 7: Wire the Arena page**

In `$RX/src/Pages/Arena.js`:

Replace line 3:

```js
import {send_message} from "../redux_actions/actionTypes";
```

with:

```js
import {ARENA_REQUEST_SENT, send_message} from "../redux_actions/actionTypes";
```

Replace lines 5-6:

```js
import {MODALS, toggleModal} from '../ui/modals';
import {isGuestName, tableVisibleToGuest} from '../selectors';
```

with:

```js
import {MODALS, openModal, toggleModal} from '../ui/modals';
import {arenaTableStatus, isGuestName, tableVisibleToGuest} from '../selectors';
```

Replace line 15:

```js
import CreateArenaTableModal from "../Components/Arena/CreateArenaTableModal";
```

with:

```js
import CreateArenaTableModal from "../Components/Arena/CreateArenaTableModal";
import ArenaWithdrawModal from "../Components/Arena/ArenaWithdrawModal";
```

In `mapStateToProps` replace:

```js
      me: state.me,
      admin: state.admin,
   }
};
```

with:

```js
      me: state.me,
      admin: state.admin,
      arenaMyRequests: state.arenaMyRequests,
      arenaRequestsInFlight: state.arenaRequestsInFlight,
   }
};
```

In `mapDispatchToProps` replace:

```js
      toggle_create_arena_modal: () => dispatch(toggleModal(MODALS.CREATE_ARENA)),
   }
};
```

with:

```js
      toggle_create_arena_modal: () => dispatch(toggleModal(MODALS.CREATE_ARENA)),
      request_sent: (table) => dispatch({type: ARENA_REQUEST_SENT, payload: {table: table, op: 'request'}}),
      open_withdraw: (table) => dispatch(openModal(MODALS.ARENA_WITHDRAW, table)),
   }
};
```

Replace lines 63-67:

```js
   joinArenaTable = (table) => {
      if (table === -1 || !this.props.tables[table].private() || this.props.admin) {
         this.props.send_message(Commands.arenaRequestJoin({table: table}));
      }
   };
```

with:

```js
   // Spec C3: a busy card ignores the tap; a requested card offers withdraw (confirmed in
   // ArenaWithdrawModal); otherwise send the request and mark the card busy until the
   // server answers this table, so a double-tap never yields DUPLICATE.
   joinArenaTable = (table) => {
      const {tables, admin, arenaMyRequests, arenaRequestsInFlight} = this.props;
      const status = arenaTableStatus(table, arenaMyRequests, arenaRequestsInFlight);
      if (status === 'busy') {
         return;
      }
      if (status === 'requested') {
         this.props.open_withdraw(table);
         return;
      }
      if (table === -1 || !tables[table].private() || admin) {
         this.props.send_message(Commands.arenaRequestJoin({table: table}));
         this.props.request_sent(table);
      }
   };
```

Replace line 74:

```js
      const {users, connected, logged_in, messages, tables, me} = this.props;
```

with:

```js
      const {users, connected, logged_in, messages, tables, me, arenaMyRequests, arenaRequestsInFlight} = this.props;
```

Replace lines 114-123:

```js
                              {Object.keys(tables)
                                 .filter(table => tables[table].players.length === 1)
                                 .filter(table => tableVisibleToGuest(tables[table], isGuest))
                                 .map(table =>
                                 <TableCard
                                    key={table}
                                    table={tables[table]}
                                    joinRoom={this.joinArenaTable}
                                    countdown={true}
                                    users={users}/>)}
```

with:

```js
                              {Object.keys(tables)
                                 .filter(table => tables[table].players.length === 1)
                                 .filter(table => tableVisibleToGuest(tables[table], isGuest))
                                 .map(table => {
                                    const status = arenaTableStatus(tables[table].table, arenaMyRequests, arenaRequestsInFlight);
                                    return (
                                       <TableCard
                                          key={table}
                                          table={tables[table]}
                                          joinRoom={this.joinArenaTable}
                                          requested={status === 'requested'}
                                          busy={status === 'busy'}
                                          users={users}/>
                                    );
                                 })}
```

Replace line 129:

```js
               <CreateArenaTableModal/>
```

with:

```js
               <CreateArenaTableModal/>
               <ArenaWithdrawModal/>
```

In `UnconnectedArena.propTypes` replace:

```js
   tables: PropTypes.objectOf(
      PropTypes.instanceOf(Table).isRequired
   ).isRequired,
};
```

with:

```js
   tables: PropTypes.objectOf(
      PropTypes.instanceOf(Table).isRequired
   ).isRequired,
   arenaMyRequests: PropTypes.arrayOf(PropTypes.number),
   arenaRequestsInFlight: PropTypes.arrayOf(PropTypes.shape({
      table: PropTypes.number,
      op: PropTypes.oneOf(['request', 'withdraw']),
   })),
};
```

- [ ] **Step 8: Check the countdown is gone**

Run: `grep -rn "countdown\|COUNTDOWN_SECONDS" $RX/src --include='*.js' | grep -v graphify-out | grep -v "Components/Table/Timer.js\|Components/Table/__tests__"`
Expected: no output (the remaining hits in `Timer.js` and its tests are the game clock, unrelated).

- [ ] **Step 9: Run the full suite and the compile check**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: all test files pass, 0 failed.
Note whether `$RX/build` exists, then run `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm run build`.
Expected: a successful build, no missing-export warnings. Delete `build/` afterwards if it did not exist before.

- [ ] **Step 10: Commit**

```bash
git -C $RX add src/selectors/index.js src/selectors/__tests__/selectors.test.js src/ui/modals.js src/redux_reducers/utils.js src/redux_reducers/__tests__/arenaRequests.test.js src/Components/Arena/ArenaWithdrawModal.js src/Components/Table/TableCard.js src/Pages/Arena.js CONTEXT.md
git -C $RX commit -S -m "feat(arena): requester lobby shows server request state and confirms withdraw"
```

---

### Task 7: Verification — full suite and local-stack E2E

**Files:** none changed (unless E2E finds a bug: then fix it in a new commit with a regression test in the matching test file, and re-run this task).

**Interfaces:**
- Consumes: everything above, plus the server side of this spec built and running on the local docker stack (the pente.org plan for this spec must be complete first; deploy with `cd /Users/waliedothman/mariposa/coding/pente.org-project/pente.org && ./justCompile`, which compiles and restarts the container; the local stack is a dev backend). The spec's E2E calls for two React instances plus one Android or iOS device; this task covers the React side with two accounts plus guest tabs, and the cross-client check (a mobile owner or requester against a React one) is left to the Android and iOS plans for this spec.
- Produces: evidence (command output, observed UI states) for the final report.

- [ ] **Step 1: Full test suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm test`
Expected: `Test Files  29 passed (29)` (26 before this plan, plus `arenaRequestFreeze.test.js`, `useFrozenRequests.test.js`, `arenaRequests.test.js`), 0 failed. Record the `Tests  N passed` line.

- [ ] **Step 2: Production build**

Note whether `$RX/build` exists, then run: `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm run build`
Expected: success. Delete `build/` afterwards if it did not exist before.

- [ ] **Step 3: E2E setup (two React instances against the local backend)**

1. Confirm the local-backend switch: `grep -c '^PUBLIC_LOCAL_BACKEND=1$' $RX/.env.local` → `1`. If it prints `0`, set that line in `$RX/.env.local` (gitignored, never commit it).
2. Instance A (identity from the gitignored `$RX/.env.development`): `cd $RX && TMPDIR=/private/tmp/claude-501/arena-react npm start` (run in the background). Note the port it prints.
3. Instance B (second test account): the two local test accounts are listed in the memory note `/Users/waliedothman/.claudeboat/projects/-Users-waliedothman-mariposa-coding-pente-org-project/memory/local-backend-test-accounts.md`. Use the account that is not the one in `.env.development`. Never print or commit the password. `cd $RX && REACT_APP_USERNAME=<account B> REACT_APP_PASSWORD=<password B> TMPDIR=/private/tmp/claude-501/arena-react npx rsbuild dev --port 3002` (background).
4. Extra players: open either instance's URL with `?guest` (for example `https://localhost:3002/?guest`) in another browser tab. Each such tab logs in as a fresh `guestNN` and goes to the Arena server. Guests only see unrated tables, so create all tables in these scenarios as **unrated**.
5. In A and B pick the Arena server on the Servers page. Drive the browsers with the Playwright MCP tools or by hand; take a screenshot for each "Expected" below into `/private/tmp/claude-501/arena-react/e2e/`.

Names below: **A** and **B** are the two accounts, **G1**, **G2** (and in Step 7 **G3**) are guest tabs.

- [ ] **Step 4: Scenario — request → decline → re-request refused**

B creates an unrated table (B is owner; B's table pane shows "No join requests yet"). G1 taps B's card.
Expected: G1's card shows a spinner, then a "Requested" chip, with no countdown. B's list shows G1 (sound and tab cue) with Accept/Decline.
B taps Decline. Expected: G1's row shows a spinner, all buttons disabled; then the list hides ("No join requests yet"). G1 sees the snackbar "<B> declined your request" and the "Requested" chip disappears. B is still connected (no disconnect on decline).
G1 taps B's card again. Expected: snackbar "You can't request table <n> again until its next game"; no chip.

- [ ] **Step 5: Scenario — withdraw → re-request refused**

G2 taps B's card → "Requested". G2 taps the card again.
Expected: a dialog with exactly "Withdraw your request to table <n>? You won't be able to request it again until its next game." Cancel closes it and the chip stays.
G2 taps again and chooses Withdraw. Expected: card spinner, then no chip; B's list drops G2 after the freeze spinner. G2 taps again → snackbar "You can't request table <n> again until its next game".

- [ ] **Step 6: Scenario — owner freeze and minimum window**

Fresh owner table from A (A exits any table first; A's pane shows "No join requests yet"). G1 requests A's table (rows appear at once, no spinner, since the list was empty). Within 1 s G2 requests too.
Expected: A's G1 row stays put and clickable until about 1 s after it appeared; then a spinner overlay covers the list for about 0.4 s and the list shows G1, G2 in request order. Taps on the overlay do nothing.

- [ ] **Step 7: Scenario — accept → requester's other requests cancelled; other requesters see TABLE_FULL**

Setup: A owns table X, B owns table Y (each exits and re-creates if needed). Open a third guest tab, G3. G2 requests X and A declines G2 (G2 is now blocked on X, used in Step 8). G1 requests X and Y; G3 requests X.
A taps Accept on G1. Expected: G1 lands on X's table page and a game starts after the 5 s (second) press-play delay. B's list drops G1 (after the freeze) with no notice to B. G3 sees "Table <X> is no longer available" and loses its chip.

- [ ] **Step 8: Scenario — game ends, table open → previously blocked player can request**

Continue on X (A vs G1). Finish the game (one player taps Resign). G1 exits the table so X has one player.
Expected: X reappears in the lobby with one player. G2 taps X → "Requested" (no BLOCKED notice), and A's list shows G2.
Note: R6 already wiped X's blocked set when G1 joined at accept, so this step cannot fail on the block alone; what it checks is that the reopened table takes requests again and its owner gets snapshots. The reopen transition itself is pinned in Step 11.

- [ ] **Step 9: Scenario — table close**

G1 requests B's table (B alone). B exits the table.
Expected: G1 sees "Table <n> was closed"; the chip and the card disappear.

- [ ] **Step 10: Scenario — owner leaves a finished 2-player table → joiner becomes owner**

B creates a table; G2 requests and B declines (G2 blocked). G1 requests, B accepts, the game runs, someone resigns. B exits.
Expected: G1 becomes owner: G1's table pane switches from chat to "No join requests yet". G2 taps the table → "Requested" and G1's list shows G2.
Note: as in Step 8, R6 wiped the block when G1 joined, so the meaningful checks here are the owner change (G1 gets the empty snapshot and then G2's request), not the block.

- [ ] **Step 11: Scenario — waiting set cancelled or force-resigned → table reopens with its memory wiped**

A creates a timed, unrated table. G1 requests and A accepts; the game starts. Close G1's browser tab (G1 disconnects mid-game). A sees the wait-for-return modal.
While A waits (the table has one player and is listed in the lobby, but is not open because a game is in progress): G2 taps the table. Expected: snackbar "You can't join table <n> right now"; no chip.
When the modal offers resign/cancel, A chooses cancel (or force-resign).
Expected: the table returns to one player (A) with no game, A's list shows "No join requests yet". G2 taps the table → "Requested" and A's list shows G2 (R6b: not open → open).

- [ ] **Step 12: Scenario — requester disconnect**

G2 requests A's table (A's list shows G2). Close G2's tab.
Expected: A's list drops G2 after the freeze spinner (or hides if G2 was the only row).

- [ ] **Step 13: Scenario — owner exits right after accept**

G1 requests B's table. B taps Accept and immediately exits the table (before the join lands; repeat a few times if the timing is hard to hit).
Expected: G1 either stays in the lobby with "Table <n> was closed" and no chip, or briefly lands on the table and leaves with it. G1 never ends up seated at a table that no longer exists; the lobby shows no phantom table.

- [ ] **Step 14: Scenario — owner NO_LONGER_AVAILABLE (best effort)**

A owns X, B owns Y, G1 requests both. A and B tap Accept on G1 at nearly the same moment.
Expected: one owner gets G1; the other owner's row spinner ends with the snackbar "<G1> is no longer available" and G1's row gone. If the timing cannot be hit by hand, record "not reproduced" (the server tests cover the double accept).

- [ ] **Step 15: Tear down and tidy**

Stop both dev servers (stop the background tasks). Then:
Run: `git -C $RX status --porcelain`
Expected: no lines, except ` M docs/superpowers/plans/2026-10-10-arena-persistent-join-requests-react.md` if checkboxes were ticked in this plan (it is committed, so it is never `??`). Never delete or revert anything under `docs/`. Delete only untracked files this session created (scratch output, `build/` if it did not exist before); `.env.local` and `.env.development` stay untouched and uncommitted. Delete `/private/tmp/claude-501/arena-react` once the screenshots are no longer needed for the report.

- [ ] **Step 16: Report**

Report: the `Test Files`/`Tests` lines from Step 1, the build result from Step 2, and per E2E scenario (Steps 4–14) pass / fail / not reproduced with the screenshot path. Do not claim a scenario passed without having observed it this session.
