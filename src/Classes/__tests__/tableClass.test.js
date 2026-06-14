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
