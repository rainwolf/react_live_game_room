import { describe, test, expect } from 'vitest';
import { renjuSwap, renjuOffer10, renjuSelect1, swapSeats } from '../utils';
import { Game, GameState } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';
import liveGameApp from '../rootReducer';
import { renjuBeginOffer } from '../../ui/renjuOpeningUi';
import { renjuPhase, RenjuPhase } from '../../game/openingPhase';
import { renjuState, move, bulk, phaseOf } from './renjuTestHelpers';

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
  test('take-over at n=4 (live swapSeats) -> Branch A; then move 5 opens window 5', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, window 4 open
    swapSeats({ table: 5, silent: false, swap: true, player: 'bob' }, s); // live take-over
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    // A seat swap at move 4 IS the take-over -> Branch A (Taraguchi-10): the swapped-in player
    // just places move 5, so branchChosen is committed here (phase MOVE, not the BRANCH re-prompt).
    expect(s.game.gameState.renjuState.branchChosen).toBe(true);
    expect(s.game.gameState.renjuState.tenOffer).toBe(false);
    expect(renjuPhase(s.game.moves.length, s.game.gameState.renjuState)).toBe(RenjuPhase.MOVE);
    move(s, 129); // Branch A move 5 placed -> window 5
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(s.game.gameState.renjuState.complete).toBe(false);
  });
  test('renjuSwap(false) at a window 1-3 decline does NOT choose a branch', () => {
    const s = renjuState();
    [112, 113].forEach((m) => move(s, m)); // n=2, window 2 open
    renjuSwap({ table: 5, swap: false, move: 97, player: 'bob' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.branchChosen).toBe(false); // branch is chosen only at the move-4 window
    expect(r.awaitingSwap).toBe(false);
  });
  test('renjuSwap(true) is a decision-only echo: it does NOT commit a branch', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4
    renjuSwap({ table: 5, swap: true, move: -1, player: 'bob' }, s);
    const r = s.game.gameState.renjuState;
    // The live server delivers a take-over as a SEAT-SWAP event (swapSeats), not as this renju
    // swap echo. The echo (backend renjuSwapDecisionMade) only clears awaitingSwap and, on a
    // swap=false decline at move 4, commits Branch A. A swap=true echo touches no branch state.
    expect(r.branchChosen).toBe(false);
    expect(r.awaitingSwap).toBe(false);
  });
});

describe('swapSeats advances renju tracking (live take-over + silent rejoin)', () => {
  test('rejoin take-over marker seen with move 4 already present -> Branch A (moves-before-marker)', () => {
    const s = renjuState();
    [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, awaitingSwap
    // A seat-swap event ONLY happens on a TAKE-OVER, so the rejoin marker carries swap:true (a
    // swap:false silent marker decodes to a BRANCH decline per the backend contract, not a
    // take-over). silent:true = the rejoin/state-sync marker (no visual seat swap replayed).
    swapSeats({ table: 5, silent: true, swap: true, player: 'bob' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    // A take-over at the move-4 window commits Branch A (phase MOVE). Whether the event is the live
    // one or the silent rejoin marker, at n==4 it commits the branch.
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(false);
    expect(renjuPhase(s.game.moves.length, r)).toBe(RenjuPhase.MOVE);
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

describe('rejoin: a decision echo BEFORE the bulk move-list must not reopen a resolved window (code review #2)', () => {
  // On rejoin the server sends the decision echo FIRST, then the full move list (ServerTable
  // sendMoves). The bulk replay must respect the window the echo already resolved — otherwise it
  // clobbers awaitingSwap back to true and pops a spurious take-over modal in BRANCH/SELECTION.
  // (`bulk` and `phaseOf` come from renjuTestHelpers.)

  test('SELECTION rejoin: offer10 echo then bulk 4 moves -> SELECTION (not a spurious SWAP)', () => {
    const s = renjuState();
    renjuOffer10({ table: 5, moves: [113, 114, 115, 116, 128, 129, 130, 131, 144, 145], player: 'alice' }, s);
    bulk(s, [112, 113, 97, 98]); // full move list arrives last
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(phaseOf(s)).toBe(RenjuPhase.SELECTION);
  });
  test('take-over rejoin: silent swap-seats marker then bulk 4 moves -> Branch A (marker-before-moves)', () => {
    // The REAL rejoin ordering: the silent seat-swap marker arrives FIRST (before the move list),
    // so swapSeats sees 0 moves and can only stash swapTaken. The bulk 4-move replay must then
    // resolve that take-over marker to Branch A (branchChosen=true, phase MOVE) -- matching backend
    // RenjuRejoin.decode, which returns a MOVE take-over for a move-4 swap. Pre-fix this stayed at
    // branchChosen=false -> phase BRANCH (bug: swapped-in player re-prompted with Offer-10/Branch B).
    // A seat-swap event only happens on a TAKE-OVER, so the marker carries swap:true (swap:false
    // would be a BRANCH decline, not a take-over); silent:true marks the rejoin/state-sync marker.
    const s = renjuState();
    swapSeats({ table: 5, silent: true, swap: true, player: 'bob' }, s); // rejoin take-over marker (sets swapTaken)
    bulk(s, [112, 113, 97, 98]);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(false);
    expect(s.game.gameState.renjuState.branchChosen).toBe(true);
    expect(s.game.gameState.renjuState.tenOffer).toBe(false);
    expect(phaseOf(s)).toBe(RenjuPhase.MOVE);
  });
  test('open-window rejoin: bulk 4 moves with NO decision echo -> SWAP (window 4 open)', () => {
    const s = renjuState();
    bulk(s, [112, 113, 97, 98]);
    expect(s.game.gameState.renjuState.awaitingSwap).toBe(true);
    expect(phaseOf(s)).toBe(RenjuPhase.SWAP);
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
