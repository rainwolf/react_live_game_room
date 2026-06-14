// Opening-phase state machine for the swap2 / d-pente variants — the subtle part of the
// game FSM, and previously the only untested part. In these variants player 1 lays the
// opening stones, then a player decides whether to swap (swap2 also lets player 2 pass and
// lay two more stones, deferring the decision to player 1). "Which opening sub-phase are
// we in" was re-derived from (moves played, recorded swap decision) in three GameClass
// methods (currentPlayer, swap2Choice, swap2CanPass) plus two for d-pente.
//
// The phase classifier is the single source of truth: the thresholds (how many moves, what
// swap decision) live in swap2Phase / dPentePhase and NOWHERE else. Who-moves and the
// choice predicates both derive from the phase, so "whose turn it is" and "is a decision
// pending" can never disagree. Pure over primitives (move count, sub-state, started flag),
// so it is testable without constructing a Game; the variant gating (is THIS game a swap2 /
// d-pente game) stays in GameClass, which knows the game number.
import { GameState } from './gameState';

// --- swap2 ---------------------------------------------------------------------------

export const Swap2Phase = {
  P1_OPENING: 'P1_OPENING', // player 1 laying the three opening stones (len < 3)
  P2_DECISION: 'P2_DECISION', // len 3, no choice yet — player 2 to swap / not / pass
  P2_EXTRA: 'P2_EXTRA', // player 2 passed, laying the two extra stones (len 3, 4)
  P1_DECISION: 'P1_DECISION', // len 5 after a pass — player 1 to swap / not
  NORMAL: 'NORMAL', // past the opening — plain alternation
};

export function swap2Phase(movesLength, swap2State) {
  const { NO_CHOICE, SWAP2PASS } = GameState.Swap2State;
  if (movesLength < 3) return Swap2Phase.P1_OPENING;
  if (movesLength === 3 && swap2State === NO_CHOICE) return Swap2Phase.P2_DECISION;
  if (movesLength < 5 && swap2State === SWAP2PASS) return Swap2Phase.P2_EXTRA; // len 3, 4
  if (movesLength === 5 && swap2State === SWAP2PASS) return Swap2Phase.P1_DECISION;
  return Swap2Phase.NORMAL;
}

// --- d-pente -------------------------------------------------------------------------

export const DPentePhase = {
  P1_OPENING: 'P1_OPENING', // player 1 laying the four opening stones (len < 4)
  P2_DECISION: 'P2_DECISION', // len 4, no choice yet — player 2 to swap / not
  NORMAL: 'NORMAL',
};

export function dPentePhase(movesLength, dPenteState) {
  const { NO_CHOICE } = GameState.DPenteState;
  if (movesLength < 4) return DPentePhase.P1_OPENING;
  if (movesLength === 4 && dPenteState === NO_CHOICE) return DPentePhase.P2_DECISION;
  return DPentePhase.NORMAL;
}

// --- derived: who moves --------------------------------------------------------------

// Who moves during the swap2 opening, or null past it (caller falls back to plain
// alternation). Derived from the phase — no thresholds restated here.
export function swap2OpeningPlayer(movesLength, swap2State) {
  switch (swap2Phase(movesLength, swap2State)) {
    case Swap2Phase.P1_OPENING:
    case Swap2Phase.P1_DECISION:
      return 1;
    case Swap2Phase.P2_DECISION:
    case Swap2Phase.P2_EXTRA:
      return 2;
    default:
      return null;
  }
}

export function dPenteOpeningPlayer(movesLength, dPenteState) {
  switch (dPentePhase(movesLength, dPenteState)) {
    case DPentePhase.P1_OPENING:
      return 1;
    case DPentePhase.P2_DECISION:
      return 2;
    default:
      return null;
  }
}

// --- derived: is a decision pending --------------------------------------------------

// A swap2 decision is pending at either decision point, once the game is running.
export function isSwap2Choice(movesLength, swap2State, started) {
  const phase = swap2Phase(movesLength, swap2State);
  return started && (phase === Swap2Phase.P2_DECISION || phase === Swap2Phase.P1_DECISION);
}

// Player 2 may pass (defer the decision to player 1) only at the first decision point.
export function isSwap2CanPass(movesLength, swap2State, started) {
  return started && swap2Phase(movesLength, swap2State) === Swap2Phase.P2_DECISION;
}

// A d-pente decision is pending at its single decision point.
export function isDPenteChoice(movesLength, dPenteState, started) {
  return started && dPentePhase(movesLength, dPenteState) === DPentePhase.P2_DECISION;
}
