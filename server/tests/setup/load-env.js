import { loadTestEnv } from './test-env.js';

// Runs in every test worker before any app module is imported.
loadTestEnv();
