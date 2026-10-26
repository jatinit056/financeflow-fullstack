/**
 * Seeds a demo account with six months of realistic sample data.
 *
 *   npm run db:seed
 *
 * Safe to re-run: the demo user's existing transactions and budgets are replaced.
 * Log in with the credentials printed at the end.
 */
import bcrypt from 'bcrypt';
import { config } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { toDbDate } from '../src/utils/dates.js';
import { buildSampleData } from '../src/utils/sampleData.js';

const DEMO_EMAIL = 'demo@financeflow.app';
const DEMO_PASSWORD = 'Demo@12345';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, config.BCRYPT_ROUNDS);
  const { transactions, budgets } = buildSampleData();

  const user = await prisma.$transaction(async (tx) => {
    const demoUser = await tx.user.upsert({
      where: { email: DEMO_EMAIL },
      update: { passwordHash, name: 'Demo User' },
      create: { email: DEMO_EMAIL, name: 'Demo User', passwordHash },
    });

    await tx.transaction.deleteMany({ where: { userId: demoUser.id } });
    await tx.budget.deleteMany({ where: { userId: demoUser.id } });

    await tx.transaction.createMany({
      data: transactions.map((t) => ({ ...t, date: toDbDate(t.date), userId: demoUser.id })),
    });
    await tx.budget.createMany({
      data: budgets.map((b) => ({ ...b, userId: demoUser.id })),
    });

    return demoUser;
  });

  console.log(`Seeded ${transactions.length} transactions and ${budgets.length} budgets.`);
  console.log(`Log in with: ${user.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
