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
