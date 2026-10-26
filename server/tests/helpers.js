import request from 'supertest';
import { afterAll, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app = createApp({ rateLimitEnabled: false });
export const api = () => request(app);
export { prisma };

/** Empty every table between tests so each test starts from a blank database. */
export function useCleanDatabase() {
  beforeEach(async () => {
    await prisma.$executeRaw`TRUNCATE TABLE "transactions", "budgets", "users" CASCADE`;
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
}

let userCounter = 0;

/** Register a user through the API and return { user, token, auth } where auth is a header object. */
export async function registerUser(overrides = {}) {
  userCounter += 1;
  const body = {
    name: `Test User ${userCounter}`,
    email: `user${userCounter}@example.com`,
    password: 'Password123',
    ...overrides,
  };

  const res = await api().post('/api/auth/register').send(body);
  if (res.status !== 201) {
    throw new Error(`Registration failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return {
    ...res.body,
    password: body.password,
    auth: { Authorization: `Bearer ${res.body.token}` },
  };
}

export const validTransaction = (overrides = {}) => ({
  amount: 450.5,
  type: 'EXPENSE',
  category: 'FOOD',
  description: 'Lunch with team',
  date: '2025-06-15',
  ...overrides,
});

/** Create a transaction through the API and return it. */
export async function addTransaction(auth, overrides = {}) {
  const res = await api().post('/api/transactions').set(auth).send(validTransaction(overrides));
  if (res.status !== 201) {
    throw new Error(`Create transaction failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.transaction;
}
