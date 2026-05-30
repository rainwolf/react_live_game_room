# React Live Game Room

Real-time multiplayer Pente game room UI. Connects to `pente.org` backend via WebSocket and renders the live game lobby, board, and chat.

## Stack

- **Framework**: React 18.3 + Material-UI (MUI) 5
- **Bundler**: RSBuild 1.3 + Rspack 1.6
- **State**: Redux 4 (`legacy_createStore`) — no slices, single monolithic reducer
- **WebSocket**: `@giantmachines/redux-websocket` — server events arrive as Redux actions
- **Routing**: State-driven (no React Router) — Redux state determines which page renders

## Scripts

```bash
npm start        # RSBuild dev server
npm run build    # Production build → build/
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── App.js                   # Root: renders Servers / Room / Table based on Redux state
├── index.js                 # Store creation, React root
├── Classes/                 # Domain models (GameClass, TableClass, UserClass)
├── Components/
│   ├── Board/               # Game board (Board, BoardSquare, Stone, Territory, LastMove)
│   ├── Chat/                # Chat + player list (ChatComponent, ChatPanel, ChatInput, PlayersList)
│   ├── Table/               # Game table UI (Seat, Captures, and all game modals)
│   └── Room/                # Room-level UI (InvitationResponseModal)
├── Pages/
│   ├── Servers.js           # Server selection + login
│   ├── Room.js              # Lobby / chat room
│   └── Table.js             # Active game view
├── redux_actions/
│   └── actionTypes.js       # Action type constants + action creators
└── redux_reducers/
    ├── rootReducer.js        # All state logic in one reducer
    ├── initialState.js       # Default state shape
    └── utils.js              # Pure helpers: processUser, addMove, joinTable, etc.
```

## State & Routing

Redux state drives navigation — no URL routing:

```
state.table  → <TableView />   (full-screen game board)
state.server → <Room />        (lobby with chat + player list)
(neither)    → <Servers />     (server selection)
```

## WebSocket Architecture

Connection: `wss://{hostname}/websocketServer/{server}`

Events flow: server → WebSocket → Redux action → reducer → UI

Key incoming events handled in `rootReducer.js`:

| Event | Purpose |
|-------|---------|
| `dsgLoginEvent` | Authenticate user |
| `dsgJoinMainRoomEvent` | Enter lobby, receive user/table lists |
| `dsgUpdatePlayerDataEvent` | Update player info |
| `dsgTableStateChangeEvent` | Table created/updated/removed |
| `dsgAddMoveEvent` | New game move |
| `dsgGameStateChangeEvent` | Game started/ended |
| `dsgTimerChangeEvent` | Turn timer tick |
| `dsgBootEvent` | Player booted from table |
| `dsgInvitationEvent` | Game invitation received |
| `dsgPingEvent` | Server ping (answered by custom middleware) |

WebSocket lifecycle:
- `REDUX_WEBSOCKET::OPEN` → set `connected: true`
- `REDUX_WEBSOCKET::CLOSED` → reset to `initialState`
- `REDUX_WEBSOCKET::MESSAGE` → parse JSON, route to handler

## Build Output

- Output dir: `build/`
- Asset prefix: `/gameServer/live` (deployed under subpath on pente.org)
- Environment variables: `REACT_APP_*` → `process.env.REACT_APP_*`

## Key Patterns

- **No sagas or thunks** — all async is WebSocket-driven through the middleware
- **Custom pinger middleware** — auto-responds to `dsgPingEvent` with `WEBSOCKET_SEND`
- **Game replay** — `MOVE_BACK`, `MOVE_FORWARD`, `MOVE_GOTO` actions for stepping through history
- **Modals** are Redux-controlled (boolean flags in state), not local component state

# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |
