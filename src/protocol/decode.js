// decode — the single inbound seam. Turns a raw @giantmachines/redux-websocket
// MESSAGE action into a typed event, validating shape and surfacing malformed
// frames instead of silently corrupting state.
//
//   decode(action) ->
//     null                                  (not a wire MESSAGE — lifecycle pass-through)
//     { ok: true,  event: { type, payload } }
//     { ok: false, error: { kind, ... } }   kind: parse | empty | unknown | shape | field

import { INBOUND_TYPES, MESSAGES } from './messages';

export function decode(action) {
  if (!action || typeof action.type !== 'string' || !action.type.endsWith('MESSAGE')) {
    return null;
  }

  let json;
  try {
    json = JSON.parse(action.payload && action.payload.message);
  } catch (e) {
    return { ok: false, error: { kind: 'parse', message: String((e && e.message) || e) } };
  }

  if (!json || typeof json !== 'object') {
    return { ok: false, error: { kind: 'empty' } };
  }
  const type = Object.keys(json)[0];
  if (!type) {
    return { ok: false, error: { kind: 'empty' } };
  }

  if (!INBOUND_TYPES.has(type)) {
    return { ok: false, error: { kind: 'unknown', type } };
  }

  const payload = json[type];
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, error: { kind: 'shape', type } };
  }

  const req = (MESSAGES[type] && MESSAGES[type].req) || [];
  for (const field of req) {
    if (!(field in payload)) {
      return { ok: false, error: { kind: 'field', type, field } };
    }
  }

  return { ok: true, event: { type, payload } };
}

// Is this decoded event the server ping? (the pinger middleware answers it)
export function isPing(event) {
  return !!event && event.type === 'dsgPingEvent';
}
