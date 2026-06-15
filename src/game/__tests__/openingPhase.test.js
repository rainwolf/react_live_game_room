import { describe, test, expect } from 'vitest';
import { GameState } from '../gameState';
import {
  Swap2Phase,
  DPentePhase,
  swap2Phase,
  dPentePhase,
  swap2OpeningPlayer,
  dPenteOpeningPlayer,
  isSwap2Choice,
  isSwap2CanPass,
  isDPenteChoice,
} from '../openingPhase';

const { Swap2State, DPenteState } = GameState;
const { NO_CHOICE, SWAPPED, SWAP2PASS } = Swap2State;

describe('swap2Phase — the single source of truth for swap2 opening sub-phases', () => {
  test('player 1 lays the first three stones (len < 3), regardless of sub-state', () => {
    expect(swap2Phase(0, NO_CHOICE)).toBe(Swap2Phase.P1_OPENING);
    expect(swap2Phase(2, NO_CHOICE)).toBe(Swap2Phase.P1_OPENING);
    // ordering invariant: the len<3 guard must precede the len<5 && SWAP2PASS guard, so a
    // (stale) SWAP2PASS at len < 3 is still the player-1 opening, not the extra-stones phase.
    expect(swap2Phase(2, SWAP2PASS)).toBe(Swap2Phase.P1_OPENING);
  });
  test('player 2 decides at len 3 / NO_CHOICE', () => {
    expect(swap2Phase(3, NO_CHOICE)).toBe(Swap2Phase.P2_DECISION);
  });
  test('player 2 lays the two extra stones after a pass (len 3 and 4 / SWAP2PASS)', () => {
    expect(swap2Phase(3, SWAP2PASS)).toBe(Swap2Phase.P2_EXTRA);
    expect(swap2Phase(4, SWAP2PASS)).toBe(Swap2Phase.P2_EXTRA);
  });
  test('player 1 decides at len 5 / SWAP2PASS', () => {
    expect(swap2Phase(5, SWAP2PASS)).toBe(Swap2Phase.P1_DECISION);
  });
  test('everything else is NORMAL (plain alternation)', () => {
    expect(swap2Phase(3, SWAPPED)).toBe(Swap2Phase.NORMAL);
    expect(swap2Phase(4, NO_CHOICE)).toBe(Swap2Phase.NORMAL);
    expect(swap2Phase(5, NO_CHOICE)).toBe(Swap2Phase.NORMAL);
    expect(swap2Phase(6, SWAP2PASS)).toBe(Swap2Phase.NORMAL); // upper side of the len===5 boundary
    expect(swap2Phase(7, NO_CHOICE)).toBe(Swap2Phase.NORMAL);
  });
});

describe('dPentePhase — d-pente opening sub-phases', () => {
  test('player 1 lays the first four stones', () => {
    expect(dPentePhase(0, DPenteState.NO_CHOICE)).toBe(DPentePhase.P1_OPENING);
    expect(dPentePhase(3, DPenteState.NO_CHOICE)).toBe(DPentePhase.P1_OPENING);
  });
  test('player 2 decides at len 4 / NO_CHOICE', () => {
    expect(dPentePhase(4, DPenteState.NO_CHOICE)).toBe(DPentePhase.P2_DECISION);
  });
  test('everything else is NORMAL', () => {
    expect(dPentePhase(4, DPenteState.SWAPPED)).toBe(DPentePhase.NORMAL);
    expect(dPentePhase(5, DPenteState.NO_CHOICE)).toBe(DPentePhase.NORMAL);
  });
});

describe('swap2OpeningPlayer — who moves, derived from the phase', () => {
  test('player 1 during opening and at the player-1 decision', () => {
    expect(swap2OpeningPlayer(0, NO_CHOICE)).toBe(1);
    expect(swap2OpeningPlayer(2, SWAP2PASS)).toBe(1); // len<3 ordering: still player 1
    expect(swap2OpeningPlayer(5, SWAP2PASS)).toBe(1);
  });
  test('player 2 at the decision and while laying the extra stones', () => {
    expect(swap2OpeningPlayer(3, NO_CHOICE)).toBe(2);
    expect(swap2OpeningPlayer(3, SWAP2PASS)).toBe(2);
    expect(swap2OpeningPlayer(4, SWAP2PASS)).toBe(2);
  });
  test('null past the opening (caller uses plain alternation)', () => {
    expect(swap2OpeningPlayer(3, SWAPPED)).toBeNull();
    expect(swap2OpeningPlayer(4, NO_CHOICE)).toBeNull();
    expect(swap2OpeningPlayer(5, NO_CHOICE)).toBeNull();
    expect(swap2OpeningPlayer(6, SWAP2PASS)).toBeNull(); // upper side of len===5
  });
});

describe('dPenteOpeningPlayer', () => {
  test('player 1 during opening, player 2 at the decision, null past it', () => {
    expect(dPenteOpeningPlayer(0, DPenteState.NO_CHOICE)).toBe(1);
    expect(dPenteOpeningPlayer(3, DPenteState.NO_CHOICE)).toBe(1);
    expect(dPenteOpeningPlayer(4, DPenteState.NO_CHOICE)).toBe(2);
    expect(dPenteOpeningPlayer(4, DPenteState.SWAPPED)).toBeNull();
    expect(dPenteOpeningPlayer(5, DPenteState.NO_CHOICE)).toBeNull();
  });
});

describe('decision predicates derive from the same phase (cannot desync from who-moves)', () => {
  test('isSwap2Choice is true at both decision points when started', () => {
    expect(isSwap2Choice(3, NO_CHOICE, true)).toBe(true);
    expect(isSwap2Choice(5, SWAP2PASS, true)).toBe(true);
    expect(isSwap2Choice(3, SWAP2PASS, true)).toBe(false); // P2_EXTRA, not a decision
    expect(isSwap2Choice(4, SWAP2PASS, true)).toBe(false);
    expect(isSwap2Choice(5, NO_CHOICE, true)).toBe(false);
    expect(isSwap2Choice(3, NO_CHOICE, false)).toBe(false); // not started
  });
  test('isSwap2CanPass is true only at the first decision point', () => {
    expect(isSwap2CanPass(3, NO_CHOICE, true)).toBe(true);
    expect(isSwap2CanPass(5, SWAP2PASS, true)).toBe(false); // second decision can't pass
    expect(isSwap2CanPass(3, SWAP2PASS, true)).toBe(false);
    expect(isSwap2CanPass(3, NO_CHOICE, false)).toBe(false);
  });
  test('isDPenteChoice is true only at len 4 / NO_CHOICE / started', () => {
    expect(isDPenteChoice(4, DPenteState.NO_CHOICE, true)).toBe(true);
    expect(isDPenteChoice(4, DPenteState.SWAPPED, true)).toBe(false);
    expect(isDPenteChoice(3, DPenteState.NO_CHOICE, true)).toBe(false);
    expect(isDPenteChoice(4, DPenteState.NO_CHOICE, false)).toBe(false);
  });
});
