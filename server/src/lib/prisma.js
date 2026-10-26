import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import { config } from '../config/env.js';

/**
 * Single shared Prisma client for the whole app.
 *
 * Prisma 7 talks to PostgreSQL through a driver adapter (node-postgres here), which owns the
 * connection pool. The generated client is TypeScript source; Node 22.18+ runs it directly
 * thanks to built-in type stripping, so this JavaScript project needs no build step.
 */
const adapter = new PrismaPg({
  connectionString: config.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 15_000,
  idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({
  adapter,
  log: config.isProduction ? ['error'] : ['warn', 'error'],
});

export { Prisma } from '../generated/prisma/client.ts';
