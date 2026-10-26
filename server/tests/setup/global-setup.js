import { readdir, readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import pg from 'pg';

/**
 * Runs once before the whole test suite: drops and recreates the test database schema by
 * applying every migration in prisma/migrations, in order. Tests therefore exercise the exact
 * SQL that production runs, and start from a clean, known state.
 */
export default async function setup() {
  dotenv.config({ path: '.env.test', quiet: true });

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.test.example to .env.test and edit it.');
  }

  // Safety net: never wipe a development or production database by accident.
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!/test/i.test(databaseName)) {
    throw new Error(
      `Refusing to reset database "${databaseName}". The test database name must contain "test".`,
    );
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');

    const migrationsDir = new URL('../../prisma/migrations/', import.meta.url);
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const folders = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const folder of folders) {
      const sql = await readFile(new URL(`${folder}/migration.sql`, migrationsDir), 'utf8');
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}
