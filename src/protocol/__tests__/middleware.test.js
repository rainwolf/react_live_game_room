import { describe, test, expect, vi } from 'vitest';
import { protocolMiddleware } from '../middleware';

const msg = (obj) => ({
  type: 'REDUX_WEBSOCKET::MESSAGE',
  payload: { message: JSON.stringify(obj) },
});

function run(action) {
  const next = vi.fn((a) => a);
  const dispatch = vi.fn();
  const result = protocolMiddleware({ dispatch })(next)(action);
  return { next, dispatch, result };
}

describe('protocol middleware — the inbound seam', () => {
  test('decodes a wss frame into a typed action for the reducer', () => {
    const { next } = run(
      msg({ dsgMoveTableEvent: { move: 1, moves: [1], player: 'x', table: 1, time: 0 } })
    );
    expect(next).toHaveBeenCalledWith({
      type: 'dsgMoveTableEvent',
      payload: { move: 1, moves: [1], player: 'x', table: 1, time: 0 },
    });
  });

  test('answers a server ping with a SEND echo and does not forward it', () => {
    const { next, dispatch, result } = run(msg({ dsgPingEvent: { time: 5 } }));
    expect(dispatch).toHaveBeenCalledWith({
      type: 'REDUX_WEBSOCKET::SEND',
      payload: { dsgPingEvent: { time: 5 } },
    });
    expect(next).not.toHaveBeenCalled();
    expect(result).toBeUndefined(); // swallowed — no leaked decode object
  });

  test('swallows a malformed frame — no typed action, no crash', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { next, dispatch, result } = run({
      type: 'REDUX_WEBSOCKET::MESSAGE',
      payload: { message: '{not json' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
    spy.mockRestore();
  });

  test('passes lifecycle actions (OPEN/CLOSED) through untouched', () => {
    const action = { type: 'REDUX_WEBSOCKET::OPEN' };
    const { next } = run(action);
    expect(next).toHaveBeenCalledWith(action);
  });

  test('passes ordinary local actions through untouched', () => {
    const action = { type: 'PRESSED_PLAY' };
    const { next } = run(action);
    expect(next).toHaveBeenCalledWith(action);
  });
});
