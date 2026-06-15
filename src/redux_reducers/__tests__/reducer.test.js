// Reducer registry characterization tests — newly possible because the side-effects
// (module-scope Audio) moved behind the AudioService seam, so the reducer/utils import
// cleanly in node. This is the headline win of Candidate 6: a safety net over the
// inbound event handlers.
import { describe, test, expect } from 'vitest';
import liveGameApp from '../rootReducer';
import { MODALS, openModal, closeModal, toggleModal, isModalOpen, modalProps } from '../../ui/modals';

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

describe('discretionary modals route through the modal seam', () => {
  test('initial state starts with an empty modals map', () => {
    expect(init().modals).toEqual({});
  });

  test('toggleModal(SETTINGS) opens then closes through liveGameApp', () => {
    const opened = liveGameApp(init(), toggleModal(MODALS.SETTINGS));
    expect(isModalOpen(opened, MODALS.SETTINGS)).toBe(true);
    const closed = liveGameApp(opened, toggleModal(MODALS.SETTINGS));
    expect(isModalOpen(closed, MODALS.SETTINGS)).toBe(false);
  });

  test('openModal(BOOT, player) carries the target; closeModal clears it', () => {
    const opened = liveGameApp(init(), openModal(MODALS.BOOT, 'victim'));
    expect(opened.modals).toEqual({ boot: 'victim' }); // raw slice, characterized independently of the selector
    expect(modalProps(opened, MODALS.BOOT)).toBe('victim');
    const closed = liveGameApp(opened, closeModal(MODALS.BOOT));
    expect(closed.modals).toEqual({}); // key removed, not a false tombstone
    expect(modalProps(closed, MODALS.BOOT)).toBeUndefined();
  });

  test('opening one modal leaves the others untouched', () => {
    let s = liveGameApp(init(), toggleModal(MODALS.SETTINGS));
    s = liveGameApp(s, openModal(MODALS.BOOT, 'victim'));
    expect(isModalOpen(s, MODALS.SETTINGS)).toBe(true);
    expect(modalProps(s, MODALS.BOOT)).toBe('victim');
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
