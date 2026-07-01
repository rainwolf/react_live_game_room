// Regression: a move-4 TAKE-OVER is delivered by the LIVE server as a SEAT-SWAP event
// (DSGSwapSeatsTableEvent -> swapSeats), NOT as a renju decision echo. The renju swap event
// (dsgRenjuTaraguchiSwapTableEvent -> renjuSwap) stays a decision-only echo (backend
// renjuSwapDecisionMade), used for swap=false declines + Branch A move 5. So the take-over
// auto-commit of Branch A (Taraguchi-10) must live on the seat-swap handler.
//
// A take-over must auto-commit Branch A: the swapped-in player just places move 5, so the phase
// machine must return MOVE and Offer-10 / Branch B must be unreachable. Previously swapSeats left
// branchChosen=false at move 4, so the phase machine returned BRANCH and re-presented the 3-way
// decision (incl. Offer-10 / Branch B) to the swapped-in player. That must be impossible.
//
// This file also pins the DECLINE path (byte-identical) and Branch-B reachability from the OPEN
// move-4 decision point so the fix cannot over-reach.
import { describe, test, expect } from 'vitest';
import { renjuSwap, renjuOffer10, swapSeats } from '../utils';
import {
  RenjuPhase,
  isRenjuBranchChoice,
  isRenjuSelection,
} from '../../game/openingPhase';
import { renjuState, move, opened4, phaseOf, buttonsOf } from './renjuTestHelpers';

describe('move-4 TAKE-OVER (live seat-swap) auto-commits Branch A (Taraguchi-10)', () => {
  // RED->GREEN anchor: this drives the REAL seat-swap event (swapSeats), not the decision echo.
  // Pre-fix swapSeats leaves branchChosen=false -> phase BRANCH (bug). After the fix it commits
  // Branch A -> phase MOVE.
  test('swapSeats at n=4 -> Branch A: phase MOVE, branch chosen, ten-offer off', () => {
    const s = opened4();
    swapSeats({ table: 5, silent: false, swap: true, player: 'bob' }, s); // REAL take-over event
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(false);
    expect(phaseOf(s)).toBe(RenjuPhase.MOVE); // NOT BRANCH
  });

  test('after the take-over, Offer-10 / Branch-B is unreachable to the swapped-in player', () => {
    const s = opened4();
    swapSeats({ table: 5, silent: false, swap: true, player: 'bob' }, s);
    const n = s.game.moves.length;
    const r = s.game.gameState.renjuState;
    expect(isRenjuBranchChoice(n, r, true)).toBe(false);
    expect(isRenjuSelection(n, r, true)).toBe(false);
    expect(buttonsOf(s)).toEqual({ swap: false, declinePlace: false, offer10: false });
  });

  // The take-over commit is gated on the move-4 window: a seat swap at an EARLIER window resolves
  // that window without choosing a branch (branch is chosen only at move 4).
  test('take-over at an earlier window (n=1) does not choose a branch', () => {
    const s = renjuState();
    move(s, 112); // n=1, window 1 open
    swapSeats({ table: 5, silent: false, swap: true, player: 'bob' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    expect(r.branchChosen).toBe(false); // branch is chosen only at the move-4 window
  });

  // --- DECLINE path is UNCHANGED by the fix (byte-identical) ---------------------------
  test('DECLINE (renjuSwap false) at n=4 is byte-identical: Branch A, ten-offer off', () => {
    const s = opened4();
    renjuSwap({ table: 5, swap: false, move: 129, player: 'alice' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.awaitingSwap).toBe(false);
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(false);
  });

  // A swap=true echo is NOT a real take-over event (the live server sends the seat-swap instead).
  // After the revert, the decision echo must NOT commit a branch on swap=true — it is decision-only.
  test('renjuSwap(true) echo does NOT commit a branch (decision-only echo, take-over is seat-swap)', () => {
    const s = opened4();
    renjuSwap({ table: 5, swap: true, move: -1, player: 'bob' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.branchChosen).toBe(false); // the echo never chooses a branch on a taken swap
  });

  // --- the fix must not kill Branch B on the paths that still reach it ------------------
  test('open move-4 window still presents the full 3-way decision (Offer-10 available)', () => {
    const s = opened4(); // no decision echo yet -> window open
    expect(phaseOf(s)).toBe(RenjuPhase.SWAP);
    expect(buttonsOf(s)).toEqual({ swap: true, declinePlace: true, offer10: true });
  });

  test('decline + Offer-10 still records Branch B (reachable from the open decision point)', () => {
    const s = opened4();
    const offers = [40, 41, 42, 55, 57, 70, 71, 72, 160, 176];
    renjuOffer10({ table: 5, moves: offers, player: 'alice' }, s);
    const r = s.game.gameState.renjuState;
    expect(r.branchChosen).toBe(true);
    expect(r.tenOffer).toBe(true);
    expect(phaseOf(s)).toBe(RenjuPhase.SELECTION);
  });
});
