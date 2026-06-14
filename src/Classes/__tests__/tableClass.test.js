import { describe, test, expect } from 'vitest';
import Table from '../TableClass';

function tableForGame(g) {
  const t = new Table();
  t.game = g;
  return t;
}

describe('TableClass go-range is 19..24 inclusive (consistent with GameClass.isGo)', () => {
  test('game 19 is a go board', () => {
    expect(tableForGame(19).gameIsGo()).toBe(true);
  });
  test('boundaries: 18 non-go, 20 and 24 go, 25 non-go', () => {
    expect(tableForGame(18).gameIsGo()).toBe(false);
    expect(tableForGame(20).gameIsGo()).toBe(true);
    expect(tableForGame(24).gameIsGo()).toBe(true);
    expect(tableForGame(25).gameIsGo()).toBe(false);
  });
  test('colorForSeat treats game 19 as go (seats swapped, matching player_color)', () => {
    const t = tableForGame(19);
    expect(t.colorForSeat(1)).toBe('grey');
    expect(t.colorForSeat(2)).toBe('white');
  });
  test('a non-go board (pente) leaves the seat colors unswapped', () => {
    const t = tableForGame(1);
    expect(t.colorForSeat(1)).toBe('white');
    expect(t.colorForSeat(2)).toBe('grey');
  });
  test('player_color swaps stone colour for go (19) but not non-go (18) — same go-range', () => {
    // go: seat 1 plays black, seat 2 white (swapped); colorForSeat agrees (seat 1 -> grey)
    expect(tableForGame(19).player_color(1)).toBe('black-stone-gradient');
    expect(tableForGame(19).player_color(2)).toBe('white-stone-gradient');
    // non-go: seat 1 white, seat 2 black (unswapped)
    expect(tableForGame(18).player_color(1)).toBe('white-stone-gradient');
    expect(tableForGame(18).player_color(2)).toBe('black-stone-gradient');
  });
});

describe('table_color — lobby card colour per variant (derived from variantKey)', () => {
  const cases = [
    [1, '#FDDEA3'], [3, '#BAFDA3'], [5, '#A3FDEB'], [7, '#A3CDFD'], [9, '#AEA3FD'],
    [11, '#EDA3FD'], [13, '#EDA3FD'], [15, '#25BAFF'], [17, '#FFA500'], [19, '#FAC832'],
    [24, '#FAC832'], [25, '#52BE80'], [27, '#E5AA70'], [29, '#50C878'], [30, '#50C878'],
  ];
  test.each(cases)('game %i -> %s', (g, expected) => {
    expect(tableForGame(g).table_color()).toBe(expected);
  });
  test('poof-pente (11) and connect6 (13) share a colour', () => {
    expect(tableForGame(11).table_color()).toBe(tableForGame(13).table_color());
  });
  test('VARIANT_COLORS covers every variant key (no undefined colour) + unset-game fallback', () => {
    for (let g = 1; g <= 32; g++) {
      expect(typeof tableForGame(g).table_color()).toBe('string'); // missing key -> undefined would fail
    }
    expect(new Table().table_color()).toBe('#50C878'); // default-constructed table, this.game unset
  });
});

describe('gameHasCaptures derives from variantKey (gomoku is the only no-capture variant)', () => {
  test('false only for gomoku (5,6)', () => {
    expect(tableForGame(5).gameHasCaptures()).toBe(false);
    expect(tableForGame(6).gameHasCaptures()).toBe(false);
    expect(tableForGame(1).gameHasCaptures()).toBe(true);
    expect(tableForGame(7).gameHasCaptures()).toBe(true);
    expect(tableForGame(19).gameHasCaptures()).toBe(true);
  });
});
