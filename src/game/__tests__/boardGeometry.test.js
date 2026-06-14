import { describe, test, expect } from 'vitest';
import { gridSizeForGame, boardStyleClass, boardSpecialPoints, isGoBoard } from '../boardGeometry';

describe('gridSizeForGame — the board grid size per variant', () => {
  test('9x9 for games 21/22, 13x13 for 23/24, 19x19 otherwise', () => {
    expect(gridSizeForGame(21)).toBe(9);
    expect(gridSizeForGame(22)).toBe(9);
    expect(gridSizeForGame(23)).toBe(13);
    expect(gridSizeForGame(24)).toBe(13);
  });
  test('19x19 for the common ranges and beyond', () => {
    expect(gridSizeForGame(1)).toBe(19);
    expect(gridSizeForGame(20)).toBe(19);
    expect(gridSizeForGame(25)).toBe(19);
    expect(gridSizeForGame(30)).toBe(19);
  });
  test('defaults to 19 for an unknown/undefined game (no crash)', () => {
    expect(gridSizeForGame(0)).toBe(19);
    expect(gridSizeForGame(undefined)).toBe(19);
  });
});

describe('isGoBoard — the single go-range predicate (19..24)', () => {
  test('true for 19..24, false either side', () => {
    expect(isGoBoard(18)).toBe(false);
    expect(isGoBoard(19)).toBe(true);
    expect(isGoBoard(24)).toBe(true);
    expect(isGoBoard(25)).toBe(false);
  });
});

describe('boardStyleClass — the board CSS class per variant range', () => {
  const cases = [
    [1, 'pente'], [2, 'pente'],
    [3, 'keryo-pente'], [4, 'keryo-pente'],
    [5, 'gomoku'], [6, 'gomoku'],
    [7, 'd-pente'], [8, 'd-pente'],
    [9, 'g-pente'], [10, 'g-pente'],
    [11, 'poof-pente'], [12, 'poof-pente'],
    [13, 'connect6'], [14, 'connect6'],
    [15, 'boat-pente'], [16, 'boat-pente'],
    [17, 'dk-pente'], [18, 'dk-pente'],
    [19, 'go'], [24, 'go'],
    [25, 'o-pente'], [26, 'o-pente'],
    [27, 'swap2-pente'], [28, 'swap2-pente'],
    [29, 'swap2-keryo'], [30, 'swap2-keryo'],
  ];
  test.each(cases)('game %i -> %s', (g, expected) => {
    expect(boardStyleClass(g)).toBe(expected);
  });
  test('an unknown/undefined id falls through to the last class (unchanged behaviour)', () => {
    expect(boardStyleClass(undefined)).toBe('swap2-keryo');
  });
});

describe('boardSpecialPoints — star points / circles per variant', () => {
  const CIRCLES = [120, 126, 180, 234, 240].map((index) => ({ index, part: 51 }));
  test('non-go games get the five circle markers (part 51)', () => {
    expect(boardSpecialPoints(1)).toEqual(CIRCLES);
    // the exact boundary: 18 (dk-pente) and 25 (o-pente) are non-go, 19 and 24 are go
    expect(boardSpecialPoints(18)).toEqual(CIRCLES);
    expect(boardSpecialPoints(25)).toEqual(CIRCLES);
  });
  test('19x19 Go (19/20) gets nine star dots (part 52)', () => {
    expect(boardSpecialPoints(19)).toEqual(
      [60, 66, 72, 174, 180, 186, 288, 294, 300].map((index) => ({ index, part: 52 }))
    );
    expect(boardSpecialPoints(20)).toEqual(boardSpecialPoints(19));
  });
  test('9x9 Go (21/22) gets five star dots — both ids', () => {
    expect(boardSpecialPoints(21)).toEqual(
      [20, 24, 40, 56, 60].map((index) => ({ index, part: 52 }))
    );
    expect(boardSpecialPoints(22)).toEqual(boardSpecialPoints(21));
  });
  test('13x13 Go (23/24) gets nine star dots — both ids', () => {
    expect(boardSpecialPoints(23)).toEqual(
      [42, 45, 48, 81, 84, 87, 120, 123, 126].map((index) => ({ index, part: 52 }))
    );
    expect(boardSpecialPoints(24)).toEqual(boardSpecialPoints(23));
  });
});
