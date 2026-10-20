# Kids Accounts (React live room) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The React live room knows when the logged-in player is a kid (from the login echo only), shows kid-mode chat and invite UI, renders server-stripped invite text cleanly, and links parents to the website "My kids" page.

**Architecture:** One pure rule `isKidLogin(me)` in a new `src/ui/kidMode.js` (with the fixed copy and URL) feeds a single `state.isKid` boolean set in the `dsgLoginEvent` handler and reset with the rest of `initialState`. Components only read `state.isKid`: `ChatInput` gets a `kidMode` prop (forwarded by `ChatComponent` from `Room` and `Table`), the two invite modals hide their text field (so the unchanged `useState('')` message is what gets sent), and the lobby shows a "Kid accounts" link to non-guest, non-kid players. No protocol change: the server contract adds no events, so enforcement stays on the server and the client only renders.

**Tech Stack:** React 18.3, MUI 5, Redux 4 (`legacy_createStore`, single reducer), `@giantmachines/redux-websocket`, RSBuild/Rspack, vitest 4 (node by default, `// @vitest-environment jsdom` per file when React must render).

**Spec:** `/Users/waliedothman/mariposa/coding/pente.org-project/pente.org/docs/superpowers/specs/2026-10-19-kids-accounts-design.md` (section "Clients" → "React live room", plus the anti-goals). Server contract consumed (the only source for field names and behaviour): section "Server API contract (consumed by client plans)" of `/Users/waliedothman/mariposa/coding/pente.org-project/pente.org/docs/superpowers/plans/2026-10-19-kids-accounts-server.md`.

**Repo / branch:** `/Users/waliedothman/mariposa/coding/pente.org-project/react_live_game_room`, branch `kids-accounts` (already created from `main` at `e64f042`). Abbreviated below as `$RX`; it is a placeholder, not an environment variable, so write the absolute path when running a command (the login shell is fish). This is the sibling repo; `pente.org/react-live-game-room/` is out of scope. Line numbers refer to `e64f042`; earlier tasks shift lines in the same file, so match on the quoted code.

**Baseline:** `npm test` on `e64f042` reports `Test Files  31 passed (31)`, `Tests  563 passed (563)`.

## Global Constraints

