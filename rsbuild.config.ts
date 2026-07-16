import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['REACT_APP_'] });

const LOCAL = process.env.LOCAL_BACKEND === '1';

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
        target: LOCAL ? 'wss://localhost' : 'wss://pente.org',
        ws: true,
        changeOrigin: true,
        ...(LOCAL ? { secure: false } : {}),
      },
      '/gameServer': {
        target: LOCAL ? 'https://localhost' : 'https://pente.org',
        changeOrigin: true,
        ...(LOCAL ? { secure: false } : {}),
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
