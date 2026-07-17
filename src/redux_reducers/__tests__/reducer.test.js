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

  // Draw endings (double-pass or accepted draw offer): the backend's DSGGameStateTableEvent
  // carries no structural draw flag (checked dsg_src/.../event/DSGGameStateTableEvent.java —
  // only state/changeText/winner/gameInSet/drawOfferedBy exist on the wire), and it still sends
  // a non-empty `winner` name even on a draw. The only draw signal is changeText === "game over,
  // game is a draw" (dsg_src/.../server/ServerTable.java). So detection here is a changeText match.
  test('game-over draw sets an info notification, not gameResult (even though winner is present)', () => {
    const base = init();
    const started = dispatch(
      { ...base, table: 1, tables: { 1: makeTable(1) }, game: makeGame() },
      'dsgGameStateTableEvent',
      { state: 2, winner: 'bob', changeText: 'game over, game is a draw', table: 1 }
    );
    expect(started.notification).toEqual({ kind: 'info', message: 'Game over — draw' });
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

// --- renju draw-offer lifecycle (Task 2) ---
// Brief's harness used reduce(baseRenjuState(...), action); adapted here to the file's
// real liveGameApp reducer + Game/Table fixtures. Renju game type is 31 (isRenjuGame),
// game starts NOT_STARTED so a state:2 event is a real transition. Assertions are the
// brief's intent, unchanged.
const reduce = (state, action) => liveGameApp(state, action);
function makeRenjuGame() {
  const g = new Game();
  g.setGame(31); // 31/32/81 => isRenjuGame()
  return g;
}
function baseRenjuState(me) {
  return {
    ...init(),
    me,
    table: 1,
    tables: { 1: makeTable(1) },
    game: makeRenjuGame(),
    table_messages: [],
  };
}

describe('renju draw offers', () => {
  test('opponent move drawOffer sets draw_requested', () => {
    const s = reduce(baseRenjuState('bob'), {
      type: 'dsgMoveTableEvent',
      payload: { move: 100, moves: [100], player: 'alice', table: 1, drawOffer: true },
    });
    expect(s.draw_requested).toBe('alice');
  });

  test('own move echo drawOffer flips armed -> pending', () => {
    const s0 = { ...baseRenjuState('bob'), draw_armed: true };
    const s = reduce(s0, {
      type: 'dsgMoveTableEvent',
      payload: { move: 100, moves: [100], player: 'bob', table: 1, drawOffer: true },
    });
    expect(s.draw_armed).toBeUndefined();
    expect(s.draw_pending).toBe(true);
  });

  test('own move without drawOffer implicitly declines a pending request', () => {
    const s0 = { ...baseRenjuState('bob'), draw_requested: 'alice' };
    const s = reduce(s0, {
      type: 'dsgMoveTableEvent',
      payload: { move: 100, moves: [100], player: 'bob', table: 1 },
    });
    expect(s.draw_requested).toBeUndefined();
  });

  test('renjuAcceptDraw clears all three draw flags', () => {
    const s0 = { ...baseRenjuState('bob'), draw_requested: 'alice', draw_armed: true, draw_pending: true };
    const s = reduce(s0, {
      type: 'dsgRenjuAcceptDrawTableEvent',
      payload: { player: 'alice', table: 1 },
    });
    expect(s.draw_requested).toBeUndefined();
    expect(s.draw_pending).toBeUndefined();
    expect(s.draw_armed).toBeUndefined();
  });

  test('renjuRejectDraw notifies the offerer only when draw_pending was set', () => {
    const pending = reduce({ ...baseRenjuState('bob'), draw_pending: true }, {
      type: 'dsgRenjuRejectDrawTableEvent',
      payload: { player: 'alice', table: 1 },
    });
    expect(pending.notification).toEqual({ kind: 'info', message: 'Draw offer declined' });
    expect(pending.draw_pending).toBeUndefined();

    const asOpponent = reduce({ ...baseRenjuState('bob'), draw_requested: 'alice' }, {
      type: 'dsgRenjuRejectDrawTableEvent',
      payload: { player: 'bob', table: 1 },
    });
    expect(asOpponent.notification).toBeUndefined();
    expect(asOpponent.draw_requested).toBeUndefined();
  });

  test('changeGameState restores draw state from drawOfferedBy on rejoin', () => {
    const s = reduce(baseRenjuState('bob'), {
      type: 'dsgGameStateTableEvent',
      payload: { table: 1, state: 2, drawOfferedBy: 'alice' },
    });
    expect(s.draw_requested).toBe('alice');
    const s2 = reduce(baseRenjuState('bob'), {
      type: 'dsgGameStateTableEvent',
      payload: { table: 1, state: 2, drawOfferedBy: 'bob' },
    });
    expect(s2.draw_pending).toBe(true);
  });

  test('changeGameState clears stale draw flags on a state transition', () => {
    const s0 = { ...baseRenjuState('bob'), draw_requested: 'alice', draw_armed: true, draw_pending: true };
    const s = reduce(s0, {
      type: 'dsgGameStateTableEvent',
      payload: { table: 1, state: 2 },
    });
    expect(s.draw_requested).toBeUndefined();
    expect(s.draw_armed).toBeUndefined();
    expect(s.draw_pending).toBeUndefined();
  });

  test('ARM_DRAW_OFFER / DISARM_DRAW_OFFER toggle draw_armed', () => {
    const armed = reduce(baseRenjuState('bob'), { type: 'ARM_DRAW_OFFER' });
    expect(armed.draw_armed).toBe(true);
    const disarmed = reduce(armed, { type: 'DISARM_DRAW_OFFER' });
    expect(disarmed.draw_armed).toBeUndefined();
  });

  test('DISMISS_DRAW_MODAL clears draw_requested', () => {
    const s = reduce({ ...baseRenjuState('bob'), draw_requested: 'alice' }, { type: 'DISMISS_DRAW_MODAL' });
    expect(s.draw_requested).toBeUndefined();
  });
});
