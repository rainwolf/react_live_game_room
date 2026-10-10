// @vitest-environment jsdom
//
// Wiring test for the thin hook: the timing rules themselves are pinned in
// arenaRequestFreeze.test.js. This checks the hook pushes a record once per new record
// object, exposes {rows, frozen}, never renders a new record unlocked, and cancels its
// timer on unmount.
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe, test, expect, beforeEach, afterEach, vi} from 'vitest';
import {useFrozenRequests} from '../useFrozenRequests';
import {FREEZE_MS, MIN_WINDOW_MS} from '../arenaRequestFreeze';

let seen;
let renders; // every render's result, in order (act() would hide intermediate renders)
function Probe({record}) {
  seen = useFrozenRequests(record);
  renders.push({players: seen.rows.map((r) => r.player), frozen: seen.frozen});
  return null;
}

const rec = (...players) => ({
  table: 3,
  requests: players.map((player, i) => ({player, seq: i + 1})),
  answersAction: false,
});
const names = () => seen.rows.map((r) => r.player);

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  renders = [];
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

const render = (record) => act(() => {
  root.render(<Probe record={record}/>);
});
const advance = (ms) => act(() => {
  vi.advanceTimersByTime(ms);
});

describe('useFrozenRequests', () => {
  test('no record (not my table) shows no rows', () => {
    render(undefined);
    expect(names()).toEqual([]);
    expect(seen.frozen).toBe(false);
  });

  test('the first record opens frozen with zero rows (spinner), then shows interactive', () => {
    render(rec('a'));
    expect(names()).toEqual([]);
    expect(seen.frozen).toBe(true);
    advance(FREEZE_MS);
    expect(names()).toEqual(['a']);
    expect(seen.frozen).toBe(false);
  });

  test('a new record while rows are shown freezes for FREEZE_MS, then applies', () => {
    render(rec('a'));
    advance(FREEZE_MS + MIN_WINDOW_MS);
    render(rec('a', 'b'));
    expect(seen.frozen).toBe(true);
    expect(names()).toEqual(['a']);
    advance(FREEZE_MS);
    expect(seen.frozen).toBe(false);
    expect(names()).toEqual(['a', 'b']);
  });

  test('re-rendering with the same record object does not freeze again', () => {
    const r = rec('a');
    render(r);
    advance(MIN_WINDOW_MS);
    render(r);
    expect(seen.frozen).toBe(false);
  });

  test('an answersAction record freezes at once inside the window', () => {
    render(rec('a', 'b'));
    advance(FREEZE_MS);
    render({...rec('b'), answersAction: true});
    expect(seen.frozen).toBe(true);
  });

  test('the very render that first sees a new record already reports it frozen', () => {
    // The reducer clears the owner's in-flight marker in the same step that stores the
    // answering snapshot, so the component's other lock is gone on that render. If the
    // hook reported unfrozen until its effect ran, the old rows would show enabled
    // Accept/Decline for a frame.
    render(rec('a', 'b'));
    advance(FREEZE_MS + MIN_WINDOW_MS);
    renders = [];
    render({...rec('b'), answersAction: true});
    expect(renders.length).toBeGreaterThan(0);
    expect(renders.every((r) => r.frozen)).toBe(true);
    expect(renders[0].players).toEqual(['a', 'b']);
  });

  test('unmount cancels the pending freeze timer', () => {
    render(rec('a'));
    advance(FREEZE_MS + MIN_WINDOW_MS);
    render(rec('a', 'b'));
    const before = vi.getTimerCount();
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(before - 1);
    root = createRoot(container); // afterEach unmounts this fresh root
  });
});
