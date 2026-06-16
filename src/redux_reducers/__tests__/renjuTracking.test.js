import { describe, test, expect } from 'vitest';
import { addMove, renjuSwap, renjuOffer10, renjuSelect1, swapSeats } from '../utils';
import { Game, GameState } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';
import liveGameApp from '../rootReducer';
import { renjuBeginOffer } from '../../ui/renjuOpeningUi';

function renjuState() {
  const g = new Game();
  g.setGame(31);
  g.gameState.state = GameState.State.STARTED;
  const t = new Table({ table: 5, initialMinutes: 10 });
  t.me = 'alice';
  return { game: g, tables: { 5: t }, table: 5, me: 'alice', pendingNotifications: [] };
}
const move = (s, m, player = 'srv') => addMove({ table: 5, move: m, moves: [m], player }, s);

describe('renju tracking reducers', () => {
  test('addMove opens the swap window after moves 1-4', () => {
    const s = renjuState();
    move(s, 112);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(s.game.gameState.renjuState.complete).toBe(false);
  });
  test('renjuSwap(false) at n=4 chooses Branch A and clears awaitingSwap', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, awaitingSwap
    renjuSwap({ table: 5, swap: false, move: 129, player: 'alice' }, s);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(true);
    expect(s.game.gameState.renjuState.tenOffer).toBe(false);
  });
  test('renjuOffer10 records Branch B + offers', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    const offers = [40, 41, 42, 55, 57, 70, 71, 72, 160, 176];
    renjuOffer10({ table: 5, moves: offers, player: 'alice' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(true);
    expect(r.offered).toEqual(offers);
    expect(r.awaitingSwap).toBe(false);
  });
  test('renjuSelect1 records the selection; following move 5 completes Branch B', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    renjuOffer10({ table: 5, moves: [40, 41, 42, 55, 57, 70, 71, 72, 160, 176], player: 'alice' }, s);
    renjuSelect1({ table: 5, move: 57, player: 'bob' }, s);
    expect(s.game.gameState.renjuState.selected).toBe(57);
    move(s, 57); // server places move 5
    expect(s.game.gameState.renjuState.complete).toBe(true); // branch B completes at n=5
  });
  test('Branch A: move 5 then window 5; move 6 completes', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    renjuSwap({ table: 5, swap: false, move: 129, player: 'alice' }, s); // branch A
    move(s, 129); // move 5 placed -> window 5 opens
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(s.game.gameState.renjuState.complete).toBe(false);
    renjuSwap({ table: 5, swap: false, move: 0, player: 'bob' }, s); // bare window-5 decline
    move(s, 200); // move 6 anywhere
    expect(s.game.gameState.renjuState.complete).toBe(true);
  });
  test('take-over at n=4 (live swapSeats) -> BRANCH; then move 5 opens window 5', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, window 4 open
    swapSeats({ table: 5, silent: false, swap: true, player: 'bob' }, s); // live take-over
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(false); // -> BRANCH (branch not yet chosen)
    move(s, 129); // Branch A move 5 placed -> window 5
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(s.game.gameState.renjuState.complete).toBe(false);
  });
});

describe('swapSeats advances renju tracking (live take-over + silent rejoin)', () => {
  test('silent rejoin marker at n=4 -> BRANCH (window resolved, branch NOT yet chosen)', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, awaitingSwap
    swapSeats({ table: 5, silent: true, swap: false }, s);
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    expect(r.branchChosen).toBe(false); // BRANCH = awaiting branch choice; branchChosen stays false
    expect(r.tenOffer).toBe(false);
  });
  test('silent rejoin marker at n=5 (Branch A) clears awaitingSwap; branch unchanged', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    renjuSwap({ table: 5, swap: false, move: 129, player: 'alice' }, s); // Branch A (decline @ move 4)
    move(s, 129); // n=5, window 5 open
    swapSeats({ table: 5, silent: true, swap: false }, s);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(true); // still Branch A from the earlier decline
  });
  test('live (non-silent) take-over clears awaitingSwap AND swaps the seats', () => {
    const s = renjuState();
    s.tables[5].seats = [undefined, 'graviton', 'iostest']; // seat1=black, seat2=white
    move(s, 112); // n=1, window 1 open
    swapSeats({ table: 5, silent: false, swap: true, player: 'iostest' }, s); // live take-over
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false); // window resolved -> MOVE
    expect(s.tables[5].seats).toEqual([undefined, 'iostest', 'graviton']); // visual seat swap happened
  });
});

describe('rootReducer wiring', () => {
  test('renjuOffer10 event is routed through EVENT_HANDLERS', () => {
    // build a started renju table via reducer init + minimal setup is heavy; instead assert
    // the handler is registered by dispatching the typed action onto a hand-built state.
    let s = { table: 5, me: 'alice', tables: {}, pendingNotifications: [],
      game: (() => { const g = new Game(); g.setGame(31); g.gameState.state = GameState.State.STARTED;
        [112,113,97,98].forEach(m=>g.addMove(m)); return g; })() };
    s.tables[5] = new Table({ table: 5, initialMinutes: 10 });
    const out = liveGameApp(s, { type: 'dsgRenjuTaraguchiOffer10TableEvent',
      payload: { table: 5, moves: [40,41,42,55,57,70,71,72,160,176], player: 'alice' } });
    expect(out.game.gameState.renjuState.tenOffer).toBe(true);
  });
  test('renjuOpeningUi slice is part of root state and reacts to its actions', () => {
    const base = liveGameApp(undefined, { type: '@@INIT' });
    expect(base.renjuOpeningUi).toEqual({ mode: 'idle', picks: [] });
    const out = liveGameApp(base, renjuBeginOffer());
    expect(out.renjuOpeningUi.mode).toBe('offering');
  });
});
