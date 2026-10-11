// Arena join requests are server-driven (spec 2026-10-10). These pin the pure reducer side:
// the owner's snapshot record and in-flight accept/decline marker, and (Task 4) the
// requester's request set, in-flight taps and end notices.
import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';
import Table from '../../Classes/TableClass';
import { ARENA_OWNER_ACTION_SENT, ARENA_REQUEST_SENT } from '../../redux_actions/actionTypes';
import { selectArenaJoinRequests, selectArenaOwnerPending } from '../../selectors';
import { MODALS, openModal, modalProps } from '../../ui/modals';

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
