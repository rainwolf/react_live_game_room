import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app is CRA-style: JSX lives inside .js files (components, and even some
  // domain classes via JSX helpers). Tell esbuild to parse src .js as JSX so the
  // reducer/utils import chain loads in tests. (Plain-JS modules parse fine too.)
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // App.test.js renders React and needs jsdom + setup we don't have; the modules
    // under test here are exercised without a full DOM.
    exclude: ['src/App.test.js', 'node_modules/**'],
  },
});
