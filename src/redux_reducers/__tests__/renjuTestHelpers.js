// Shared fixtures for the Renju opening/tracking reducer tests. Kept in ONE place so
// renjuTracking.test.js and renjuSwapBranchA.test.js do not each re-implement renjuState()/move/etc.
// NOTE: this is NOT a test suite. The vitest `include` is `src/**/*.test.js`, so a file without
// `.test.` in its name is never collected as a spec (no "empty suite" error).
import { addMove } from '../utils';
import { Game, GameState } from '../../Classes/GameClass';
import Table from '../../Classes/TableClass';
import { renjuPhase, renjuModalButtons } from '../../game/openingPhase';

// A started Renju game (variant 31) sat at table 5 with `alice` as me.
export function renjuState() {
  const g = new Game();
  g.setGame(31);
  g.gameState.state = GameState.State.STARTED;
  const t = new Table({ table: 5, initialMinutes: 10 });
  t.me = 'alice';
  return { game: g, tables: { 5: t }, table: 5, me: 'alice', pendingNotifications: [] };
}

// Dispatch a single incremental server move.
export const move = (s, m, player = 'srv') =>
  addMove({ table: 5, move: m, moves: [m], player }, s);

// Dispatch a bulk move-list (rejoin/state-sync replay): one event carrying the full list.
export const bulk = (s, arr, player = 'srv') =>
  addMove({ table: 5, move: arr[arr.length - 1], moves: arr, player }, s);

// A fresh state with the standard 4 moves played -> the move-4 swap window is open.
export const opened4 = () => {
  const s = renjuState();
  [112, 113, 97, 98].forEach((m) => move(s, m)); // n=4, swap window open
  return s;
};

// Opening phase derived from the current move count + renju tracking state.
export const phaseOf = (s) => renjuPhase(s.game.moves.length, s.game.gameState.renjuState);

// Modal buttons offered to the acting player (isMyTurn = true).
export const buttonsOf = (s) =>
  renjuModalButtons(s.game.moves.length, s.game.gameState.renjuState, true);
