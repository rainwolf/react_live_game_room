import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FREEZE_MS,
  MIN_WINDOW_MS,
  PHASE,
  initialFreezeState,
  freezeReducer,
  timerFor,
  createFreezeController,
} from '../arenaRequestFreeze';

const rows = (...players) => players.map((player, i) => ({ player, seq: i + 1 }));
const snapshot = (requests, urgent = false) => ({ type: 'snapshot', requests, urgent });
const tick = (s) => freezeReducer(s, { type: 'tick', epoch: s.epoch });
const names = (s) => s.shown.map((r) => r.player);
// a visible list, idle (its first minimum window has ended)
const idleShowing = (...players) =>
  tick(tick(freezeReducer(initialFreezeState, snapshot(rows(...players)))));

describe('freezeReducer — the pure C2 state machine', () => {
  test('starts idle with nothing shown and no timer', () => {
    expect(initialFreezeState.phase).toBe(PHASE.IDLE);
    expect(initialFreezeState.shown).toEqual([]);
    expect(timerFor(initialFreezeState)).toBeNull();
  });

  test('a snapshot while no rows are shown freezes with zero rows, then the tick shows them and opens the window', () => {
    let s = freezeReducer(initialFreezeState, snapshot(rows('a')));
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(s.shown).toEqual([]);
    expect(timerFor(s)).toBe(FREEZE_MS);
    s = tick(s);
    expect(names(s)).toEqual(['a']);
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(timerFor(s)).toBe(MIN_WINDOW_MS);
  });

  test('an empty snapshot while no rows are shown changes nothing', () => {
    expect(freezeReducer(initialFreezeState, snapshot([]))).toBe(initialFreezeState);
  });

  test('the window ending with nothing held goes idle', () => {
    const s = idleShowing('a');
    expect(s.phase).toBe(PHASE.IDLE);
    expect(names(s)).toEqual(['a']);
    expect(timerFor(s)).toBeNull();
  });

  test('a snapshot while rows are shown and idle freezes without changing the rows', () => {
    const s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(s)).toEqual(['a']);
    expect(timerFor(s)).toBe(FREEZE_MS);
  });

  test('the freeze ending applies the held snapshot and opens the window', () => {
    const s = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b'))));
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(names(s)).toEqual(['a', 'b']);
    expect(s.held).toBeNull();
  });

  test('snapshots during a freeze replace the held one; only the last is applied', () => {
    let s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    s = freezeReducer(s, snapshot(rows('a', 'b', 'c')));
    s = freezeReducer(s, snapshot(rows('c')));
    expect(names(tick(s))).toEqual(['c']);
  });

  test('a snapshot during a freeze does not restart the freeze timer', () => {
    const frozen = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(freezeReducer(frozen, snapshot(rows('c'))).epoch).toBe(frozen.epoch);
  });

  test('a snapshot inside the window is held without changing rows; the window end starts the next freeze', () => {
    let s = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')))); // window, showing a,b
    s = freezeReducer(s, snapshot(rows('b')));
    expect(s.phase).toBe(PHASE.WINDOW);
    expect(names(s)).toEqual(['a', 'b']);
    s = tick(s);
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(s)).toEqual(['a', 'b']);
    s = tick(s);
    expect(names(s)).toEqual(['b']);
  });

  test('an urgent snapshot (the answer to my own accept/decline) freezes at once even inside the window', () => {
    const win = tick(freezeReducer(idleShowing('a'), snapshot(rows('a', 'b'))));
    const s = freezeReducer(win, snapshot(rows('b'), true));
    expect(s.phase).toBe(PHASE.FROZEN);
    expect(names(tick(s))).toEqual(['b']);
  });

  test('an empty snapshot while visible freezes, then leaves nothing shown (the list hides)', () => {
    let s = freezeReducer(idleShowing('a'), snapshot([]));
    expect(s.phase).toBe(PHASE.FROZEN);
    s = tick(s);
    expect(s.shown).toEqual([]);
  });

  test('a stale tick (older epoch) is ignored', () => {
    const s = freezeReducer(idleShowing('a'), snapshot(rows('a', 'b')));
    expect(freezeReducer(s, { type: 'tick', epoch: s.epoch - 1 })).toBe(s);
  });

  test('a tick while idle is ignored', () => {
    const s = idleShowing('a');
    expect(tick(s)).toBe(s);
  });
});

describe('createFreezeController — owns the single timer (fake timers)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('the first snapshot freezes with zero rows, then shows after FREEZE_MS; each change is reported', () => {
    const phases = [];
    const c = createFreezeController((s) => phases.push(s.phase));
    c.push(rows('a'));
    expect(c.getState().shown).toEqual([]);
    expect(phases).toEqual([PHASE.FROZEN]);
    vi.advanceTimersByTime(FREEZE_MS);
    expect(names(c.getState())).toEqual(['a']);
    expect(phases).toEqual([PHASE.FROZEN, PHASE.WINDOW]);
  });

  test('a freeze lasts FREEZE_MS, then the newest snapshot shows', () => {
    const c = createFreezeController(() => {});
    c.push(rows('a'));
    vi.advanceTimersByTime(FREEZE_MS + MIN_WINDOW_MS);
    expect(c.getState().phase).toBe(PHASE.IDLE);
    c.push(rows('a', 'b'));
    vi.advanceTimersByTime(FREEZE_MS - 1);
    expect(c.getState().phase).toBe(PHASE.FROZEN);
    expect(names(c.getState())).toEqual(['a']);
    vi.advanceTimersByTime(1);
    expect(c.getState().phase).toBe(PHASE.WINDOW);
    expect(names(c.getState())).toEqual(['a', 'b']);
  });

  test('a burst of snapshots never locks the owner out: every unfreeze gives >= MIN_WINDOW_MS of interactivity', () => {
    const c = createFreezeController(() => {});
    c.push(rows('a'));
    vi.advanceTimersByTime(FREEZE_MS);
    const runs = [];
    let interactive = 0;
    for (let t = 0; t < 6000; t++) {
      if (t % 50 === 0) c.push(rows('a', 'n' + t)); // a fresh snapshot every 50 ms
      const frozenBefore = c.getState().phase === PHASE.FROZEN;
      vi.advanceTimersByTime(1);
      const frozenAfter = c.getState().phase === PHASE.FROZEN;
      if (frozenBefore) {
        interactive = 0;
      } else {
        interactive += 1;
        if (frozenAfter) {
          runs.push(interactive);
          interactive = 0;
        }
      }
    }
    expect(runs.length).toBeGreaterThanOrEqual(3);
    for (const run of runs) {
      expect(run).toBeGreaterThanOrEqual(MIN_WINDOW_MS);
    }
    // once the burst stops, the newest snapshot is applied and the list settles
    vi.advanceTimersByTime(3000);
    expect(names(c.getState())).toEqual(['a', 'n5950']);
    expect(c.getState().phase).toBe(PHASE.IDLE);
  });

  test('dispose cancels the timer and ignores later pushes', () => {
    const onChange = vi.fn();
    const c = createFreezeController(onChange);
    c.push(rows('a'));
    expect(vi.getTimerCount()).toBe(1);
    c.dispose();
    expect(vi.getTimerCount()).toBe(0);
    c.push(rows('b'));
    vi.advanceTimersByTime(5000);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
