// Transient UI state for the live Renju opening. Sits beside `modals` as a no-op-by-default
// sub-slice (same reference returned for unrelated actions). It does double duty: suppresses
// the decision modal (open gate) and arms the board — `placing` routes board taps to a
// renjuSwap(swap:false) decline/Branch-A move, `offering` accumulates the 10-pick selection.
// Reset to idle when the player acts (renjuResetOpeningUi, dispatched on send in Board.js /
// RenjuOfferPanel) and when leaving a table (dsgExitTableEvent / dsgBootTableEvent), so a
// half-finished offer can't leak into the next game.

const BEGIN_PLACE = 'RENJU_UI/BEGIN_PLACE';
const BEGIN_OFFER = 'RENJU_UI/BEGIN_OFFER';
const TOGGLE_PICK = 'RENJU_UI/TOGGLE_PICK';
const RESET = 'RENJU_UI/RESET';

export const renjuBeginPlace = () => ({ type: BEGIN_PLACE });
export const renjuBeginOffer = () => ({ type: BEGIN_OFFER });
export const renjuTogglePick = (move) => ({ type: TOGGLE_PICK, move });
export const renjuResetOpeningUi = () => ({ type: RESET });

const INITIAL = { mode: 'idle', picks: [] };

export function renjuOpeningUiReducer(state = INITIAL, action) {
  switch (action.type) {
    case BEGIN_PLACE:
      return { mode: 'placing', picks: [] };
    case BEGIN_OFFER:
      return { mode: 'offering', picks: [] };
    case TOGGLE_PICK: {
      if (state.mode !== 'offering') return state;
      const picks = state.picks.includes(action.move)
        ? state.picks.filter((m) => m !== action.move)
        : [...state.picks, action.move];
      return { ...state, picks };
    }
    case RESET:
    // leaving / booted from a table — clear transient opening UI so it can't leak into the next game
    case 'dsgExitTableEvent':
    case 'dsgBootTableEvent':
      return state.mode === 'idle' && state.picks.length === 0 ? state : INITIAL;
    default:
      return state;
  }
}
