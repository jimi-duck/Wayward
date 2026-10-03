import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths, so the same build works at a domain root
  // (play.example.com/) and under a project path (user.github.io/game/).
  base: './',
  // postprocessing imports three itself; one copy, or its instanceof checks fail
  resolve: { dedupe: ['three'] },
  optimizeDeps: { include: ['three', 'postprocessing'] },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js is most of the download and changes only on an upgrade, so it
    // ships as its own file and stays cached while the game code changes.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'three', test: /node_modules[\\/]three[\\/]/ }],
        },
      },
    },
    // Three.js alone is ~540KB minified (~135KB gzipped). That is the
    // engine, not an accident, so the warning starts above it.
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
