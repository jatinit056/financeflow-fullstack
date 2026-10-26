import dotenv from 'dotenv';
import { z } from 'zod';

// Load server/.env for local development. Tests load .env.test themselves, and in
// production the hosting platform provides real environment variables.
if (process.env.NODE_ENV !== 'test') dotenv.config({ quiet: true });

/**
 * Environment configuration, validated once at startup.
 * If anything required is missing or malformed the process stops immediately with a
 * readable message, instead of failing later on the first request ("fail fast").
 */

const emptyToUndefined = (value) => (value === '' ? undefined : value);

const envBoolean = (defaultValue) =>
  z.preprocess(
    emptyToUndefined,
    z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .default(defaultValue),
  );

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(5000)),

  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required (PostgreSQL connection string)' })
    .min(1, { error: 'DATABASE_URL is required (PostgreSQL connection string)' }),

  JWT_SECRET: z
    .string({ error: 'JWT_SECRET is required' })
    .min(32, { error: 'JWT_SECRET must be at least 32 characters long' }),
  JWT_EXPIRES_IN: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d+(s|m|h|d|w|y)$/, { error: 'JWT_EXPIRES_IN needs a unit, like 15m, 12h or 7d' })
      .default('7d'),
  ),

  // Comma-separated list of origins allowed to call the API, e.g.
  // "http://localhost:5173,https://financeflow.vercel.app"
  CLIENT_URL: z.preprocess(emptyToUndefined, z.string().default('http://localhost:5173')),

  BCRYPT_ROUNDS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(4).max(15).default(12)),

  // Number of reverse proxies in front of the app (Render/Railway: 1). Needed so
  // rate limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).default(0)),

  RATE_LIMIT_ENABLED: envBoolean(true),

  // Enables POST /api/auth/demo (one-click sandbox accounts, auto-deleted after 24h).
  DEMO_MODE: envBoolean(false),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    const message = `Invalid environment configuration:\n${problems}\n\nCopy server/.env.example to server/.env and fill in the values.`;

    if (process.env.NODE_ENV === 'test') throw new Error(message);
    console.error(message);
    process.exit(1);
  }

  const env = result.data;

  return Object.freeze({
    ...env,
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    corsOrigins: env.CLIENT_URL.split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  });
}

export const config = loadConfig();