- Kid status comes **only** from `dsgLoginEvent.me.parentPid` (a JSON number, present only for a kid, omitted otherwise). Missing or `null` means not a kid. It is never in `dsgJoinMainRoomEvent.dsgPlayerData` or `dsgUpdatePlayerDataEvent.data`; never read it from there.
- No new inbound or outbound event types, no decoder changes. The server sends no refusal event for kid chat filtering (lobby/table text is filtered silently per recipient; the sender still gets its own echo).
- `dsgInviteTableEvent.inviteText` and `dsgInviteResponseTableEvent.responseText` may arrive as `""`; render an empty text with no "message:" header or quote.
- Management stays on the website. Link URL, verbatim: `https://www.pente.org/gameServer/myprofile/kids`. No account or kid-management UI in React.
- Copy, verbatim: chat hint `Only players your parent approved will see your messages.`; lobby link text `Kid accounts`.
- Client gating is cosmetic only (spec anti-goal: enforcement is server-side). Kid chat still sends on Enter; nothing is blocked client-side.
- Must work against a server without the feature (no `parentPid` → normal UI).
- Commits: `git -C $RX commit -S -m "…"`. No co-author, "Generated with" or similar trailer lines. Never commit `.env.local` or `.env.development`.
- Test runs: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run <file>`; full suite `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`. Scratch files go under `/private/tmp/claude-501/kids-react`, never inside the repo.
- Style: components, `rootReducer.js` and `utils.js` use 3-space indentation; `src/ui/**` and new `*.test.js` files use 2-space indentation. jsdom tests that import anything wrapped in `@mui/styles` `withStyles` need the `vi.hoisted` `CSS.escape` shim copied from `src/Components/Arena/__tests__/JoinRequestComponent.test.js:14-18`.

## Review Focus

1. **Old server / normal account: no `parentPid`.** Expected: `isKid` is `false` and the UI is unchanged (hint absent, invite fields present, link shown to non-guests). Pinned in Task 1 (`isKidLogin` with missing and `null`) and Task 2/3/4 non-kid render tests.
2. **Player-data refresh after login.** `dsgJoinMainRoomEvent` / `dsgUpdatePlayerDataEvent` for the kid's own name never carry `parentPid`. Expected: `isKid` stays `true`. Pinned in Task 1.
3. **Reconnect or a different login in the same tab.** Expected: socket close and `dsgLoginErrorEvent` reset `isKid` to `false` before the next login. Pinned in Task 1.
4. **Stripped invite text.** `inviteText` `""` or omitted. Expected: the invitation modal shows no "message:" header and no `undefined`. Pinned in Task 1 (reducer normalises to `''`) and Task 3 (render test).
5. **Kid presses Enter in chat.** Expected: the line is still sent (the server filters recipients); only the hint is added. Pinned in Task 2 (`onKeyDown` still fires in kid mode).
6. **Mid-session convert or release.** `state.isKid` changes only on `dsgLoginEvent`; the contract adds no status event. Expected: the kid UI is stale until the next login, while the server enforces at once. Accepted; no code (see Decisions).

## Decisions on spec gaps

- **"Handle `dsgTextTableErrorEvent` if the server sends one" (spec).** The server contract says no refusal event is sent for kid filtering and no new error codes exist, so no handler is added. The refusal the client does meet is server-stripped invite text (`""`), handled in Tasks 1 and 3.
- **Where the hint shows.** As the `helperText` of the existing chat `TextField`, in both the lobby (`Room`) and table (`Table`, which also covers arena tables). The arena lobby has no chat (`Pages/Arena.js` comments it out), so nothing changes there.
- **Who sees the "My kids" link.** React cannot tell a parent from any other account (the contract exposes only the kid flag), and any normal account can become a parent, so the link shows in the lobby to every logged-in non-guest who is not a kid. It opens the website page in a new tab. The link goes only in `Room.js`; players on an arena server never see it, because `App.js:29` renders `<Arena/>` instead of `<Room/>`. Acceptable: the spec only requires that React link to the website.
- **Invite text for kids.** Both text fields are hidden, even toward approved players (spec: "Invite text fields are hidden for kids"). No send-time guard is added: the modals' `message` state starts as `''` (`InviteModal.js:57`, `InvitationResponseModal.js:59`) and changes only through the hidden field's `onChange`, so hiding the field is what keeps the text empty. A kid still sees received invite text the server lets through.
- **Kid status is fixed at login.** The kid UI reflects status at login; a mid-session convert or release takes effect on the next login (the server enforces immediately). The contract has no status-change event, so no code is added.
- **Controller decisions D1-D3 (blocked players, composer, TB invitation text).** No React surface: the live room has no blocked-players screen or block buttons (D1: kids keep them where they exist), no message composer with autocomplete and no client-side send blocking (D2), and no turn-based invitation pages (D3 is server-side). Nothing to change here.
- **Selector.** `state.isKid` is a bare boolean read inline in `mapStateToProps`, per the `src/selectors/index.js` header rule (no pass-through selectors).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/ui/kidMode.js` | Create | `isKidLogin`, `KID_CHAT_HINT`, `KIDS_PAGE_URL`, `KIDS_LINK_TEXT` |
| `src/ui/__tests__/kidMode.test.js` | Create | Pure rule tests |
| `src/redux_reducers/rootReducer.js:69-87, 95-102` | Modify | `isKid: false` in `initialState`; set it on `dsgLoginEvent` |
| `src/redux_reducers/utils.js:526-531` | Modify | `invitationReceived` normalises missing text to `''` |
| `src/redux_reducers/__tests__/kidMode.test.js` | Create | Login, reset, refresh, invite-text reducer tests |
| `src/Components/Chat/ChatInput.js` | Modify | `kidMode` prop → hint |
| `src/Components/Chat/ChatComponent.js:18, 35, 43-54` | Modify | Forward `kidMode` |
| `src/Components/Chat/__tests__/ChatInput.test.js` | Create | Hint render + Enter still fires |
| `src/Pages/Room.js` | Modify | Pass `kidMode`; "Kid accounts" link (Task 4) |
| `src/Pages/Table.js:30-38, 51, 119-120` | Modify | Pass `kidMode` |
| `src/Components/Table/InviteModal.js` | Modify | Hide text field and send `''` for kids |
| `src/Components/Room/InvitationResponseModal.js` | Modify | Hide reply field and send `''` for kids |
| `src/Components/__tests__/kidInvites.test.js` | Create | Both modals, kid and non-kid |
| `src/Pages/__tests__/kidLobby.test.js` | Create | Lobby hint and link visibility |

---

### Task 1: Kid flag in state and stripped-invite-text normalisation

**Files:**
- Create: `$RX/src/ui/kidMode.js`
- Modify: `$RX/src/redux_reducers/rootReducer.js:69-87` (`initialState`), `:95-102` (`dsgLoginEvent`)
- Modify: `$RX/src/redux_reducers/utils.js:526-531` (`invitationReceived`)
- Test: `$RX/src/ui/__tests__/kidMode.test.js` (create)
- Test: `$RX/src/redux_reducers/__tests__/kidMode.test.js` (create)

**Interfaces:**
- Consumes: inbound action `{type: 'dsgLoginEvent', payload: {player, me: {admin, subscriberLevel, parentPid?}, serverData}}` (existing decoder, unchanged).
- Produces:
  - `src/ui/kidMode.js` exports `isKidLogin(me: object | undefined) → boolean` (true iff `me` is an object and `me.parentPid` is neither `undefined` nor `null`), `KID_CHAT_HINT = 'Only players your parent approved will see your messages.'`, `KIDS_PAGE_URL = 'https://www.pente.org/gameServer/myprofile/kids'`, `KIDS_LINK_TEXT = 'Kid accounts'`.
  - `state.isKid: boolean`, `false` in `initialState`, set only by `dsgLoginEvent`.
  - `state.received_invitation.message` is always a string (`''` when the server sent `""` or omitted `inviteText`).

- [ ] **Step 1: Write the failing pure-rule test**

Create `$RX/src/ui/__tests__/kidMode.test.js`:

```js
import { describe, test, expect } from 'vitest';
import { isKidLogin, KID_CHAT_HINT, KIDS_PAGE_URL, KIDS_LINK_TEXT } from '../kidMode';

describe('isKidLogin — kid status from the login echo only', () => {
  test('a numeric parentPid means kid', () => {
    expect(isKidLogin({ parentPid: 23000000012345 })).toBe(true);
  });
  test('missing parentPid (normal account, or a server without the feature) is not a kid', () => {
    expect(isKidLogin({ admin: false })).toBe(false);
  });
  test('null parentPid is not a kid', () => {
    expect(isKidLogin({ parentPid: null })).toBe(false);
  });
  test('missing me is not a kid', () => {
    expect(isKidLogin(undefined)).toBe(false);
  });
  test('copy and link are the contract values', () => {
    expect(KID_CHAT_HINT).toBe('Only players your parent approved will see your messages.');
    expect(KIDS_PAGE_URL).toBe('https://www.pente.org/gameServer/myprofile/kids');
    expect(KIDS_LINK_TEXT).toBe('Kid accounts');
  });
});
```

- [ ] **Step 2: Write the failing reducer tests**

Create `$RX/src/redux_reducers/__tests__/kidMode.test.js`:

```js
import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';

const init = () => liveGameApp(undefined, { type: '@@INIT' });
const dispatch = (state, type, payload) => liveGameApp(state, { type, payload });
const login = (me) => dispatch(init(), 'dsgLoginEvent', {
  player: 'kid_one', me: { admin: false, subscriberLevel: 0, ...me }, serverData: { tournament: false, arena: false },
});

describe('kid flag from dsgLoginEvent', () => {
  test('initial state is not a kid', () => {
    expect(init().isKid).toBe(false);
  });
  test('login with me.parentPid sets isKid', () => {
    expect(login({ parentPid: 23000000012345 }).isKid).toBe(true);
  });
  test('login without parentPid leaves isKid false', () => {
    expect(login({}).isKid).toBe(false);
  });
  test('own player-data refreshes after login (no parentPid on the wire) keep isKid', () => {
    let s = login({ parentPid: 23000000012345 });
    s = dispatch(s, 'dsgJoinMainRoomEvent', { dsgPlayerData: { name: 'kid_one', subscriberLevel: 0, gameData: [] } });
    s = dispatch(s, 'dsgUpdatePlayerDataEvent', { data: { name: 'kid_one', subscriberLevel: 0, gameData: [] } });
    expect(s.isKid).toBe(true);
  });
  test('socket close resets isKid', () => {
    expect(dispatch(login({ parentPid: 1 }), 'REDUX_WEBSOCKET::CLOSED').isKid).toBe(false);
  });
  test('dsgLoginErrorEvent resets isKid', () => {
    expect(dispatch(login({ parentPid: 1 }), 'dsgLoginErrorEvent', {}).isKid).toBe(false);
  });
});

describe('server-stripped invite text', () => {
  // keep the 'game server' user: invitationReply posts its notice as that user
  const withBob = () => { const s = init(); return { ...s, me: 'kid_one', users: { ...s.users, bob: { muted: false } } }; };

  test('omitted inviteText becomes an empty message', () => {
    const s = dispatch(withBob(), 'dsgInviteTableEvent', { player: 'bob', toInvite: 'kid_one', table: 3 });
    expect(s.received_invitation).toEqual({ by: 'bob', message: '', table: 3 });
  });
  test('empty inviteText stays empty', () => {
    const s = dispatch(withBob(), 'dsgInviteTableEvent', { player: 'bob', toInvite: 'kid_one', inviteText: '', table: 3 });
    expect(s.received_invitation.message).toBe('');
  });
  test('empty responseText adds no "Their message" line', () => {
    const s = dispatch(withBob(), 'dsgInviteResponseTableEvent', { player: 'bob', toPlayer: 'kid_one', accept: false, responseText: '', table: 3 });
    expect(s.room_messages.at(-1).message).toBe('bob declined your invitation.');
  });
});
```

(`addRoomMessage`, `utils.js:42-54`, stores each line as `{message, player, time}`.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/ui/__tests__/kidMode.test.js src/redux_reducers/__tests__/kidMode.test.js`
Expected: FAIL. `Failed to resolve import "../kidMode"` for the ui test; reducer tests fail on `isKid` `undefined` and on `message: undefined` (the omitted-`inviteText` test). Two reducer tests already pass and pin existing behaviour: `'empty inviteText stays empty'` (`invitationReceived` stores `''` unchanged, `utils.js:528-529`) and the `responseText` test.

- [ ] **Step 4: Create `src/ui/kidMode.js`**

Exports exactly as in the Interfaces block, with a short header comment saying kid status is read from the login echo only and that the UI here is cosmetic (the server enforces).

- [ ] **Step 5: Set the flag in the reducer**

In `rootReducer.js`: add `isKid: false,` to `initialState` (after `logged_in: false,`), import `isKidLogin` from `'../ui/kidMode'`, and in the `dsgLoginEvent` handler add `s.isKid = isKidLogin(p.me);`. Do not touch `processUser` or the player-data handlers.

- [ ] **Step 6: Normalise invite text**

In `utils.js` `invitationReceived`, replace `message: data.inviteText` with `message: data.inviteText || ''`.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/ui/__tests__/kidMode.test.js src/redux_reducers/__tests__/kidMode.test.js`
Expected: PASS (5 + 9 tests).

- [ ] **Step 8: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`
Expected: `Test Files  33 passed (33)`, 0 failed.

- [ ] **Step 9: Commit**

```bash
git -C $RX add src/ui/kidMode.js src/ui/__tests__/kidMode.test.js src/redux_reducers/rootReducer.js src/redux_reducers/utils.js src/redux_reducers/__tests__/kidMode.test.js
git -C $RX commit -S -m "feat(kids): read kid status from the login echo; normalise stripped invite text"
```

---

### Task 2: Kid-mode chat hint in lobby and table

**Files:**
- Modify: `$RX/src/Components/Chat/ChatInput.js:5-24`
- Modify: `$RX/src/Components/Chat/ChatComponent.js:18, 35, 43-54`
- Modify: `$RX/src/Pages/Room.js:17-29` (`mapStateToProps`), `:78` (destructure), `:101-102` (`ChatComponent`)
- Modify: `$RX/src/Pages/Table.js:30-38` (`mapStateToProps`), `:51` (destructure), `:119-120` (`ChatComponent`)
- Test: `$RX/src/Components/Chat/__tests__/ChatInput.test.js` (create, jsdom)

**Interfaces:**
- Consumes: `state.isKid: boolean` and `KID_CHAT_HINT` from `src/ui/kidMode.js` (Task 1).
- Produces:
  - `ChatInput` props `{sendHandler: func (required), kidMode?: bool}`; when `kidMode` is true the `TextField` gets `helperText={KID_CHAT_HINT}`; label `Talk here!`, placeholder and `onKeyDown={sendHandler}` unchanged.
  - `ChatComponent` accepts `kidMode?: bool` (propTypes `PropTypes.bool`) and passes it to `ChatInput`.
  - `Room` and `Table` map `isKid: state.isKid` and render `<ChatComponent … kidMode={isKid}/>`.

- [ ] **Step 1: Write the failing test**

Create `$RX/src/Components/Chat/__tests__/ChatInput.test.js` (`// @vitest-environment jsdom`, `act` + `createRoot` as in `JoinRequestComponent.test.js`). Tests:

- `'kid mode shows the approved-players hint'`: render `<ChatInput sendHandler={() => {}} kidMode/>`; `expect(container.textContent).toContain(KID_CHAT_HINT)`.
- `'normal mode shows no hint'`: render without `kidMode`; `expect(container.textContent).not.toContain(KID_CHAT_HINT)`.
- `'Enter still reaches the send handler in kid mode'`: `const send = vi.fn()`; render with `kidMode`; dispatch a `keydown` `{key: 'Enter', bubbles: true}` on `container.querySelector('input')` inside `act`; `expect(send).toHaveBeenCalledTimes(1)`.
- `'ChatComponent forwards kidMode'`: with the `CSS.escape` shim and a `legacy_createStore(() => ({users: {}, tables: {}, me: 'kid_one', admin: false}))` `Provider`, render `<ChatComponent messages={[]} players={[]} sendText={() => {}} kidMode/>`; expect the hint text.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Components/Chat/__tests__/ChatInput.test.js`
Expected: FAIL on the two hint-present tests (`expected '…' to contain 'Only players your parent approved…'`); the other two pass.

- [ ] **Step 3: Implement**

`ChatInput`: add `helperText={props.kidMode ? KID_CHAT_HINT : undefined}` and the `kidMode: PropTypes.bool` propType. `ChatComponent`: destructure `kidMode`, pass `kidMode={kidMode}`, add the propType. `Room` and `Table`: add `isKid: state.isKid` to `mapStateToProps`, destructure it, pass `kidMode={isKid}` to `ChatComponent`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Components/Chat/__tests__/ChatInput.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Check both mounts are wired**

Run: `grep -n "kidMode={isKid}" $RX/src/Pages/Room.js $RX/src/Pages/Table.js`
Expected: one hit in each file.

- [ ] **Step 6: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`
Expected: `Test Files  34 passed (34)`, 0 failed.

- [ ] **Step 7: Commit**

```bash
git -C $RX add src/Components/Chat/ChatInput.js src/Components/Chat/ChatComponent.js src/Components/Chat/__tests__/ChatInput.test.js src/Pages/Room.js src/Pages/Table.js
git -C $RX commit -S -m "feat(kids): approved-players hint on lobby and table chat input"
```

---

### Task 3: Hide invite text fields for kids

**Files:**
- Modify: `$RX/src/Components/Table/InviteModal.js:35-41` (`mapStateToProps`), `:54`, `:59-69` (`invite`), `:84-98` (`TextField`)
- Modify: `$RX/src/Components/Room/InvitationResponseModal.js:34-41` (`mapStateToProps`), `:57`, `:61-68` (`reply`), `:101-115` (`TextField`)
- Test: `$RX/src/Components/__tests__/kidInvites.test.js` (create, jsdom)

**Interfaces:**
- Consumes: `state.isKid` (Task 1); `state.received_invitation = {by, message: string, table}` with `message` always a string (Task 1).
- Produces: both modals map `isKid: state.isKid`. When `isKid` is true the "add message" `TextField` is not rendered; the send code is unchanged. Non-kid behaviour unchanged. The existing `invitation.message !== ''` guard keeps the "message:" header hidden for stripped text.

- [ ] **Step 1: Write the failing tests**

Create `$RX/src/Components/__tests__/kidInvites.test.js` with the `CSS.escape` shim. Build the store with a recording reducer: `legacy_createStore((s = state, a) => { actions.push(a); return s; })`. Users are real `User` instances: `new User({name, subscriberLevel: 0, gameData: [], name_color: 0})` (from `src/Classes/UserClass`). MUI `Modal` portals into `document.body`, so query `document.body`. Find sent frames with `actions.filter(a => a.payload && a.payload.dsgInviteResponseTableEvent)` (and `dsgInviteTableEvent`).

- `'response modal: kid sees no reply field and declines with empty text'`: state `{me: 'kid_one', isKid: true, table: undefined, users: {bob}, received_invitation: {by: 'bob', message: 'hi', table: 3}}`; expect no `input` in `document.body`; click the `Decline` button; expect the `dsgInviteResponseTableEvent` frame's `responseText` toBe `''`.
- `'response modal: normal player keeps the reply field'`: same with `isKid: false`; expect one `input` with placeholder `optional reply message`.
- `'response modal: stripped invite text shows no message header'`: `isKid: true`, `message: ''`; expect `document.body.textContent` not to contain `message:`.
- `'invite modal: kid sees no message field and invites with empty text'`: render `<InviteModal open dismiss={() => {}}/>` with state `{me: 'kid_one', isKid: true, table: 3, tables: {}, users: {kid_one, bob}}`; expect no `input[placeholder="optional message"]`; click the `bob` radio (`input[type="radio"]`), then the button whose text starts with `invite`; expect the `dsgInviteTableEvent` frame's `inviteText` toBe `''`.
- `'invite modal: normal player keeps the message field'`: `isKid: false`; expect `input[placeholder="optional message"]` present.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Components/__tests__/kidInvites.test.js`
Expected: FAIL on the two kid tests that expect no field (an `input` is found); the normal-player and header tests pass.

- [ ] **Step 3: Implement**

In each modal: map `isKid: state.isKid`, destructure it, and render the "add message" `TextField` only when `!isKid`. Do not touch `invite`/`reply` (no `isKid ? '' : message` ternary; the hidden field already leaves `message` at `''`). The kid tests' `responseText`/`inviteText` `''` assertions are regression pins, not proof of a guard.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Components/__tests__/kidInvites.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`
Expected: `Test Files  35 passed (35)`, 0 failed.

- [ ] **Step 6: Commit**

```bash
git -C $RX add src/Components/Table/InviteModal.js src/Components/Room/InvitationResponseModal.js src/Components/__tests__/kidInvites.test.js
git -C $RX commit -S -m "feat(kids): hide invite and reply text fields for kid accounts"
```

---

### Task 4: Lobby link to the website "My kids" page

**Files:**
- Modify: `$RX/src/Pages/Room.js:104-112` (right-hand column, under the "create new table" `Fab`)
- Test: `$RX/src/Pages/__tests__/kidLobby.test.js` (create, jsdom)

**Interfaces:**
- Consumes: `state.isKid`, `KIDS_PAGE_URL`, `KIDS_LINK_TEXT`, `KID_CHAT_HINT` (Task 1); `isGuestName` from `src/selectors` (already imported in `Room.js:15`); `Room` already maps `isKid` (Task 2).
- Produces: when `!isKid && !isGuestName(me)`, `Room` renders an MUI `Link` (`@mui/material/Link`) with `href={KIDS_PAGE_URL}`, `target="_blank"`, `rel="noopener noreferrer"`, text `KIDS_LINK_TEXT`, placed after the `<br/>` that follows the `Fab` (shown in tournament rooms too).

- [ ] **Step 1: Write the failing test**

Create `$RX/src/Pages/__tests__/kidLobby.test.js` with the `CSS.escape` shim. Render the default export of `../Room` inside a `Provider` over a static store: `{users: {}, connected: true, logged_in: true, room_messages: [], tables: {}, me, isKid, admin: false, tournament: false, freeloader: false}`. `link = () => container.querySelector('a[href="https://www.pente.org/gameServer/myprofile/kids"]')`.

- `'non-kid player sees the Kid accounts link, opening in a new tab'`: `me: 'graviton', isKid: false`; `expect(link().textContent).toBe('Kid accounts')`; `expect(link().getAttribute('target')).toBe('_blank')`.
- `'kid sees the chat hint and no link'`: `me: 'kid_one', isKid: true`; `expect(link()).toBeNull()`; `expect(container.textContent).toContain(KID_CHAT_HINT)`.
- `'guest sees no link'`: `me: 'guest123', isKid: false`; `expect(link()).toBeNull()`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Pages/__tests__/kidLobby.test.js`
Expected: FAIL on the non-kid test (`link()` is `null`); the kid and guest tests pass.

- [ ] **Step 3: Implement the link in `Room.js`** as described in Interfaces.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npx vitest run src/Pages/__tests__/kidLobby.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`
Expected: `Test Files  36 passed (36)`, 0 failed.

- [ ] **Step 6: Commit**

```bash
git -C $RX add src/Pages/Room.js src/Pages/__tests__/kidLobby.test.js
git -C $RX commit -S -m "feat(kids): link the lobby to the website kid accounts page"
```

---

### Task 5: Build and end-to-end check

**Files:** none changed (verification only).

**Interfaces:**
- Consumes: Tasks 1-4; for the live check, a local `pente.org` stack running the `kids-accounts` server branch (server plan Tasks 1-12 deployed with `justCompile`; Task 12 is the website "My kids" page) and a kid account created from that page by a parent whose email is verified (`create`/`convert` need `email_valid=Y`). Alternative without the page: an app-style `POST /gameServer/kids` with `name2`/`password2`, `action=create`, `kidName`, `kidPassword`, then `action=whitelistAdd` with `kidPid` and `playerName` for the approved player (app-style POSTs are not origin-checked; a cookie POST from outside the page gets 403 `Request origin not allowed`).
- Produces: evidence lines for the final report.

- [ ] **Step 1: Full suite**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm test`
Expected: `Test Files  36 passed (36)`, 0 failed.

- [ ] **Step 2: Production build**

Run: `cd $RX && TMPDIR=/private/tmp/claude-501/kids-react npm run build`
Expected: build completes with no errors. Then `rm -rf $RX/build` (regenerable output; do not commit it).

- [ ] **Step 3: Live check against the local stack (only if the server branch is running locally)**

Start with `PUBLIC_LOCAL_BACKEND=1` set in `$RX/.env.local` (never commit it) and `npm start`, logged in as the kid via the `REACT_APP_USERNAME`/`REACT_APP_PASSWORD` dev fallback; a second instance (different env creds) logs in as a non-approved normal player. Confirm:
- kid lobby and table chat show `Only players your parent approved will see your messages.`; kid lobby shows no "Kid accounts" link; the normal player's lobby shows it and it opens `https://www.pente.org/gameServer/myprofile/kids`;
- the normal player's lobby line does not appear for the kid, and the kid's line does not appear for the normal player, while each sees its own echo;
- the normal player invites the kid with text: the kid's modal shows the invitation with no "message:" header; the kid's modal has no reply field.
If the server branch is not running locally, skip this step and report "live E2E not run: server kids-accounts not deployed locally".

- [ ] **Step 4: Workspace tidy**

Run: `git -C $RX status --porcelain`
Expected: no `??` entries other than files this plan committed (none should remain), and `.env.local` / `.env.development` unchanged in the index.

---

## Self-review notes (writer)

- **Spec coverage (React live room bullets):** management stays on the website + link → Task 4; `isKid` from `dsgLoginEvent me.parentPid` → Task 1; chat input hint → Task 2; invite text fields hidden → Task 3; `dsgTextTableErrorEvent` → settled (contract sends none), stripped invite text handled in Tasks 1 and 3. Anti-goal "client-only hiding is a failure" → Global Constraints (client is cosmetic; Enter still sends, Task 2). "Apps must work against a server without the feature" → Review Focus 1, Task 1.
- **Contract names used:** `parentPid` (login echo only), `inviteText`, `responseText`, `https://www.pente.org/gameServer/myprofile/kids`. No `/gameServer/kids` call is made from React (management is on the website), so none of its responses are consumed here: not the 401 JSON / HTML-login-page auth split, the same-origin 403, the neutral `convert` success body, or `parentName`-plus-whitelist composer suggestions. Re-checked against the revised server contract (2026-10-19): its live-room section is unchanged, so this plan needs no protocol change.
- **Type consistency:** `isKidLogin`, `KID_CHAT_HINT`, `KIDS_PAGE_URL`, `KIDS_LINK_TEXT`, `state.isKid`, `kidMode` prop are named identically in every task.
