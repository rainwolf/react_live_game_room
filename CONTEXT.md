# CONTEXT — react_live_game_room domain glossary

Shared vocabulary for this codebase. Architecture reviews and design conversations
use these terms exactly. Add a term here when a design names a concept that isn't
already in the code; sharpen a term in place when a conversation clarifies it.

## Wire protocol (crystallized 2026-06-13 — Candidate 1 design)

The app talks to the `pente.org` backend over a single WebSocket. Every server↔client
exchange is a `dsg*Event` JSON object. The **Protocol** is the module that will own
that wire format — today it has no owner: inbound is a 35-branch `JSON.parse` switch in
`rootReducer.js`, outbound is ~34 hand-built payloads behind the one-line `send_message`
wrapper.

- **Protocol** — the module (`src/protocol/`) that owns the `dsg*` wire format in both
  directions. The single authority on what each message looks like. Keeps
  `@giantmachines/redux-websocket` as the sole **transport** (we are building a *schema*
  seam, not a swappable-transport seam).

- **Message descriptor** — the single source of truth for one `dsg*` message:
  its name, **direction** (`in` | `out` | `both`), its fields (`{key, type, required}`),
  and defaults (e.g. `time: 0`). A `both`-direction message (move, sit, stand, join,
  exit, swapSeats, swap2Pass, undoRequest…) is described **once** and drives both
  inbound validation and outbound building — today those shapes are defined twice.

- **Command** — an outbound message the client sends. Built by `Commands.<name>(args)`,
  which validates against the descriptor and stamps defaults. Replaces inline
  `send_message({dsgXEvent: {…}})` at ~34 call sites. Pure function → directly testable.
  Caller passes explicit args; a thin caller-side helper derives `player`/`table` from
  `state.tables[state.table]`.

- **Event** — an inbound message the client receives, after `decode()` turns the raw
  `REDUX_WEBSOCKET::MESSAGE` into a typed `{type, payload}` (or a decode error).

- **decode / encode** — `decode(rawMsgAction) → {ok, event} | {ok:false, error}` validates
  inbound shape. `encode` is the Command-building side. Both consult Message descriptors.

- **invalid vs irrelevant** — load-bearing distinction. A *malformed* message → validation
  error (dev log + generic "connection problem" signal). A message for **another table**
  (`data.table !== state.table`) is *valid but irrelevant* → a deliberate, debug-logged
  drop in the registry layer, never an error. Conflating them floods errors on every
  multi-table broadcast.

- **decode middleware** — replaces the reducer's parse-and-switch: it `decode`s each
  inbound message and dispatches a typed action or a `PROTOCOL_ERROR`. The legacy
  **pinger** folds into it (decode recognizes `dsgPingEvent` → `dispatch(Commands.pong())`),
  so wire knowledge leaves the middleware.

- **pure reducer** — once the decode middleware feeds it typed actions, the reducer
  becomes `(typedAction, state) → state`: a `handlers[type]` registry pointing at the
  existing `utils.js` mutators. Purity is the real seam — the reducer becomes testable
  with zero transport. The honest "second adapter" that justifies the seam is the
  **characterization test harness** that replays recorded server messages into it.

## Modal seam (crystallized 2026-06-14 — Candidate 3 design)

The app shows two *kinds* of modal, and the distinction is load-bearing:

- **Discretionary modal** — opened/closed by a local user click (Settings, Create-Arena,
  the Boot-picker). Its visibility is a UI *command*. These are the **modal seam**'s job.
- **Derived modal** — visibility is *computed* from game/server domain state (Undo, Cancel,
  Swap2/D-Pente choice, Evaluate-Go, Resign-cancel, Wait-return, Invitation-response).
  It is **not** commanded by the UI; it appears because the domain entered a state. These
  stay derived — routing them through the seam would fake domain state as a UI command.

