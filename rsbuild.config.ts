import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// PUBLIC_ is added alongside REACT_APP_ (rsbuild's own default prefix set) so that
// PUBLIC_PROD_BACKEND is picked up by loadEnv and injected into client code as
// `import.meta.env.PUBLIC_PROD_BACKEND` — explicitly requesting a prefix list here
// replaces rsbuild's implicit ['PUBLIC_'] default, so it must be listed by hand.
const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['REACT_APP_', 'PUBLIC_'] });

// Local-first backend: dev builds default to the LOCAL backend. Set
// PUBLIC_PROD_BACKEND=1 to opt into the production backend instead (mirrors
// resolveSocketHost in src/redux_actions/actionTypes.js).
const PROD_BACKEND = process.env.PUBLIC_PROD_BACKEND === '1';

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
        target: PROD_BACKEND ? 'wss://pente.org' : 'wss://localhost',
        ws: true,
        changeOrigin: true,
        ...(PROD_BACKEND ? {} : { secure: false }),
      },
      '/gameServer': {
        target: PROD_BACKEND ? 'https://pente.org' : 'https://localhost',
        changeOrigin: true,
        ...(PROD_BACKEND ? {} : { secure: false }),
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
