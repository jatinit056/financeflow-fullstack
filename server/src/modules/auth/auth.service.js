import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { config } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toDbDate } from '../../utils/dates.js';
import { buildSampleData } from '../../utils/sampleData.js';
import { signToken } from '../../utils/token.js';

/** Fields that are safe to send to the client. The password hash is never selected. */
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  isDemo: true,
  createdAt: true,
};

const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS = 'Invalid email or password';

// Compared against when the email does not exist, so "unknown email" and "wrong password"
// take the same time and attackers cannot discover registered emails by timing responses.
let dummyHashPromise;
const getDummyHash = () => {
  dummyHashPromise ??= bcrypt.hash(randomUUID(), config.BCRYPT_ROUNDS);
  return dummyHashPromise;
};

export async function registerUser({ name, email, password }) {
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: publicUserSelect,
  });

  return { user, token: signToken(user.id) };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await bcrypt.compare(password, await getDummyHash());
    throw AppError.unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw AppError.unauthorized(INVALID_CREDENTIALS, 'INVALID_CREDENTIALS');
  }

  const { id, name, isDemo, createdAt } = user;
  return { user: { id, name, email: user.email, isDemo, createdAt }, token: signToken(id) };
}

/**
 * One-click demo: creates an isolated sandbox user pre-filled with six months of sample data,
 * so every visitor gets their own copy and nobody can vandalise a shared demo account.
 * Sandbox users (and their data, via ON DELETE CASCADE) are purged after 24 hours.
 */
export async function createDemoSession() {
  if (!config.DEMO_MODE) {
    throw AppError.notFound('Demo mode is not enabled on this server', 'DEMO_DISABLED');
  }

  await purgeExpiredDemoUsers();

  const { transactions, budgets } = buildSampleData();
  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: `demo-${randomUUID()}@demo.financeflow.app`,
      passwordHash: await bcrypt.hash(randomUUID(), config.BCRYPT_ROUNDS),
      isDemo: true,
      transactions: {
        createMany: {
          data: transactions.map((t) => ({ ...t, date: toDbDate(t.date) })),
        },
      },
      budgets: { createMany: { data: budgets } },
    },
    select: publicUserSelect,
  });

  return { user, token: signToken(user.id, { expiresIn: '24h' }) };
}

export async function purgeExpiredDemoUsers(now = Date.now()) {
  const { count } = await prisma.user.deleteMany({
    where: { isDemo: true, createdAt: { lt: new Date(now - DEMO_TTL_MS) } },
  });
  return count;
}
