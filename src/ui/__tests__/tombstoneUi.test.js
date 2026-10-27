import { describe, test, expect } from 'vitest';
import { INITIAL, tombstoneMarkPending, tombstoneUiReducer, ADVANCING_EVENTS } from '../tombstoneUi';

describe('tombstoneUi slice', () => {
  test('mark pending, unrelated actions keep the reference', () => {
    const p = tombstoneUiReducer(INITIAL, tombstoneMarkPending());
    expect(p).toEqual({ pending: true });
    expect(tombstoneUiReducer(p, { type: 'dsgTextTableEvent' })).toBe(p);
    expect(tombstoneUiReducer(INITIAL, { type: 'dsgMoveTableEvent' })).toBe(INITIAL);
  });
  test.each([
    'dsgMoveTableEvent', 'dsgTombstoneSkipDeadTableEvent', 'dsgMoveTableErrorEvent',
    'dsgTombstoneSkipDeadTableErrorEvent', 'dsgUndoReplyTableEvent', 'dsgGameStateTableEvent',
    'dsgChangeStateTableEvent', 'dsgExitTableEvent', 'dsgBootTableEvent',
  ])('pending cleared by %s', (type) => {
    expect(ADVANCING_EVENTS.has(type)).toBe(true);
    expect(tombstoneUiReducer({ pending: true }, { type })).toEqual({ pending: false });
  });
});
