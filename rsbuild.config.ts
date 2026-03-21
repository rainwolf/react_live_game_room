import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars, rawPublicVars } = loadEnv({ prefixes: ['REACT_APP_'] });

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
        target: 'wss://pente.org',
        ws: true,
        changeOrigin: true,
      },
      '/gameServer': {
        target: 'https://pente.org',
        changeOrigin: true,
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
