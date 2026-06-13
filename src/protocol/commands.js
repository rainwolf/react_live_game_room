// Commands — the single outbound seam. Each builder validates its required fields
// (catching client bugs before they hit the wire) and stamps the protocol default
// `time: 0`. Generated from the message descriptors so a bidirectional message's
// shape is defined exactly once.
//
//   Commands.move({ move, moves, player, table })
//     -> { dsgMoveTableEvent: { move, moves, player, table, time: 0 } }

import { COMMANDS } from './messages';

const DEFAULTS = { time: 0 };

export function buildCommand(type, required, args) {
  const a = args || {};
  for (const field of required) {
    if (!(field in a)) {
      throw new Error(`Protocol.${type}: missing required field "${field}"`);
    }
  }
  return { [type]: { ...a, ...DEFAULTS } };
}

export const Commands = Object.fromEntries(
  Object.entries(COMMANDS).map(([cmd, { type, out }]) => [
    cmd,
    (args) => buildCommand(type, out, args),
  ])
);
