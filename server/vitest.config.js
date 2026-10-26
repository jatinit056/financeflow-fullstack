import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Rebuilds the test database schema from prisma/migrations once per run.
    globalSetup: ['./tests/setup/global-setup.js'],
    // Loads .env.test before any app module is imported.
    setupFiles: ['./tests/setup/load-env.js'],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
