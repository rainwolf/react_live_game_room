// AudioService — the sound seam. Lazy and guarded: Audio objects are created on first
// use (not at module scope), and every entry point is a no-op when the Audio API is
// unavailable (node/SSR/tests). This is what lets utils.js / the reducer be imported and
// unit-tested without a browser. Autoplay rejections are swallowed.

import moveSound from '../resources/sounds/move_sound.mp3';
import newPlayerSound from '../resources/sounds/newplayer_sound.mp3';
import lowTimeSound from '../resources/sounds/low_time_captures.mp3';

const FILES = {
  move: moveSound,
  newPlayer: newPlayerSound,
  lowTime: lowTimeSound,
};

const cache = {};

function logErr(err) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('oops, no sound ', err);
  }
}

export const AudioService = {
  play(name) {
    if (typeof Audio === 'undefined') return; // node / SSR / test — no-op
    const file = FILES[name];
    if (!file) return; // unknown sound name
    try {
      let audio = cache[name];
      if (!audio) {
        audio = new Audio(file);
        cache[name] = audio;
      }
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(logErr);
    } catch (err) {
      logErr(err);
    }
  },
};

export default AudioService;
