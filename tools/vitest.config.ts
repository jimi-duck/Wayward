import { defineConfig } from 'vitest/config';

// The scripted pilot's balance runs: slow, so kept out of `npm test`.
export default defineConfig({
  test: {
    include: ['tools/**/*.pilot.ts'],
    environment: 'node',
  },
});
