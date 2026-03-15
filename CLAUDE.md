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
