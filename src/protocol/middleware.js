// Protocol middleware — the single inbound seam. Decodes each wss frame into a typed
// action for the reducer's EVENT_HANDLERS registry, answers server pings, and surfaces
// malformed/unknown frames (dev log) instead of letting them crash or silently corrupt
// state. Replaces the old pinger + the reducer's JSON.parse-and-switch.

import { decode, isPing } from './decode';

// @giantmachines/redux-websocket action conventions (REDUX_WEBSOCKET:: prefix).
// Kept as plain strings to keep this module dependency-light and node-testable, matching
// the REDUX_WEBSOCKET:: literals already used elsewhere in the app.
const MESSAGE_SUFFIX = 'MESSAGE';
const SEND_ACTION = 'REDUX_WEBSOCKET::SEND';

export const protocolMiddleware = (store) => (next) => (action) => {
  if (typeof action.type === 'string' && action.type.endsWith(MESSAGE_SUFFIX)) {
    const result = decode(action);
    if (result) {
      if (result.ok) {
        const { event } = result;
        if (isPing(event)) {
          // answer the server ping by echoing it back (as the old pinger did)
          store.dispatch({ type: SEND_ACTION, payload: { [event.type]: event.payload } });
          return; // ping is fully handled here — swallow it
        }
        // hand the reducer a typed action; EVENT_HANDLERS applies it
        return next({ type: event.type, payload: event.payload });
      }
      if (process.env.NODE_ENV !== 'production') {
        // dev log only — protocol errors are not the user's fault and are not user-actionable
        // eslint-disable-next-line no-console
        console.error('[protocol] dropped frame:', result.error);
      }
      return; // malformed/unknown — swallowed
    }
  }
  return next(action);
};

export default protocolMiddleware;
