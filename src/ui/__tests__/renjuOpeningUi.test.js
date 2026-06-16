import { describe, test, expect } from 'vitest';
import {
  renjuOpeningUiReducer, renjuBeginPlace, renjuBeginOffer, renjuTogglePick, renjuResetOpeningUi,
} from '../renjuOpeningUi';

const init = () => renjuOpeningUiReducer(undefined, { type: '@@INIT' });

describe('renjuOpeningUi slice', () => {
  test('initial state is idle with no picks', () => {
    expect(init()).toEqual({ mode: 'idle', picks: [] });
  });
  test('beginPlace -> placing; beginOffer -> offering (picks reset)', () => {
    expect(renjuOpeningUiReducer(init(), renjuBeginPlace())).toEqual({ mode: 'placing', picks: [] });
    expect(renjuOpeningUiReducer({ mode: 'idle', picks: [9] }, renjuBeginOffer())).toEqual({ mode: 'offering', picks: [] });
  });
  test('togglePick adds then removes (only in offering mode)', () => {
    let s = renjuOpeningUiReducer(init(), renjuBeginOffer());
    s = renjuOpeningUiReducer(s, renjuTogglePick(40));
    expect(s.picks).toEqual([40]);
    s = renjuOpeningUiReducer(s, renjuTogglePick(40));
    expect(s.picks).toEqual([]);
  });
  test('reset -> idle/empty', () => {
    expect(renjuOpeningUiReducer({ mode: 'offering', picks: [1, 2] }, renjuResetOpeningUi())).toEqual({ mode: 'idle', picks: [] });
  });
  test('unrelated action returns the SAME reference (no-op, matches modals slice)', () => {
    const s = init();
    expect(renjuOpeningUiReducer(s, { type: 'SOMETHING_ELSE' })).toBe(s);
  });
});
