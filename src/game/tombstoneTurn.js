// React twin of the server's TombstoneCodes (spec section 16.1). The only place
// that decodes Tombstone move codes; never treat gridSize*gridSize as a pass here.

export const TOMBSTONE_DEAD_OFFSET = 361;
export const TOMBSTONE_OWN_PASS = 722;
export const DEAD_CELL = 3;

export function decodeTombstone(code) {
  if (!Number.isInteger(code)) return null;
  if (code >= 0 && code <= 360) return { kind: 'own', point: code };
  if (code >= TOMBSTONE_DEAD_OFFSET && code <= 721) {
    return { kind: 'dead', point: code - TOMBSTONE_DEAD_OFFSET };
  }
  if (code === TOMBSTONE_OWN_PASS) return { kind: 'pass', point: -1 };
  return null;
}

export function isOwnEntry(code) {
  const d = decodeTombstone(code);
  return d !== null && (d.kind === 'own' || d.kind === 'pass');
}

export function turnPlayer(t) {
  return t % 2 === 1 ? 2 : 1;
}

export function parseTombstoneTurns(moves) {
  const turns = [];
  (moves || []).forEach((code, i) => {
    const d = decodeTombstone(code);
    if (d === null) return;
    if (d.kind === 'dead') {
      const open = turns[turns.length - 1];
      if (open && open.dead === -1) {
        open.dead = code;
        open.end = i;
      }
      return;
    }
    turns.push({ player: turnPlayer(turns.length), own: code, dead: -1, start: i, end: i });
  });
  return turns;
}

function countOwn(moves, upto) {
  let n = 0;
  for (let i = 0; i <= upto && i < moves.length; i++) if (isOwnEntry(moves[i])) n++;
  return n;
}

export function tombstoneEntryPlayer(moves, i) {
  return turnPlayer(countOwn(moves, i) - 1);
}

export function tombstonePhase(moves, trailingClosed) {
  if (!moves || moves.length === 0) return { player: 1, phase: 'OWN' };
  const last = moves.length - 1;
  const ownCount = countOwn(moves, last);
  if (last > 0 && isOwnEntry(moves[last]) && !trailingClosed) {
    return { player: turnPlayer(ownCount - 1), phase: 'DEAD' };
  }
  return { player: (ownCount % 2) + 1, phase: 'OWN' };
}

export function tombstoneButton(moves, trailingClosed, pending) {
  if (pending || !moves || moves.length === 0) return null;
  const { phase } = tombstonePhase(moves, trailingClosed);
  return phase === 'DEAD'
    ? { label: 'Skip dead stone', action: 'skipDead' }
    : { label: 'Place only a dead stone', action: 'ownPass' };
}

export function tombstoneTurnLabel(turn, coord) {
  const own = turn.own === TOMBSTONE_OWN_PASS ? 'PASS' : coord(turn.own);
  const dead = turn.dead !== -1 ? ' + dead ' + coord(turn.dead - TOMBSTONE_DEAD_OFFSET) : '';
  return own + dead;
}

export function tombstoneUndoSeat(moves, trailingClosed) {
  if (tombstonePhase(moves, trailingClosed).phase !== 'OWN') return 0;
  const turns = parseTombstoneTurns(moves);
  if (turns.length <= 1) return 0;
  return turns[turns.length - 1].player;
}

export function tombstoneStepTarget(moves, until, forward) {
  const turns = parseTombstoneTurns(moves);
  const find = (i) => turns.find((t) => t.start <= i && i <= t.end);
  if (forward) {
    if (until >= moves.length) return until;
    const t = find(until);
    return t ? t.end + 1 : until + 1;
  }
  if (until <= 1) return until;
  const t = find(until - 1);
  return Math.max(1, t ? t.start : until - 1);
}
