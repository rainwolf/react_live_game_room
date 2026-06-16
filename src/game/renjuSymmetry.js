// Client-side symmetry dedup for the Branch-B fifth-move offers — a UX pre-check that mirrors
// the server's RenjuState.isSymmetricDuplicate (and the turn-based JSP renjuIsSymmetricDup in
// gameServer/tb/mobileGame.jsp). The server is authoritative; this just gives instant feedback.
// 15x15 board, centre at index 112; move index = x + y*size.
//
// IMPORTANT: dedup is relative to the symmetry of the CURRENT PLACED POSITION (its stabilizer),
// NOT the full 8-element D4 group. A candidate is a duplicate only if some symmetry that maps the
// placed stones onto themselves also maps the candidate onto an already-offered point. For a
// typical (asymmetric) opening the stabilizer is just {identity}, so only an EXACT duplicate is
// rejected; rotated/reflected points are legal. Only when the placed stones are themselves
// symmetric do rotated offers collide. (Mirrors RENJU_ROTX/ROTY/ROTF + renjuStabilizer in the JSP
// and positionStabilizer()/rotateMove() in RenjuState.java.)

const SIZE = 15;
// The 8 D4 operations, identical to the server's rotateMove and the JSP's RENJU_ROTX/Y/F.
const ROTX = [1, 1, 1, 1, -1, -1, -1, -1];
const ROTY = [1, 1, -1, -1, -1, -1, 1, 1];
const ROTF = [0, 1, 0, 1, 0, 1, 0, 1];

// Image of `move` under D4 operation r (0..7), about the board centre.
export function renjuRotate(move, r, size = SIZE) {
  const off = Math.floor(size / 2);
  const x = (move % size) - off;
  const y = Math.floor(move / size) - off;
  let x1 = x * ROTX[r];
  let y1 = y * ROTY[r];
  if (ROTF[r]) { const t = x1; x1 = y1; y1 = t; }
  return (x1 + off) + (y1 + off) * size;
}

// The operations (0..7) that map the current placed, COLOURED position onto itself — its
// stabilizer subgroup. `valueAt(move)` returns the board stone value at that point (0 = empty).
export function renjuStabilizer(valueAt, size = SIZE) {
  const stab = [];
  for (let r = 0; r < 8; r++) {
    let invariant = true;
    for (let m = 0; m < size * size && invariant; m++) {
      const v = valueAt(m);
      if (v > 0 && valueAt(renjuRotate(m, r, size)) !== v) invariant = false;
    }
    if (invariant) stab.push(r);
  }
  return stab;
}

// True if `move` maps onto an already-offered point under some operation in `stab` (a precomputed
// stabilizer). Caller computes the stabilizer once per render and reuses it across candidates.
export function isOfferDup(move, offers, stab, size = SIZE) {
  const acc = new Set(offers);
  return stab.some((r) => acc.has(renjuRotate(move, r, size)));
}

// Convenience: compute the stabilizer from the placed position and test in one call.
export function isSymmetricDup(move, offers, valueAt, size = SIZE) {
  return isOfferDup(move, offers, renjuStabilizer(valueAt, size), size);
}
