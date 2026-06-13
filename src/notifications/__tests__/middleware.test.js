import { describe, test, expect, vi } from 'vitest';

vi.mock('../audio', () => ({ AudioService: { play: vi.fn() } }));
vi.mock('../../utils/tabNotify', () => ({ notifyTabActivity: vi.fn() }));

import { notificationMiddleware } from '../middleware';
import { AudioService } from '../audio';
import { notifyTabActivity } from '../../utils/tabNotify';

function run(state, action = { type: 'dsgMoveTableEvent' }) {
  const dispatch = vi.fn();
  const next = vi.fn((a) => a);
  const result = notificationMiddleware({ getState: () => state, dispatch })(next)(action);
  return { dispatch, next, result };
}

describe('notification middleware — drains pendingNotifications into side effects', () => {
  test('fires queued sound + tab intents, then clears the queue', () => {
    AudioService.play.mockClear();
    notifyTabActivity.mockClear();
    const state = {
      pendingNotifications: [{ sound: 'move' }, { sound: 'newPlayer', tab: 'x joined your table' }],
    };
    const { dispatch, next } = run(state);
    expect(next).toHaveBeenCalled(); // reducer ran first
    expect(AudioService.play).toHaveBeenCalledWith('move');
    expect(AudioService.play).toHaveBeenCalledWith('newPlayer');
    expect(notifyTabActivity).toHaveBeenCalledWith('x joined your table');
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_NOTIFICATIONS' });
  });

  test('does nothing when the queue is empty', () => {
    AudioService.play.mockClear();
    const { dispatch } = run({ pendingNotifications: [] });
    expect(AudioService.play).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('tolerates an undefined queue', () => {
    const { dispatch } = run({});
    expect(dispatch).not.toHaveBeenCalled();
  });

  test('a throwing effect does not skip later intents or block the queue clear', () => {
    AudioService.play.mockClear();
    notifyTabActivity.mockClear();
    notifyTabActivity.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { dispatch } = run({ pendingNotifications: [{ tab: 'bad' }, { sound: 'move' }] });
    expect(AudioService.play).toHaveBeenCalledWith('move'); // 2nd intent still fired
    expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_NOTIFICATIONS' }); // queue still cleared
    spy.mockRestore();
  });
});
