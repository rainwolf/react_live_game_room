// Reducer registry characterization tests — newly possible because the side-effects
// (module-scope Audio) moved behind the AudioService seam, so the reducer/utils import
// cleanly in node. This is the headline win of Candidate 6: a safety net over the
// inbound event handlers.
import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';

const init = () => liveGameApp(undefined, { type: '@@INIT' });
const dispatch = (state, type, payload) => liveGameApp(state, { type, payload });

describe('reducer imports & base state (proves the node-import unblock)', () => {
  test('produces a sane initial state', () => {
    const s = init();
    expect(s.connected).toBe(false);
    expect(s.logged_in).toBe(false);
    expect(s.pendingNotifications).toEqual([]);
    expect(s.users['game server']).toBeDefined();
  });
});

describe('inbound event registry', () => {
  test('dsgLoginEvent sets identity', () => {
    const s = dispatch(init(), 'dsgLoginEvent', {
      player: 'bob',
      me: { admin: true, subscriberLevel: 0 },
      serverData: { tournament: false, arena: false },
    });
    expect(s.me).toBe('bob');
    expect(s.admin).toBe(true);
    expect(s.logged_in).toBe(true);
    expect(s.freeloader).toBe(true);
  });

  test('dsgLoginErrorEvent resets to initial state', () => {
    const dirty = { ...init(), me: 'bob', logged_in: true };
    const s = dispatch(dirty, 'dsgLoginErrorEvent', {});
    expect(s.logged_in).toBe(false);
    expect(s.me).toBeUndefined();
  });

  test('cancelReply (the regression-prone inbound) clears cancel_requested + posts a message', () => {
    const base = { ...init(), table: 1, cancel_requested: 'someone', table_messages: [] };
    const s = dispatch(base, 'dsgCancelReplyTableEvent', { accepted: true, player: 'y', table: 1 });
    expect(s.cancel_requested).toBeUndefined();
    expect(s.table_messages.at(-1).message).toBe('set cancellation accepted');
  });

  test('an unknown action type is a harmless no-op', () => {
    const base = init();
    const s = dispatch(base, 'dsgSomeFutureEvent', { table: 1 });
    expect(s.users).toEqual(base.users);
  });
});

describe('notifications are pure intents (no Audio touched)', () => {
  test('a new lobby user emits a newPlayer sound intent', () => {
    const s = dispatch(init(), 'dsgJoinMainRoomEvent', {
      dsgPlayerData: { name: 'alice', subscriberLevel: 0, gameData: [], name_color: 0 },
    });
    expect(s.users.alice).toBeDefined();
    expect(s.pendingNotifications).toContainEqual({ sound: 'newPlayer' });
  });

  test('game-over sets a typed gameResult notification (not a bare string)', () => {
    // changeGameState requires a started game on the current table; set minimal game state
    const base = init();
    const started = dispatch(
      { ...base, table: 1, tables: { 1: makeTable(1) }, game: makeGame() },
      'dsgGameStateTableEvent',
      { state: 2, winner: 'bob', table: 1 }
    );
    expect(started.notification).toEqual({ kind: 'gameResult', winner: 'bob' });
  });

  test('CLEAR_NOTIFICATIONS empties the queue', () => {
    const s = dispatch({ pendingNotifications: [{ sound: 'move' }] }, 'CLEAR_NOTIFICATIONS');
    expect(s.pendingNotifications).toEqual([]);
  });

  test('REMOVE_SNACK clears the typed notification', () => {
    const s = dispatch({ notification: { kind: 'info', message: 'x' } }, 'REMOVE_SNACK');
    expect(s.notification).toBeUndefined();
  });
});

// --- minimal domain fixtures (the Classes import cleanly in node) ---
import { Game } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';

function makeGame() {
  const g = new Game();
  g.setGame(1);
  return g;
}
function makeTable(num) {
  return new Table({ table: num });
}
