import { expensesByCategory, monthlyTotals } from '../../lib/aggregates.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { getBudgetStatus } from '../../utils/budgetStatus.js';
import { lastMonths, monthBounds, monthKey, monthLabel, toDbDate } from '../../utils/dates.js';
import { toAmountString, toNumber } from '../../utils/money.js';

const HISTORY_MONTHS = 6;

export function serializeBudget(budget) {
  return {
    id: budget.id,
    month: budget.month,
    year: budget.year,
    amount: toNumber(budget.amount),
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

/** Budget + spending + status for one month. Used by the budget page, dashboard and alerts. */
export async function getBudgetSnapshot(userId, { year, month }) {
  const { start, end } = monthBounds({ year, month });

  const [budget, spending] = await Promise.all([
    prisma.budget.findUnique({ where: { userId_year_month: { userId, year, month } } }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: toDbDate(start), lt: toDbDate(end) } },
      _sum: { amount: true },
    }),
  ]);

  const amount = budget ? toNumber(budget.amount) : null;
  const spent = toNumber(spending._sum.amount);

  return {
    year,
    month,
    budget: budget ? serializeBudget(budget) : null,
    amount,
    spent,
    ...getBudgetStatus(amount, spent),
  };
}

/** Everything the Budget page needs: this month's status, where the money went, and history. */
export async function getBudgetOverview(userId, anchor) {
  const months = lastMonths(anchor, HISTORY_MONTHS);
  const historyRange = { start: monthBounds(months[0]).start, end: monthBounds(anchor).end };

  const [snapshot, categories, budgets, totals] = await Promise.all([
    getBudgetSnapshot(userId, anchor),
    expensesByCategory(userId, monthBounds(anchor)),
    prisma.budget.findMany({
      where: { userId, OR: months.map(({ year, month }) => ({ year, month })) },
    }),
    monthlyTotals(userId, historyRange),
  ]);

  const history = months.map(({ year, month }) => {
    const budget = budgets.find((b) => b.year === year && b.month === month);
    const amount = budget ? toNumber(budget.amount) : null;
    const spent = totals.get(monthKey(year, month))?.expenses ?? 0;
    return {
      year,
      month,
      label: monthLabel({ year, month }),
      budget: amount,
      spent,
      ...getBudgetStatus(amount, spent),
    };
  });

  return { ...snapshot, label: monthLabel(anchor), categoryBreakdown: categories, history };
}

export async function createBudget(userId, { year, month, amount }) {
  const existing = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { id: true },
  });
  if (existing) {
    throw AppError.conflict(
      `A budget for ${monthLabel({ year, month })} already exists. Update it instead.`,
      'BUDGET_EXISTS',
    );
  }

  const budget = await prisma.budget.create({
    data: { userId, year, month, amount: toAmountString(amount) },
  });
  return serializeBudget(budget);
}

export async function updateBudget(userId, { year, month, amount }) {
  const existing = await prisma.budget.findUnique({
    where: { userId_year_month: { userId, year, month } },
    select: { id: true },
  });
  if (!existing) {
    throw AppError.notFound(
      `No budget set for ${monthLabel({ year, month })} yet`,
      'BUDGET_NOT_FOUND',
    );
  }

  const budget = await prisma.budget.update({
    where: { id: existing.id },
    data: { amount: toAmountString(amount) },
  });
  return serializeBudget(budget);
}
