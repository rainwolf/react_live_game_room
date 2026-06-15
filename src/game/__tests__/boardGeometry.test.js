import { describe, test, expect } from 'vitest';
import { gridSizeForGame, boardStyleClass, boardSpecialPoints, isGoBoard, variantKey, STANDARD_GAME_IDS } from '../boardGeometry';

describe('STANDARD_GAME_IDS — the selectable variant ids', () => {
  test('is the 15 standard (odd) ids 1..29, never the nonexistent game 31', () => {
    expect(STANDARD_GAME_IDS).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29]);
    expect(STANDARD_GAME_IDS).toHaveLength(15);
    expect(STANDARD_GAME_IDS.every((id) => id % 2 === 1)).toBe(true);
    expect(STANDARD_GAME_IDS).not.toContain(31);
  });
  test('maps to 13 distinct variant keys (Go 19/21/23 share the go key but are distinct boards)', () => {
    expect(new Set(STANDARD_GAME_IDS.map(variantKey)).size).toBe(13);
  });
});

describe('variantKey — the canonical game-id -> variant partition', () => {
  test('boardStyleClass is the variant key (the board class IS the variant)', () => {
    expect(boardStyleClass).toBe(variantKey);
  });
  test('returns the variant identity for representative ids', () => {
    expect(variantKey(1)).toBe('pente');
    expect(variantKey(13)).toBe('connect6');
    expect(variantKey(19)).toBe('go');
    expect(variantKey(30)).toBe('swap2-keryo');
  });
  test('poof-pente and connect6 are distinct keys (despite sharing a lobby colour)', () => {
    expect(variantKey(11)).toBe('poof-pente');
    expect(variantKey(13)).toBe('connect6');
    expect(variantKey(11)).not.toBe(variantKey(13));
  });
});

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
