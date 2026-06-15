// Modal seam — the one place discretionary (user-opened) modals are controlled.
//
// Before this seam, each such modal had its own action constant, its own near-identical
// reducer case (toggle / set-with-payload / delete), and its own raw-key selector spread
// across three files. The interface here — openModal / closeModal / toggleModal and the
// two selectors — hides all of that bookkeeping behind a small surface: any future
// discretionary modal is one openModal call + one selector, no new action type and no new
// reducer case.
//
// IN SCOPE: modals the local user opens by clicking (settings, create-arena, boot-picker).
// NOT IN SCOPE: modals whose visibility is DERIVED from game/server domain state
// (undo/cancel/swap2/d-pente/go/invitation/wait-return). Those are computed from the
// domain, not commanded by the UI — routing them through this seam would fake domain
// state as a UI command. Leave them where they are.
//
// State contract: a modal is OPEN iff its name is a key in state.modals.
//   state.modals[name] = true      → open, no payload
//   state.modals[name] = <payload> → open, carrying that payload (e.g. the player to boot)
//   (key absent)                   → closed
// closeModal removes the key (matching the original reducer's `delete`), so there is a
// single closed encoding and state.modals returns to {}. Open/close is explicit: nothing is
// inferred from payload truthiness, so a falsy payload (0, '', null) still opens.

export const MODALS = {
  SETTINGS: 'settings',
  CREATE_ARENA: 'createArena',
  BOOT: 'boot',
};

export const OPEN_MODAL = 'OPEN_MODAL';
export const CLOSE_MODAL = 'CLOSE_MODAL';
export const TOGGLE_MODAL = 'TOGGLE_MODAL';

export const openModal = (name, props) => ({ type: OPEN_MODAL, name, props });
export const closeModal = (name) => ({ type: CLOSE_MODAL, name });
export const toggleModal = (name, props) => ({ type: TOGGLE_MODAL, name, props });

// Open iff the key is present. openValue never yields undefined, so an absent key is the
// only "closed" value the reducer ever produces.
const isOpenValue = (v) => v !== undefined;

// The value to store when opening: explicit props, or `true` when a modal carries no data.
const openValue = (props) => (props === undefined ? true : props);

// Remove a modal's key, returning the same reference when it was already absent (so a
// redundant close doesn't churn the state and trigger needless re-renders).
const withoutKey = (modals, name) => {
  if (!(name in modals)) return modals;
  const next = { ...modals };
  delete next[name];
  return next;
};

export function modalsReducer(modals = {}, action) {
  switch (action.type) {
    case OPEN_MODAL:
      return { ...modals, [action.name]: openValue(action.props) };
    case CLOSE_MODAL:
      return withoutKey(modals, action.name);
    case TOGGLE_MODAL:
      return isOpenValue(modals[action.name])
        ? withoutKey(modals, action.name)
        : { ...modals, [action.name]: openValue(action.props) };
    default:
      return modals;
  }
}

// Selectors — the read side of the seam. Components ask these instead of reaching into
// raw state keys, so the state shape stays private to this module.
export const isModalOpen = (state, name) => isOpenValue(state.modals && state.modals[name]);

// The carried payload (e.g. the player to boot), or undefined when closed or open-without-
// data. Returning undefined when closed preserves the existing `open={value !== undefined}`
// render gate in payload-carrying modals.
export const modalProps = (state, name) => {
  const v = state.modals && state.modals[name];
  return v === undefined || v === true ? undefined : v;
};
