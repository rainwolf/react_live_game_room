import { describe, test, expect } from 'vitest';
import {
  decodeTombstone, isOwnEntry, turnPlayer, parseTombstoneTurns, tombstoneEntryPlayer,
  tombstonePhase, tombstoneButton, tombstoneTurnLabel, tombstoneUndoSeat, tombstoneStepTarget,
} from '../tombstoneTurn';

const coord = (p) => 'ABCDEFGHJKLMNOPQRST'[p % 19] + (19 - Math.floor(p / 19));
// centre; P2 own 100 + dead on 0 (361); P1 pass + dead 50 (411); P2 own 200 only; P1 pass only
const H = [180, 100, 361, 722, 411, 200, 722];

describe('decodeTombstone', () => {
  test('own, dead (incl. A19 = 361), pass, invalid', () => {
    expect(decodeTombstone(0)).toEqual({ kind: 'own', point: 0 });
    expect(decodeTombstone(360)).toEqual({ kind: 'own', point: 360 });
    expect(decodeTombstone(361)).toEqual({ kind: 'dead', point: 0 });
    expect(decodeTombstone(721)).toEqual({ kind: 'dead', point: 360 });
    expect(decodeTombstone(722)).toEqual({ kind: 'pass', point: -1 });
    expect(decodeTombstone(723)).toBeNull();
    expect(decodeTombstone(-1)).toBeNull();
    expect(isOwnEntry(722)).toBe(true);
    expect(isOwnEntry(361)).toBe(false);
  });
});

describe('parseTombstoneTurns / entry player', () => {
  test('mixed history', () => {
    expect(parseTombstoneTurns(H)).toEqual([
      { player: 1, own: 180, dead: -1, start: 0, end: 0 },
      { player: 2, own: 100, dead: 361, start: 1, end: 2 },
      { player: 1, own: 722, dead: 411, start: 3, end: 4 },
      { player: 2, own: 200, dead: -1, start: 5, end: 5 },
      { player: 1, own: 722, dead: -1, start: 6, end: 6 },
    ]);
    expect(H.map((_, i) => tombstoneEntryPlayer(H, i))).toEqual([1, 2, 2, 1, 1, 2, 1]);
    expect([0, 1, 2, 3].map(turnPlayer)).toEqual([1, 2, 1, 2]);
  });
  test('a second dead entry in one turn is ignored', () => {
    expect(parseTombstoneTurns([180, 100, 361, 362])).toHaveLength(2);
    expect(parseTombstoneTurns([180, 100, 361, 362])[1].end).toBe(2);
  });
});

describe('tombstonePhase / tombstoneButton', () => {
  test('no button before the centre stone', () => {
    expect(tombstonePhase([], true)).toEqual({ player: 1, phase: 'OWN' });
    expect(tombstoneButton([], true, false)).toBeNull();
  });
  test('after the centre: P2 OWN, button = Place only a dead stone', () => {
    expect(tombstonePhase([180], true)).toEqual({ player: 2, phase: 'OWN' });
    expect(tombstoneButton([180], true, false)).toEqual({ label: 'Place only a dead stone', action: 'ownPass' });
  });
  test('own entry open -> DEAD phase of the same player, button = Skip dead stone', () => {
    expect(tombstonePhase([180, 100], false)).toEqual({ player: 2, phase: 'DEAD' });
    expect(tombstonePhase([180, 722], false)).toEqual({ player: 2, phase: 'DEAD' });
    expect(tombstoneButton([180, 100], false, false)).toEqual({ label: 'Skip dead stone', action: 'skipDead' });
  });
  test('own entry closed by skip -> next player OWN', () => {
    expect(tombstonePhase([180, 100], true)).toEqual({ player: 1, phase: 'OWN' });
  });
  test('dead entry closes the turn', () => {
    expect(tombstonePhase([180, 100, 361], true)).toEqual({ player: 1, phase: 'OWN' });
  });
  test('pending hides the button', () => {
    expect(tombstoneButton([180], true, true)).toBeNull();
  });
});

describe('tombstoneTurnLabel', () => {
  test('the four shapes', () => {
    const t = parseTombstoneTurns(H);
    expect(tombstoneTurnLabel(t[0], coord)).toBe('K10');
    expect(tombstoneTurnLabel(t[1], coord)).toBe(coord(100) + ' + dead A19');
    expect(tombstoneTurnLabel(t[2], coord)).toBe('PASS + dead ' + coord(50));
    expect(tombstoneTurnLabel(t[4], coord)).toBe('PASS');
  });
});

describe('tombstoneUndoSeat', () => {
  test('nobody may undo the centre or ask mid-turn', () => {
    expect(tombstoneUndoSeat([180], true)).toBe(0);
    expect(tombstoneUndoSeat([180, 100], false)).toBe(0);
  });
  test('the player who completed the last turn', () => {
    expect(tombstoneUndoSeat([180, 100], true)).toBe(2);
    expect(tombstoneUndoSeat([180, 100, 361], true)).toBe(2);
    expect(tombstoneUndoSeat(H, true)).toBe(1);
  });
});

describe('tombstoneStepTarget', () => {
  test('forward lands on turn ends', () => {
    expect(tombstoneStepTarget(H, 1, true)).toBe(3);
    expect(tombstoneStepTarget(H, 3, true)).toBe(5);
    expect(tombstoneStepTarget(H, 7, true)).toBe(7);
  });
  test('back lands on the previous turn end, never below 1', () => {
    expect(tombstoneStepTarget(H, 5, false)).toBe(3);
    expect(tombstoneStepTarget(H, 3, false)).toBe(1);
    expect(tombstoneStepTarget(H, 1, false)).toBe(1);
  });
  test('partial trailing turn (own entry, dead pending) is one step', () => {
    expect(tombstoneStepTarget([180, 100], 1, true)).toBe(2);
    expect(tombstoneStepTarget([180, 100], 2, false)).toBe(1);
  });
});
