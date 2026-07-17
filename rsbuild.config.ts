import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// PUBLIC_ is added alongside REACT_APP_ (rsbuild's own default prefix set) so that
// PUBLIC_LOCAL_BACKEND is picked up by loadEnv and injected into client code as
// `import.meta.env.PUBLIC_LOCAL_BACKEND` — explicitly requesting a prefix list here
// replaces rsbuild's implicit ['PUBLIC_'] default, so it must be listed by hand.
const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['REACT_APP_', 'PUBLIC_'] });

// Production-first backend: dev builds default to the PRODUCTION backend (matches the
// deployed behavior). Set PUBLIC_LOCAL_BACKEND=1 in an env file rsbuild loads (e.g.
// .env.local) to opt into the local backend instead (mirrors resolveSocketHost in
// src/redux_actions/actionTypes.js).
const LOCAL_BACKEND = process.env.PUBLIC_LOCAL_BACKEND === '1';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    template: './public/index.html',
  },
  source: {
    define: {
      ...publicVars,
      'process.env': JSON.stringify(rawPublicVars),
    },
  },
  server: {
    proxy: {
      '/websocketServer': {
        target: LOCAL_BACKEND ? 'wss://localhost' : 'wss://pente.org',
        ws: true,
        changeOrigin: true,
        ...(LOCAL_BACKEND ? { secure: false } : {}),
      },
      '/gameServer': {
        target: LOCAL_BACKEND ? 'https://localhost' : 'https://pente.org',
        changeOrigin: true,
        ...(LOCAL_BACKEND ? { secure: false } : {}),
      },
    },
  },
  output: {
    distPath: {
      root: 'build',
    },
    assetPrefix: '/gameServer/live',
  },
});
