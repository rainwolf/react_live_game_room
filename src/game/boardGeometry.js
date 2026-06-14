// Board geometry — the per-variant visual shape of the board, derived from the game id.
// This knowledge was scattered inside Board.js's render (a 13-branch style chain, the
// gridsize block, and the star-point/circle placement) and the gridsize half was duplicated
// in GameClass.setGame. Concentrating it here gives one tested home and lets the board
// component ask for geometry instead of re-deriving it from game-id ranges.
//
// Special-point "part" codes match BoardSquare: 51 = circle marker (non-go boards),
// 52 = star dot (go boards).

// The board grid size for a game: 9x9 and 13x13 only for the small Go variants, 19x19
// everywhere else. Used by both GameClass.setGame and Board.
export function gridSizeForGame(gameId) {
  if (gameId === 21 || gameId === 22) return 9;
  if (gameId === 23 || gameId === 24) return 13;
  return 19;
}

// The CSS class that styles the board for a variant (range-keyed, lowest id first).
export function boardStyleClass(gameId) {
  if (gameId < 3) return 'pente';
  if (gameId < 5) return 'keryo-pente';
  if (gameId < 7) return 'gomoku';
  if (gameId < 9) return 'd-pente';
  if (gameId < 11) return 'g-pente';
  if (gameId < 13) return 'poof-pente';
  if (gameId < 15) return 'connect6';
  if (gameId < 17) return 'boat-pente';
  if (gameId < 19) return 'dk-pente';
  if (gameId < 25) return 'go';
  if (gameId < 27) return 'o-pente';
  if (gameId < 29) return 'swap2-pente';
  return 'swap2-keryo';
}

// Is this game id a Go board (19..24)? The geometry definition of a go board; GameClass.isGo
// delegates here so the boundary lives in exactly one place.
export function isGoBoard(gameId) {
  return gameId > 18 && gameId < 25;
}

const CIRCLES = [120, 126, 180, 234, 240]; // non-go boards
// The star-dot layout is purely a function of the board grid size, so key the table by it
// (reusing gridSizeForGame) rather than re-deriving the id grouping.
const GO_DOTS = {
  19: [60, 66, 72, 174, 180, 186, 288, 294, 300], // 19x19 (games 19, 20)
  9: [20, 24, 40, 56, 60], // 9x9 (games 21, 22)
  13: [42, 45, 48, 81, 84, 87, 120, 123, 126], // 13x13 (games 23, 24)
};

// The marked board points for a variant: circles (part 51) on the non-go boards, star dots
// (part 52) on the go boards. Returns [{index, part}] so the caller stamps board[index].part.
export function boardSpecialPoints(gameId) {
  if (!isGoBoard(gameId)) {
    return CIRCLES.map((index) => ({ index, part: 51 }));
  }
  return GO_DOTS[gridSizeForGame(gameId)].map((index) => ({ index, part: 52 }));
}
