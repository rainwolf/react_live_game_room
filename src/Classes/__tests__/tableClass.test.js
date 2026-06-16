import { describe, test, expect } from 'vitest';
import Table from '../TableClass';
import { Game, GameState } from '../GameClass';

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
    [31, '#D98880'], [81, '#D98880'], // renju (live + TB): distinct rose, NOT gomoku aqua (#A3FDEB)
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

describe('clockRunning — the clock ticks only for the active seat of a fully-seated, started game', () => {
  const seated = ({ timed = true, seat1 = 'alice', seat2 = 'bob' } = {}) => {
    const t = new Table();
    t.timed = timed;
    t.seats = [undefined, seat1, seat2];
    return t;
  };
  const game = (player, state = GameState.State.STARTED) => ({
    currentPlayer: () => player,
    gameState: { state },
  });

  test('runs for the seat whose turn it is when both are seated and the game is started', () => {
    expect(seated().clockRunning(game(1), 1)).toBe(true);
    expect(seated().clockRunning(game(2), 2)).toBe(true);
  });
  test('does not run for the seat whose turn it is NOT', () => {
    expect(seated().clockRunning(game(1), 2)).toBe(false);
  });
  test('PAUSED when fewer than two players are seated', () => {
    expect(seated({ seat2: '' }).clockRunning(game(1), 1)).toBe(false);
    expect(seated({ seat1: '' }).clockRunning(game(1), 1)).toBe(false);
    expect(seated({ seat1: '', seat2: '' }).clockRunning(game(1), 1)).toBe(false);
  });
  test('PAUSED when the game is not in the STARTED state', () => {
    expect(seated().clockRunning(game(1, GameState.State.NOT_STARTED), 1)).toBe(false);
    expect(seated().clockRunning(game(1, GameState.State.PAUSED), 1)).toBe(false);
    expect(seated().clockRunning(game(1, GameState.State.HALFSET), 1)).toBe(false);
  });
  test('PAUSED on an untimed table', () => {
    expect(seated({ timed: false }).clockRunning(game(1), 1)).toBe(false);
  });
});

function startedRenju(moves, awaitingSwap = true) {
  const g = new Game(); g.setGame(31); g.gameState.state = GameState.State.STARTED;
  moves.forEach((m) => g.addMove(m));
  g.gameState.renjuState.awaitingSwap = awaitingSwap;
  return g;
}

describe('myRenjuChoice + board helpers', () => {
  test('the to-move seated player has a renju choice during a swap window', () => {
    const g = startedRenju([112]); // n=1, awaiting -> player 2 to move
    const t = new Table({ table: 5, initialMinutes: 10 });
    t.seats = [undefined, 'alice', 'bob']; t.me = 'bob'; // bob is seat 2
    expect(t.myRenjuChoice(g)).toBe(true);
    t.me = 'alice';
    expect(t.myRenjuChoice(g)).toBe(false);
  });
  test('renjuBoxRadius: numMoves 1..4 -> that radius; else 0 (whole board)', () => {
    const g = new Game(); g.setGame(31);
    g.moves = [0]; expect(g.renjuBoxRadius()).toBe(1);     // placing move 2 -> 3x3
    g.moves = [0, 0, 0, 0]; expect(g.renjuBoxRadius()).toBe(4); // placing move 5 -> 9x9
    g.moves = [0, 0, 0, 0, 0]; expect(g.renjuBoxRadius()).toBe(0); // move 6 -> anywhere
  });
});
