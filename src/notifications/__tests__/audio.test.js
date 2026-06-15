import { describe, test, expect, vi, afterEach } from 'vitest';
import { AudioService } from '../audio';

afterEach(() => {
  delete global.Audio;
});

describe('AudioService — lazy, guarded sound seam', () => {
  test('play is a no-op (no throw) when Audio is unavailable (node/SSR/test)', () => {
    expect(typeof Audio).toBe('undefined');
    expect(() => AudioService.play('move')).not.toThrow();
  });

  test('ignores an unknown sound name (no Audio constructed)', () => {
    global.Audio = vi.fn(() => ({ play: () => Promise.resolve() }));
    AudioService.play('nope');
    expect(global.Audio).not.toHaveBeenCalled();
  });

  test('lazily constructs the mapped Audio once and plays it on every call', () => {
    const play = vi.fn(() => Promise.resolve());
    global.Audio = vi.fn(() => ({ play }));
    AudioService.play('newPlayer');
    AudioService.play('newPlayer');
    expect(global.Audio).toHaveBeenCalledTimes(1); // cached after first
    expect(play).toHaveBeenCalledTimes(2);
  });

  test('swallows a rejected play() (autoplay policy) without throwing', () => {
    global.Audio = vi.fn(() => ({ play: () => Promise.reject(new Error('blocked')) }));
    expect(() => AudioService.play('lowTime')).not.toThrow();
  });
});
