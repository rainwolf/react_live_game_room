// Owner join-request list: freeze + minimum-interactive-window rule (arena spec C2).
//
// The server pushes full snapshots of the owner's pending requests. Applying each one the
// moment it lands would shift rows under the owner's pointer, so:
//   - FREEZE: a snapshot that lands while rows are shown freezes the list (taps ignored,
//     spinner) for FREEZE_MS, then the newest held snapshot is applied;
//   - WINDOW: after rows change the list stays interactive for at least MIN_WINDOW_MS;
//     snapshots landing then are held (rows unchanged) and start the next freeze when the
//     window ends, so a burst of updates cannot lock the owner out;
//   - URGENT: the snapshot answering the owner's own accept/decline freezes at once, even
//     inside the window, so a just-declined row never sits there interactive;
//   - HIDDEN: with no rows shown there is nothing under the pointer, so a snapshot applies
//     at once and opens a window.
//
// freezeReducer is pure; createFreezeController owns the one timer; useFrozenRequests (a
// thin hook) wires the controller to React. `epoch` changes exactly when a new timer must
// start, so a late tick from a superseded timer is ignored.

export const FREEZE_MS = 400;
export const MIN_WINDOW_MS = 1000;

export const PHASE = { IDLE: 'idle', FROZEN: 'frozen', WINDOW: 'window' };

export const initialFreezeState = { phase: PHASE.IDLE, shown: [], held: null, epoch: 0 };

export function freezeReducer(state, event) {
  switch (event.type) {
    case 'snapshot': {
      const { requests, urgent } = event;
      if (state.phase === PHASE.FROZEN) {
        return { ...state, held: requests };
      }
      if (state.shown.length === 0) {
        return { phase: PHASE.WINDOW, shown: requests, held: null, epoch: state.epoch + 1 };
      }
      if (state.phase === PHASE.WINDOW && !urgent) {
        return { ...state, held: requests };
      }
      return { phase: PHASE.FROZEN, shown: state.shown, held: requests, epoch: state.epoch + 1 };
    }
    case 'tick': {
      if (event.epoch !== state.epoch) {
        return state;
      }
      if (state.phase === PHASE.FROZEN) {
        return { phase: PHASE.WINDOW, shown: state.held, held: null, epoch: state.epoch + 1 };
      }
      if (state.phase === PHASE.WINDOW) {
        if (state.held === null) {
          return { ...state, phase: PHASE.IDLE };
        }
        return { ...state, phase: PHASE.FROZEN, epoch: state.epoch + 1 };
      }
      return state;
    }
    default:
      return state;
  }
}

// How long the current phase lasts, or null when nothing is pending.
export function timerFor(state) {
  if (state.phase === PHASE.FROZEN) return FREEZE_MS;
  if (state.phase === PHASE.WINDOW) return MIN_WINDOW_MS;
  return null;
}

// Arrow wrappers, not bare setTimeout/clearTimeout: browsers throw "Illegal invocation"
// when those are called as methods of another object, and the wrappers also resolve the
// global at call time so vitest fake timers apply.
const DEFAULT_TIMERS = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle),
};

export function createFreezeController(onChange, timers = DEFAULT_TIMERS) {
  let state = initialFreezeState;
  let handle = null;
  let disposed = false;

  const transition = (event) => {
    if (disposed) return;
    const next = freezeReducer(state, event);
    if (next === state) return;
    const restart = next.epoch !== state.epoch;
    state = next;
    if (restart) {
      if (handle !== null) timers.clear(handle);
      handle = null;
      const ms = timerFor(state);
      if (ms !== null) {
        const epoch = state.epoch;
        handle = timers.set(() => {
          handle = null;
          transition({ type: 'tick', epoch });
        }, ms);
      }
    }
    onChange(state);
  };

  return {
    push: (requests, urgent = false) => transition({ type: 'snapshot', requests, urgent }),
    getState: () => state,
    dispose: () => {
      disposed = true;
      if (handle !== null) timers.clear(handle);
      handle = null;
    },
  };
}
