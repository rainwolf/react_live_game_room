import { describe, test, expect } from 'vitest';
import { Game, GameState } from '../GameClass';

function ts(moves = []) {
  const g = new Game(); g.setGame(33); g.gameState.state = GameState.State.STARTED;
  moves.forEach((m) => g.addMove(m));
  return g;
}
const cell = (g, p) => g.abstractBoard[p % 19][Math.floor(p / 19)];
const close = (g) => { g.gameState.tombstone.trailingClosed = true; return g; };

describe('Tombstone replay / addMove', () => {
  test('own stones by turn player, dead cells = 3, pass = nothing', () => {
    const g = ts([180, 100, 361, 722, 411]);
    expect(cell(g, 180)).toBe(1);
    expect(cell(g, 100)).toBe(2);
    expect(cell(g, 0)).toBe(3);
    expect(cell(g, 50)).toBe(3);
    expect(g.abstractBoard.flat().filter((v) => v !== 0)).toHaveLength(4);
  });
  test('own stone captures a pair; a dead stone may fill a just-captured point', () => {
    // turns: P1 180 | P2 181 | P1 pass | P2 182 | P1 183 (captures 181+182) + dead on 181
    const g = ts([180, 181, 722, 182, 183, 361 + 181]);
    expect(cell(g, 182)).toBe(0);
    expect(cell(g, 181)).toBe(3);
    expect(g.captures[2]).toBe(2);
  });
  test('a dead stone blocks a capture', () => {
    const g = ts([180, 181, 361 + 182, 183]);
    expect(cell(g, 181)).toBe(2);
    expect(g.captures[2]).toBe(0);
  });
  test('dead stones never capture (D3)', () => {
    // P2 201 + dead 200 | P1 pass | P2 202 + dead 203: P2 pair 201+202 sits between two dead stones
    const g = ts([180, 201, 361 + 200, 722, 202, 361 + 203]);
    expect(cell(g, 201)).toBe(2);
    expect(cell(g, 202)).toBe(2);
    expect(g.captures[2]).toBe(0);
  });
  test('replayGame and addMoveFromList give the same board as addMove', () => {
    const H = [180, 181, 722, 182, 183, 542, 722, 400];
    const a = ts(H);
    const b = ts(); b.moves = [...H]; b.replayGame();
    const c = ts(); c.moves = [...H]; for (let i = 0; i < H.length; i++) c.addMoveFromList(i);
    expect(b.abstractBoard).toEqual(a.abstractBoard);
    expect(c.abstractBoard).toEqual(a.abstractBoard);
    expect(b.captures).toEqual(a.captures);
  });
});

describe('Tombstone whose turn / colour', () => {
  test('DEAD phase keeps the mover and hovers gray', () => {
    const g = ts([180, 100]);
    g.gameState.tombstone.trailingClosed = false;
    expect(g.currentPlayer()).toBe(2);
    expect(g.currentColor()).toBe(3);
    close(g);
    expect(g.currentPlayer()).toBe(1);
    expect(g.currentColor()).toBe(1);
  });
  test('fresh game: trailingClosed true, P1, survives newInstance as a copy', () => {
    const g = ts();
    expect(g.gameState.tombstone).toEqual({ trailingClosed: true });
    const h = g.newInstance();
    h.gameState.tombstone.trailingClosed = false;
    expect(g.gameState.tombstone.trailingClosed).toBe(true);
  });
});

describe('Tombstone last_move / moves_strings / cells', () => {
  test('last_move marks A19 for code 361 and the own stone', () => {
    expect(ts([180, 100, 361]).last_move().sort((x, y) => x - y)).toEqual([0, 100]);
  });
  test('last_move of a pass-only turn is empty, of pass + dead is the dead point', () => {
    expect(ts([180, 722]).last_move()).toEqual([]);
    expect(ts([180, 722, 411]).last_move()).toEqual([50]);
  });
  test('moves_strings labels 361 as dead A19, one cell per turn', () => {
    const g = ts([180, 100, 361, 722]);
    expect(g.moves_strings()).toEqual(['K10', g.getMoveCoord(100) + ' - A19', 'PASS']);
    expect(g.tombstone_turn_cells().map((c) => c.until)).toEqual([1, 3, 4]);
  });
});

describe('Tombstone history stepping and undo', () => {
  test('goForwardBack steps whole turns', () => {
    const g = ts([180, 100, 361, 722, 411, 200]);
    g.goForwardBack(false); expect(g.until).toBe(5);
    g.goForwardBack(false); expect(g.until).toBe(3);
    expect(cell(g, 50)).toBe(0);
    g.goForwardBack(true); expect(g.until).toBe(5);
    expect(cell(g, 50)).toBe(3);
  });
  test('undoTurn removes 2 entries after a dead stone, 1 after a skip', () => {
    const g = close(ts([180, 100, 361]));
    g.undoTurn();
    expect(g.moves).toEqual([180]);
    expect(cell(g, 0)).toBe(0);
    const h = close(ts([180, 100, 361, 722]));
    h.undoTurn();
    expect(h.moves).toEqual([180, 100, 361]);
    expect(h.gameState.tombstone.trailingClosed).toBe(true);
  });
  test('undoTurn does not mutate the previous instance moves array', () => {
    const g = close(ts([180, 100, 361]));
    const before = g.moves;
    const h = g.newInstance(); h.undoTurn();
    expect(before).toEqual([180, 100, 361]);
  });
  test('undoTurn while browsing keeps until within the moves', () => {
    const g = close(ts([180, 100, 361, 722, 411]));
    g.goto_move(1); g.undoTurn();
    expect(g.moves).toEqual([180, 100, 361]);
    expect(g.until).toBe(1);
    const h = close(ts([180, 100, 361, 722, 411]));
    h.undoTurn();
    expect(h.until).toBe(3);
  });
});
