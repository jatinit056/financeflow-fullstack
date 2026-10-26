import { prisma } from './prisma.js';
import { toDbDate } from '../utils/dates.js';
import { round2, toNumber } from '../utils/money.js';

/**
 * Reusable aggregation queries shared by the dashboard, analytics and budget modules.
 * Every query is scoped to a single user — there is no code path that reads across users.
 */

const dateRange = ({ start, end } = {}) => {
  if (!start && !end) return undefined;
  return {
    ...(start && { gte: toDbDate(start) }),
    ...(end && { lt: toDbDate(end) }),
  };
};

/** Total income and expenses, optionally within [start, end). */
export async function sumByType(userId, range) {
  const rows = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId, date: dateRange(range) },
    _sum: { amount: true },
    _count: { _all: true },
  });

  const income = toNumber(rows.find((r) => r.type === 'INCOME')?._sum.amount);
  const expenses = toNumber(rows.find((r) => r.type === 'EXPENSE')?._sum.amount);
  const count = rows.reduce((total, r) => total + r._count._all, 0);

  return { income, expenses, net: round2(income - expenses), count };
}

/** Expense totals per category within [start, end), largest first. */
export async function expensesByCategory(userId, range) {
  const rows = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, type: 'EXPENSE', date: dateRange(range) },
    _sum: { amount: true },
    _count: { _all: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const total = rows.reduce((sum, r) => sum + toNumber(r._sum.amount), 0);

  return rows.map((r) => {
    const amount = toNumber(r._sum.amount);
    return {
      category: r.category,
      total: amount,
      count: r._count._all,
      percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
    };
  });
}

/**
 * Income and expenses per calendar month within [start, end).
 *
 * Prisma's groupBy can only group by columns, not by expressions such as "month of date",
 * so this uses a raw query. The tagged template sends every ${value} as a bound
 * parameter, which keeps it safe from SQL injection.
 *
 * Returns a Map keyed by "YYYY-MM".
 */
export async function monthlyTotals(userId, { start, end }) {
  const rows = await prisma.$queryRaw`
    SELECT to_char("date", 'YYYY-MM') AS "month",
           COALESCE(SUM("amount") FILTER (WHERE "type" = 'INCOME'), 0)  AS "income",
           COALESCE(SUM("amount") FILTER (WHERE "type" = 'EXPENSE'), 0) AS "expenses"
    FROM "transactions"
    WHERE "user_id" = ${userId}::uuid
      AND "date" >= ${start}::date
      AND "date" < ${end}::date
    GROUP BY 1
    ORDER BY 1`;

  return new Map(
    rows.map((row) => [
      row.month,
      { income: toNumber(row.income), expenses: toNumber(row.expenses) },
    ]),
  );
}
