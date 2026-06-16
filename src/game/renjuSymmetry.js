// Client-side D4 (dihedral-8) duplicate check for the Branch-B fifth-move offers, mirroring
// the server's RenjuState.offerFifthMove rejection. The ten offers must contain no two points
// that are equivalent under the board's 8 symmetries about the center. UX pre-check only —
// the server is authoritative. 15x15 board, center (7,7); index = x + y*15. Offers are NOT
// box-constrained (any in-bounds empty non-symmetric point is legal).

const SIZE = 15;
const C = 7;

// The 8 dihedral images of a board point (rotations + reflections about the centre).
export function d4Images(move) {
  const x = move % SIZE, y = Math.floor(move / SIZE);
  const dx = x - C, dy = y - C;
  const orbit = [
    [dx, dy], [-dy, dx], [-dx, -dy], [dy, -dx],   // rotations 0/90/180/270
    [-dx, dy], [dx, -dy], [dy, dx], [-dy, -dx],    // reflections
  ];
  return orbit.map(([tx, ty]) => (tx + C) + (ty + C) * SIZE);
}

// True if `move` collides (under any symmetry) with an already-accepted offer.
export function isSymmetricDup(move, accepted) {
  const acc = new Set(accepted);
  return d4Images(move).some((img) => acc.has(img));
}
