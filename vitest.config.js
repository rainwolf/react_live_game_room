import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // App.test.js renders React and needs jsdom + setup we don't have; the
    // Protocol module is pure JS and tests run in node.
    exclude: ['src/App.test.js', 'node_modules/**'],
  },
});
