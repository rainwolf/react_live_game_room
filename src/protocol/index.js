// Protocol — the deep module that owns the pente.org `dsg*` wire format in both
// directions. The single place the wire schema lives:
//
//   inbound:  Protocol.decode(wsMessageAction) -> {ok, event:{type, payload}} | {ok:false, error} | null
//   outbound: Protocol.Commands.<name>(args)   -> validated { dsgXEvent: {...} }
//   schema:   Protocol.MESSAGES                 -> per-message descriptors
//
// Callers and the reducer cross this one seam; @giantmachines/redux-websocket stays
// the transport. See ./messages.js for the descriptors and __fixtures__ for the real
// frames the tests characterize.

import { decode, isPing } from './decode';
import { Commands, buildCommand } from './commands';
import { MESSAGES, COMMANDS, INBOUND_TYPES, ERROR_EVENTS, PING } from './messages';

export const Protocol = {
  decode,
  isPing,
  Commands,
  buildCommand,
  MESSAGES,
  COMMANDS,
  INBOUND_TYPES,
  ERROR_EVENTS,
  PING,
};

export { decode, isPing, Commands, buildCommand, MESSAGES, COMMANDS, INBOUND_TYPES, ERROR_EVENTS, PING };
export default Protocol;
