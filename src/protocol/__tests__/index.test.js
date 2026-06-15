import { describe, test, expect } from 'vitest';
import fixtures from '../__fixtures__/wire-fixtures.json';
import { Protocol } from '../index';
import { COMMANDS, MESSAGES } from '../messages';

const cmdByType = Object.fromEntries(
  Object.entries(COMMANDS).map(([cmd, c]) => [c.type, cmd])
);
// Round-trip only applies where the OUTBOUND payload is itself a valid inbound frame
// (its fields satisfy the inbound `req`). Some messages are asymmetric by design — e.g.
// the client's login request has no `me`/`serverData`, which the server's login response
// adds — so those are exercised separately below.
const roundTrippable = Object.entries(fixtures.messages).filter(([t, e]) => {
  if (!(e.in && e.out && cmdByType[t])) return false;
  const req = (MESSAGES[t] && MESSAGES[t].req) || [];
  return req.every((f) => f in e.out);
});

describe('Protocol facade', () => {
  test('exposes decode, Commands, isPing, MESSAGES', () => {
    expect(typeof Protocol.decode).toBe('function');
    expect(typeof Protocol.isPing).toBe('function');
    expect(typeof Protocol.Commands.move).toBe('function');
    expect(Protocol.MESSAGES.dsgMoveTableEvent).toBeDefined();
  });
});

describe('Protocol round-trip — one descriptor drives encode and decode', () => {
  test.each(roundTrippable)('%s: Commands -> wire -> decode yields the built payload', (type, entry) => {
    const { time, ...args } = entry.out;
    const wire = Protocol.Commands[cmdByType[type]](args);
    const action = {
      type: 'REDUX_WEBSOCKET::MESSAGE',
      payload: { message: JSON.stringify(wire) },
    };
    const r = Protocol.decode(action);
    expect(r.ok).toBe(true);
    expect(r.event.type).toBe(type);
    expect(r.event.payload).toEqual(entry.out);
  });

  test('asymmetric messages: an outbound request is NOT a valid inbound frame', () => {
    // The client's login request lacks me/serverData; roomText lacks player — fields
    // the server's responses add. decode (inbound) must reject these, not accept the
    // outbound shape as if it were the server's frame.
    const login = Protocol.Commands.login({ player: 'x', password: 'p', guest: false });
    const text = Protocol.Commands.roomText({ text: 'hi' });
    for (const wire of [login, text]) {
      const r = Protocol.decode({
        type: 'REDUX_WEBSOCKET::MESSAGE',
        payload: { message: JSON.stringify(wire) },
      });
      expect(r.ok).toBe(false);
      expect(r.error.kind).toBe('field');
    }
  });
});
