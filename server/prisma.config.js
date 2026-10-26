// Prisma 7 CLI configuration (migrate, generate, studio, seed).
// The app itself connects through the pg driver adapter in src/lib/prisma.js.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection. On Neon, set DIRECT_URL to the
    // connection string without "-pooler"; locally DATABASE_URL is enough.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
