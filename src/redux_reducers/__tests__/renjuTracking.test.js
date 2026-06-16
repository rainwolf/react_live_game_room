import { describe, test, expect } from 'vitest';
import { addMove, renjuSwap, renjuOffer10, renjuSelect1, swapSeats } from '../utils';
import { Game, GameState } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';

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
  test('renjuSwap(true) at n=4 clears awaitingSwap only; move 5 opens window 5', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    renjuSwap({ table: 5, swap: true, player: 'bob' }, s);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(false); // swap=true leaves branch undecided
    move(s, 129); // move 5 -> window 5
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(s.game.gameState.renjuState.complete).toBe(false);
  });
});

describe('swapSeats silent rejoin advances renju tracking', () => {
  test('silent swap at n=4 marks window resolved -> branch choice pending', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, awaitingSwap
    swapSeats({ table: 5, silent: true, swap: false, swapped: false }, s);
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(false);
  });
  test('silent swap at n=5 clears awaitingSwap only (no branch change)', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    renjuSwap({ table: 5, swap: false, move: 129, player: 'alice' }, s); // branch A
    move(s, 129); // n=5, window 5 open
    swapSeats({ table: 5, silent: true, swap: false, swapped: false }, s);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(true); // already A from the earlier renjuSwap
  });
  test('NON-silent swap does not run the renju tracking branch', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m));
    const before = { ...s.game.gameState.renjuState };
    swapSeats({ table: 5, silent: false, swap: true, swapped: true }, s);
    // non-silent path may swap seats / set dPente/swap2 flags, but must NOT touch renju awaitingSwap via the silent branch
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(before.awaitingSwap);
  });
});
