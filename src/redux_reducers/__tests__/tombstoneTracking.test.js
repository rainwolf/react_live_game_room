import { describe, test, expect } from 'vitest';
import { addMove, tombstoneSkipDead, undoReply } from '../utils';
import liveGameApp from '../rootReducer';
import { Game, GameState } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';
import { tombstoneMarkPending } from '../../ui/tombstoneUi';

function tsState() {
  const g = new Game(); g.setGame(33); g.gameState.state = GameState.State.STARTED;
  const t = new Table({ table: 5, initialMinutes: 10 }); t.me = 'alice';
  return { game: g, tables: { 5: t }, table: 5, me: 'alice', pendingNotifications: [],
    users: { 'game server': { muted: false } }, table_messages: [] }; // undoReply posts a table message
}
const move = (s, m, player = 'bob') => addMove({ table: 5, move: m, moves: [m], player }, s);
const bulk = (s, arr) => addMove({ table: 5, move: arr[arr.length - 1], moves: arr, player: 'srv' }, s);
const phase = (s) => s.game.tombstonePhaseNow();

describe('incremental tracking', () => {
  test('centre -> P2 OWN; own -> DEAD; dead -> P1 OWN', () => {
    const s = tsState();
    move(s, 180, 'alice'); expect(phase(s)).toEqual({ player: 2, phase: 'OWN' });
    move(s, 100);          expect(phase(s)).toEqual({ player: 2, phase: 'DEAD' });
    move(s, 361);          expect(phase(s)).toEqual({ player: 1, phase: 'OWN' });
  });
  test('own pass also opens DEAD', () => {
    const s = tsState(); move(s, 180, 'alice'); move(s, 722);
    expect(phase(s)).toEqual({ player: 2, phase: 'DEAD' });
  });
  test('skip echo closes the turn and sounds for the opponent only', () => {
    const s = tsState(); move(s, 180, 'alice'); move(s, 100);
    s.pendingNotifications = [];
    tombstoneSkipDead({ table: 5, player: 'bob', silent: false }, s);
    expect(phase(s)).toEqual({ player: 1, phase: 'OWN' });
    expect(s.pendingNotifications).toEqual([{ sound: 'move' }]);
  });
  test('the previous game instance is not mutated', () => {
    const s = tsState(); move(s, 180, 'alice'); move(s, 100);
    const before = s.game;
    tombstoneSkipDead({ table: 5, player: 'bob', silent: false }, s);
    expect(before.gameState.tombstone.trailingClosed).toBe(false);
  });
});

describe('rejoin (bulk) tracking', () => {
  test('bulk of only the centre -> P2 OWN', () => {
    const s = tsState(); bulk(s, [180]);
    expect(phase(s)).toEqual({ player: 2, phase: 'OWN' });
  });
  test('bulk ending in an own entry -> DEAD pending by default', () => {
    const s = tsState(); bulk(s, [180, 100, 361, 722]);
    expect(phase(s)).toEqual({ player: 1, phase: 'DEAD' });
  });
  test('silent skip after the bulk list corrects it, without a sound', () => {
    // the opponent (not state.me) is the last mover, so only data.silent can suppress the sound
    const s = tsState(); bulk(s, [180, 100]);
    s.pendingNotifications = [];
    tombstoneSkipDead({ table: 5, player: 'bob', silent: true }, s);
    expect(phase(s)).toEqual({ player: 1, phase: 'OWN' });
    expect(s.pendingNotifications).toEqual([]);
  });
  test('bulk ending in a dead entry -> OWN', () => {
    const s = tsState(); bulk(s, [180, 100, 361]);
    expect(phase(s)).toEqual({ player: 1, phase: 'OWN' });
  });
});

describe('undo', () => {
  test('accepted undo removes the whole last turn', () => {
    const s = tsState(); [180, 100, 361].forEach((m) => move(s, m));
    undoReply({ table: 5, accepted: true, player: 'alice' }, s);
    expect(s.game.moves).toEqual([180]);
    expect(phase(s)).toEqual({ player: 2, phase: 'OWN' });
  });
});

describe('rootReducer wiring', () => {
  test('skip event routed, slice present and cleared by the echo', () => {
    let s = liveGameApp(undefined, { type: '@@INIT' });
    expect(s.tombstoneUi).toEqual({ pending: false });
    s = { ...s, ...tsState() };
    move(s, 180, 'alice'); move(s, 100);
    s = liveGameApp(s, tombstoneMarkPending());
    expect(s.tombstoneUi.pending).toBe(true);
    s = liveGameApp(s, { type: 'dsgTombstoneSkipDeadTableEvent', payload: { table: 5, player: 'bob', silent: false } });
    expect(s.tombstoneUi.pending).toBe(false);
    expect(s.game.gameState.tombstone.trailingClosed).toBe(true);
  });
  test('login stores the server game ids', () => {
    const s = liveGameApp(undefined, { type: 'dsgLoginEvent', payload: {
      player: 'alice', me: { subscriberLevel: 1 }, serverData: { tournament: false, arena: false,
        gameEvents: [{ id: 1, name: 'Live Game', game: 1 }, { id: 2, name: 'Live Game', game: 33 }] } } });
    expect(s.serverGameIds).toEqual([1, 33]);
  });
});
