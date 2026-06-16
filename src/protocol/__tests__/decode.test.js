import { describe, test, expect } from 'vitest';
import fixtures from '../__fixtures__/wire-fixtures.json';
import { decode } from '../decode';

// Wrap an inner dsg* payload the way @giantmachines/redux-websocket delivers it.
const wrap = (type, payload) => ({
  type: 'REDUX_WEBSOCKET::MESSAGE',
  payload: { message: JSON.stringify({ [type]: payload }) },
});

const inbound = Object.entries(fixtures.messages).filter(([, e]) => e.in);
const errorEvents = Object.entries(fixtures.errorEvents);

describe('decode — characterization over real captured frames', () => {
  test.each(inbound)('decodes inbound %s into {type, payload}', (type, entry) => {
    const r = decode(wrap(type, entry.in));
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe(type);
    expect(r.event.payload).toEqual(entry.in);
  });

  test.each(errorEvents)('decodes error event %s', (type, byCode) => {
    const sample = Object.values(byCode)[0];
    const r = decode(wrap(type, sample));
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe(type);
    expect(r.event.payload).toEqual(sample);
  });

  test('recognizes dsgPingEvent (the pinger message)', () => {
    const r = decode(wrap('dsgPingEvent', { time: 123 }));
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe('dsgPingEvent');
  });
});

describe('decode — validation surfaces errors instead of corrupting state', () => {
  test('rejects malformed JSON', () => {
    const r = decode({ type: 'REDUX_WEBSOCKET::MESSAGE', payload: { message: '{not json' } });
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('parse');
  });

  test('rejects an unknown event type', () => {
    const r = decode(wrap('dsgTotallyMadeUpEvent', { table: 1 }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('unknown');
    expect(r.error.type).toBe('dsgTotallyMadeUpEvent');
  });

  test('rejects a non-object payload', () => {
    const r = decode(wrap('dsgMoveTableEvent', 5));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('shape');
  });

  test('rejects a table event missing its table id', () => {
    const r = decode(wrap('dsgMoveTableEvent', { move: 180, moves: [180], player: 'x' }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('returns null for a non-MESSAGE action (lifecycle pass-through)', () => {
    expect(decode({ type: 'REDUX_WEBSOCKET::OPEN' })).toBeNull();
  });
});

describe('decode — fixes from code review', () => {
  test('accepts inbound dsgCancelReplyTableEvent (server broadcasts the cancel reply)', () => {
    const r = decode(wrap('dsgCancelReplyTableEvent', { accepted: true, player: 'x', table: 1, time: 0 }));
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe('dsgCancelReplyTableEvent');
  });

  test('rejects dsgLoginEvent missing me/serverData (handler would deref undefined)', () => {
    const r = decode(wrap('dsgLoginEvent', { player: 'x', time: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('rejects dsgJoinMainRoomEvent missing dsgPlayerData', () => {
    const r = decode(wrap('dsgJoinMainRoomEvent', { player: 'x', time: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('rejects dsgTextMainRoomEvent missing text', () => {
    const r = decode(wrap('dsgTextMainRoomEvent', { player: 'x', time: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('rejects dsgUpdatePlayerDataEvent missing data', () => {
    const r = decode(wrap('dsgUpdatePlayerDataEvent', { time: 0 }));
    expect(r.ok).toBe(false);
    expect(r.error.kind).toBe('field');
  });

  test('still accepts the real captured frames (required fields are present)', () => {
    for (const [type, e] of Object.entries(fixtures.messages)) {
      if (!e.in) continue;
      expect(decode(wrap(type, e.in)).ok, type).toBe(true);
    }
  });
});

describe('renju inbound decode', () => {
  const frame = (obj) => decode({ type: 'REDUX_WEBSOCKET::MESSAGE', payload: { message: JSON.stringify(obj) } });
  test('a swap echo decodes to a typed event', () => {
    const r = frame({ dsgRenjuTaraguchiSwapTableEvent: { swap: false, move: 113, player: 'alice', table: 5, time: 123 } });
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe('dsgRenjuTaraguchiSwapTableEvent');
    expect(r.event.payload.move).toBe(113);
  });
  test('an offer10 echo decodes', () => {
    const r = frame({ dsgRenjuTaraguchiOffer10TableEvent: { moves: [1, 2], player: 'a', table: 5, time: 1 } });
    expect(r.ok).toBe(true);
  });
});
