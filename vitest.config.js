import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The app is CRA-style: JSX lives inside .js files (components, and even some
  // domain classes via JSX helpers like UserClass.js). Vite 8 transforms JS with
  // oxc (not esbuild) and excludes `.js` from JSX parsing by default, so the
  // reducer/utils import chain fails to load. Add src .js to the JSX transform
  // while keeping oxc's default ts/jsx patterns, and exclude node_modules.
  oxc: {
    // `lang: 'jsx'` forces oxc to parse files as JSX regardless of the .js
    // extension (oxc otherwise infers lang from the extension and rejects JSX in
    // .js). `include` routes src .js through the transform; oxc's default
    // `exclude: /\.js$/` would otherwise skip them.
    lang: 'jsx',
    include: [/\.(m?ts|[jt]sx)$/, /src\/.*\.js$/],
    exclude: /node_modules/,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // App.test.js renders React and needs jsdom + setup we don't have; the modules
    // under test here are exercised without a full DOM.
    exclude: ['src/App.test.js', 'node_modules/**'],
  },
});
