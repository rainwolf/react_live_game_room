// Notification middleware — the side-effect seam. The reducer is pure: its handlers
// push notification intents ({sound, tab}) onto state.pendingNotifications. This
// middleware runs the reducer (next), then drains that queue — playing sounds via the
// AudioService and nudging the tab via tabNotify — and clears it. Keeping the effects
// here (not in the reducer) is what makes the reducer node-testable.

import { AudioService } from './audio';
import { notifyTabActivity } from '../utils/tabNotify';
import { CLEAR_NOTIFICATIONS } from '../redux_actions/actionTypes';

export const notificationMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  const pending = store.getState().pendingNotifications;
  if (pending && pending.length) {
    pending.forEach((n) => {
      // guard each intent so one failing effect can't skip the others — and so the
      // queue is always cleared below (otherwise stale intents would replay forever).
      try {
        if (n.sound) AudioService.play(n.sound);
        if (n.tab) notifyTabActivity(n.tab);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[notifications] effect failed:', err);
        }
      }
    });
    store.dispatch({ type: CLEAR_NOTIFICATIONS });
  }
  return result;
};

export default notificationMiddleware;
