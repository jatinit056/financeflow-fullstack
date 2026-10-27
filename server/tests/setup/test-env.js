import dotenv from 'dotenv';

/**
 * Test configuration. The defaults match docker-compose.yml, so `npm test` works with no
 * setup at all; put overrides in server/.env.test (see .env.test.example). Variables that
 * are already set (for example in CI) always win.
 */
const DEFAULTS = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/financeflow_test',
  JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  JWT_EXPIRES_IN: '1h',
  CLIENT_URL: 'http://localhost:5173',
  BCRYPT_ROUNDS: '4',
  RATE_LIMIT_ENABLED: 'false',
  DEMO_MODE: 'true',
};

export function loadTestEnv() {
  process.env.NODE_ENV = 'test';
  dotenv.config({ path: '.env.test', quiet: true });
  for (const [key, value] of Object.entries(DEFAULTS)) {
    process.env[key] ??= value;
  }
}
