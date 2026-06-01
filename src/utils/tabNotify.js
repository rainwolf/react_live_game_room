// Tab attention helpers: pulse the document title while the tab is in the
// background, and surface an OS notification via the Notifications API.
//
// The title pulse stops automatically when the tab regains focus. A single
// visibilitychange listener (registered once on import) is the source of
// truth for clearing the pulse, so callers never have to.

let pulseTimer = null;
const realTitle = typeof document !== 'undefined' ? document.title : '';

function startPulse(message) {
   // Don't pulse a focused tab. Guarding here (not just at the call site)
   // means every caller is safe, and it closes the race where the tab
   // regains focus in the instant between the caller's check and this call.
   if (pulseTimer || typeof document === 'undefined' || !document.hidden) {
      return;
   }
   let showingMessage = false;
   pulseTimer = setInterval(() => {
      document.title = showingMessage ? realTitle : message;
      showingMessage = !showingMessage;
   }, 1000);
}

export function stopPulse() {
   if (pulseTimer) {
      clearInterval(pulseTimer);
      pulseTimer = null;
   }
   if (typeof document !== 'undefined') {
      document.title = realTitle;
   }
}

// Ask for notification permission if we haven't been granted/denied yet.
// Browsers only show the prompt in response to a user gesture, so call this
// from a click/tap handler (e.g. selecting a server) — not from a reducer.
export function requestNotificationPermission() {
   if (typeof Notification === 'undefined') {
      return;
   }
   if (Notification.permission === 'default') {
      Notification.requestPermission();
   }
}

function showNotification(message) {
   if (typeof Notification === 'undefined') {
      return;
   }
   if (Notification.permission === 'granted') {
      try {
         new Notification('Pente.org Live Game Room', {body: message});
      } catch (err) {
         // Some browsers only allow notifications from a ServiceWorker; ignore.
         if (process.env.NODE_ENV === 'development') {
            console.log('notification failed ', err);
         }
      }
   } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
   }
}

// Pulse the tab title and fire an OS notification, but only when the tab is
// not currently focused.
export function notifyTabActivity(message) {
   if (typeof document === 'undefined' || !document.hidden) {
      return;
   }
   startPulse(message);
   showNotification(message);
}

if (typeof document !== 'undefined') {
   document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
         stopPulse();
      }
   });
}