- **Modal seam** — the module (`src/ui/modals.js`) that owns discretionary-modal state.
  Before it, each such modal had its own action constant, its own near-identical reducer
  case (toggle / set-with-payload / delete), and its own raw-key selector across three
  files. The seam replaces that with one mechanism:
  - **state** — a modal is open iff its name is a key in `state.modals`: `true` (open, no
    data) | `<payload>` (open, carrying data, e.g. the player to boot). `closeModal` removes
    the key (matching the original reducer's `delete`), so *absent* is the single closed
    encoding and the map returns to `{}`. Open/close is explicit — nothing is inferred from
    payload truthiness, so a falsy payload still opens.
  - **interface** — `openModal(name, props)` / `closeModal(name)` / `toggleModal(name, props)`
    action creators, a pure `modalsReducer(modals, action)` (delegated to from `rootReducer`),
    and selectors `isModalOpen(state, name)` / `modalProps(state, name)`. `modalProps`
    returns `undefined` when closed, preserving the `open={value !== undefined}` render gate.
  - **MODALS** — the name registry (`SETTINGS`, `CREATE_ARENA`, `BOOT`); a new discretionary
    modal is one `MODALS` entry + one `openModal` call + one selector, no new action type
    and no new reducer case.

  **Not in the seam:** `InviteModal` keeps its local React `useState` — local concern, local
  state; lifting it into redux would *scatter*, the opposite of deepening.

## Selectors — read seam (crystallized 2026-06-14 — Candidate 4 design)

- **Selectors** — the module (`src/selectors/`) that owns the *read* side of the normalized
  Redux state, the mirror of how the reducer owns the write side. Components ask named
  questions instead of re-deriving them by reaching into the state shape, so that shape
  stays private and each derivation is tested once.
  - **`selectCurrentTable(state)`** — `state.tables[state.table]`, the two-level reach for
    "the table I'm at", previously duplicated in **16 components**. Returns undefined when
    not at a table (faithful to the raw expression). Stable reference → safe in
    `mapStateToProps`, no memoization needed.
  - **`isGuestName(name)` / `tableVisibleToGuest(table, isGuest)`** — the guest-detection and
    "guests never see rated tables" rule (security-relevant), previously duplicated in the
    Arena and Room lobbies. Pure over args so the lobby filters run in render without
    churning `mapStateToProps` references.
  - **Deliberately not one selector per state key.** Bare pass-throughs (`state.me`,
    `state.users`, `state.admin`, …) are inlined at call sites — wrapping each would be the
    shallow-module anti-pattern (interface as complex as implementation), not depth. Only
    multi-step reaches and duplicated derivations earn a home here.

## Core domain nouns (existing in code)

- **Server** — a backend instance the client connects to (`wss://{host}/websocketServer/{server}`).
- **Room** — the main lobby: user list + chat. **Arena** is a room mode.
- **Table** — a game table: seats, owner, settings, messages. `state.table` is the current
  table id; `state.tables` is indexed by id.
- **Seat** — a player position at a table; `Game.currentPlayer()` indexes into seats.
- **Game** — board state + move list + rules for one of ~15 variants (Pente, Keryo-Pente,
  Gomoku, D-Pente, G-Pente, Poof-Pente, Connect6, Go, O-Pente, Swap2 variants…).
- **Variant state** — `Game.gameState = {state, dPenteState, swap2State, goState}`; the
  per-variant phase (e.g. Swap2's `NO_CHOICE → SWAPPED/NOT_SWAPPED → SWAP2PASS`).
- **Opening phase** — the swap2 / d-pente OPENING (player 1 lays the opening stones, then a
  player decides whether to swap; swap2 also lets player 2 pass and lay two more stones,
  deferring the decision to player 1). "Which opening sub-phase are we in" is derived from
  `(moves played, recorded swap decision)`. It owns its own module, `src/game/openingPhase.js`
  — pure functions over primitives (`movesLength`, sub-state, `started`) that
  `Game.currentPlayer / swap2Choice / swap2CanPass / dPenteChoice` delegate to, instead of
  each re-deriving the same `moves.length`/sub-state combination (the swap2 conditions were
  triplicated). `src/game/gameState.js` holds the shared `GameState` enum (re-exported by
  GameClass). The honest second adapter that justifies the seam is the characterization net
  in `src/Classes/__tests__/gameVariantPhase.test.js` — the FSM was previously untested.
- **Board geometry** — the per-variant visual shape of the board (grid size, board CSS class,
  star-point/circle markers) derived from the game id. It owns its own module,
  `src/game/boardGeometry.js` — `gridSizeForGame`, `boardStyleClass`, `boardSpecialPoints` —
  which `Board.js` calls instead of re-deriving the geometry inline in render (a 13-branch
  style chain + the dots/circles block), and which `GameClass.setGame` delegates to for grid
  size (that derivation was duplicated). Special-point `part` codes: 51 = circle marker
  (non-go boards), 52 = star dot (go boards).

## Swap2 / D-Pente opening (server-verified protocol invariant, 2026-06-13)

Confirmed against the Java backend (`ServerTable.handleMove`/`handleSwap`,
`SimplePenteState.getCurrentPlayer`, `GridStateFactory`). Load-bearing for fixtures
and the decode middleware:

- **Player 1 (seat 1) places the whole opening consecutively** — swap2: moves 0,1,2;
  d-pente: moves 0,1,2,3. The server's `getCurrentPlayer()` returns 1 for `numMoves < 3`
  (swap2) / `< 4` (d-pente). No center auto-placement (`setTournamentRule(false)`).
- **Then seat 2 decides** via `dsgSwapSeatsTableEvent{swap}` — accepted only when
  `seat==2 && numMoves==3` (swap2) / `==4` (d-pente). For swap2, seat 2 may instead
  `dsgSwap2PassTableEvent`; it then plays 2 more stones (→ `numMoves==5`) and **seat 1**
  decides. After the decision the game continues as normal pente.
- **A rejected swap/pass is silent** — `handleSwap` only `log4j.info`s the error, never
  routes an error event. (Moves do route `dsgMoveTableErrorEvent`: `error 12 = NOT_TURN`,
  `13 = INVALID_MOVE`.)
- **GOTCHA — variant tables need a registered creator.** `resetTable()` (on join) sets
  the table's game from the creator's saved `"gameState"` preference; `handleChangeState`
  only **persists that pref for non-guests**. A guest-created table therefore resets to
  **PENTE** (plain alternation + auto-center) and the swap2/d-pente opening never engages —
  the choice is silently dropped. Capturing these variants requires a registered creator
  (e.g. `iostest`, whose saved pref is Swap2-Pente).
