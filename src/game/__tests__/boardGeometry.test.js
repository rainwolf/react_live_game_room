import { describe, test, expect } from 'vitest';
import { gridSizeForGame, boardStyleClass, boardSpecialPoints, isGoBoard, variantKey, STANDARD_GAME_IDS, isTombstone, selectableGameIds } from '../boardGeometry';

describe('STANDARD_GAME_IDS — the selectable variant ids', () => {
  test('is the 17 standard (odd) ids 1..31 plus tombstone (33), including renju (31)', () => {
    expect(STANDARD_GAME_IDS).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33]);
    expect(STANDARD_GAME_IDS).toHaveLength(17);
    expect(STANDARD_GAME_IDS.every((id) => id % 2 === 1)).toBe(true);
    expect(STANDARD_GAME_IDS).toContain(31);
  });
  test('maps to 15 distinct variant keys (Go 19/21/23 share the go key but are distinct boards)', () => {
    expect(new Set(STANDARD_GAME_IDS.map(variantKey)).size).toBe(15);
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

describe('renju geometry (ids 31 / 32 / 81)', () => {
  test('grid size is 15 for all renju ids', () => {
    expect(gridSizeForGame(31)).toBe(15);
    expect(gridSizeForGame(32)).toBe(15);
    expect(gridSizeForGame(81)).toBe(15);
  });
  test("variant key is 'renju'", () => {
    expect(variantKey(31)).toBe('renju');
    expect(variantKey(32)).toBe('renju');
    expect(variantKey(81)).toBe('renju');
  });
  test('renju is not a go board', () => {
    expect(isGoBoard(31)).toBe(false);
  });
  test('renju 31 is offered in the picker', () => {
    expect(STANDARD_GAME_IDS).toContain(31);
  });
  test('renju star points are the 9 dots at cols/rows {3,7,11}', () => {
    const pts = boardSpecialPoints(31);
    expect(pts.map((p) => p.index).sort((a, b) => a - b)).toEqual([48, 52, 56, 108, 112, 116, 168, 172, 176]);
    expect(pts.every((p) => p.part === 52)).toBe(true);
  });
  test('existing variants unchanged', () => {
    expect(variantKey(1)).toBe('pente');
    expect(variantKey(29)).toBe('swap2-keryo');
    expect(gridSizeForGame(21)).toBe(9);
  });
});

describe('Tombstone identity', () => {
  test('isTombstone is true exactly for 33, 34, 83', () => {
    expect([33, 34, 83].every(isTombstone)).toBe(true);
    expect([1, 31, 32, 35, 81, 82, 84, undefined].some(isTombstone)).toBe(false);
  });
  test('variantKey maps 33/34/83 to tombstone-pente, renju and swap2-keryo unchanged', () => {
    expect(variantKey(33)).toBe('tombstone-pente');
    expect(variantKey(34)).toBe('tombstone-pente');
    expect(variantKey(83)).toBe('tombstone-pente');
    expect(variantKey(31)).toBe('renju');
    expect(variantKey(30)).toBe('swap2-keryo');
  });
  test('Tombstone is 19x19 with the non-go circles', () => {
    expect(gridSizeForGame(33)).toBe(19);
    expect(boardSpecialPoints(33)).toEqual(boardSpecialPoints(1));
  });
});

describe('selectableGameIds — only the games the current server offers', () => {
  const OLD_16 = STANDARD_GAME_IDS.filter((g) => g !== 33);
  const MAIN_ROOM = [];
  for (let g = 1; g <= 32; g++) MAIN_ROOM.push(g);
  test('Experimental (33, 34) -> only Tombstone', () => {
    expect(selectableGameIds([33, 34])).toEqual([33]);
  });
  test('a speed id alone still offers its standard id', () => {
    expect(selectableGameIds([34])).toEqual([33]);
  });
  test('Main Room / Beginners / KOTH / Arena (1..32) -> the 16 old ids, no Tombstone', () => {
    expect(selectableGameIds(MAIN_ROOM)).toEqual(OLD_16);
  });
  test('Go server -> only the three Go boards', () => {
    expect(selectableGameIds([19, 20, 21, 22, 23, 24])).toEqual([19, 21, 23]);
  });
  test('no server list -> the 16 old ids, no Tombstone', () => {
    expect(selectableGameIds(undefined)).toEqual(OLD_16);
  });
  test('same server list -> same array reference (no modal re-render per action)', () => {
    const ids = [33, 34];
    expect(selectableGameIds(ids)).toBe(selectableGameIds(ids));
  });
});
