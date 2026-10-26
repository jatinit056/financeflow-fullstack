import { CATEGORY_LABELS, categoriesMatching } from '../../constants/categories.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/AppError.js';
import { toCsv } from '../../utils/csv.js';
import { toDateString, toDbDate } from '../../utils/dates.js';
import { toAmountString, toNumber } from '../../utils/money.js';
import { getBudgetSnapshot } from '../budget/budget.service.js';

export const MAX_EXPORT_ROWS = 10_000;

/** Shape sent to the client: plain numbers and YYYY-MM-DD dates. */
export function serializeTransaction(t) {
  return {
    id: t.id,
    amount: toNumber(t.amount),
    type: t.type,
    category: t.category,
    description: t.description,
    date: toDateString(t.date),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Build the WHERE clause for list/export. `userId` is always included — this is what stops
 * one user from ever seeing another user's transactions.
 */
/** Prisma passes `contains` straight to SQL LIKE, so % and _ must be escaped to match literally. */
const escapeLike = (text) => text.replace(/[\\%_]/g, (character) => `\\${character}`);

function buildWhere(userId, filters) {
  const where = { userId };

  if (filters.type) where.type = filters.type;
  if (filters.category) where.category = filters.category;

  if (filters.startDate || filters.endDate) {
    where.date = {
      ...(filters.startDate && { gte: toDbDate(filters.startDate) }),
      ...(filters.endDate && { lte: toDbDate(filters.endDate) }),
    };
  }

  if (filters.search) {
    // Match the description, or a category whose label matches ("food" finds Food & Dining).
    const matchingCategories = categoriesMatching(filters.search);
    where.OR = [
      { description: { contains: escapeLike(filters.search), mode: 'insensitive' } },
      ...(matchingCategories.length ? [{ category: { in: matchingCategories } }] : []),
    ];
  }

  return where;
}

function buildOrderBy({ sortBy, sortOrder }) {
  // Secondary keys keep the order stable when many rows share a date or amount.
  const orderBy = [{ [sortBy]: sortOrder }];
  if (sortBy !== 'date') orderBy.push({ date: 'desc' });
  if (sortBy !== 'createdAt') orderBy.push({ createdAt: 'desc' });
  orderBy.push({ id: 'desc' });
  return orderBy;
}

const toWriteData = (data) => ({
  amount: toAmountString(data.amount),
  type: data.type,
  category: data.category,
  description: data.description,
  date: toDbDate(data.date),
});

/** After an expense is saved, tell the client if that month's budget is nearly used up. */
async function getBudgetAlert(userId, transaction) {
  if (transaction.type !== 'EXPENSE') return null;

  const [year, month] = transaction.date.split('-').map(Number);
  const snapshot = await getBudgetSnapshot(userId, { year, month });
  if (snapshot.status !== 'warning' && snapshot.status !== 'exceeded') return null;

  return {
    status: snapshot.status,
    year,
    month,
    budget: snapshot.amount,
    spent: snapshot.spent,
    percentUsed: snapshot.percentUsed,
  };
}

export async function listTransactions(userId, query) {
  const where = buildWhere(userId, query);
  const skip = (query.page - 1) * query.limit;

  const [rows, total, summary] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: buildOrderBy(query),
      skip,
      take: query.limit,
    }),
    prisma.transaction.count({ where }),
    // Totals of everything matching the filters (not just this page)
    prisma.transaction.groupBy({ by: ['type'], where, _sum: { amount: true } }),
  ]);

  const income = toNumber(summary.find((s) => s.type === 'INCOME')?._sum.amount);
  const expenses = toNumber(summary.find((s) => s.type === 'EXPENSE')?._sum.amount);

  return {
    data: rows.map(serializeTransaction),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
    summary: { income, expenses, net: Math.round((income - expenses) * 100) / 100 },
  };
}

export async function getTransaction(userId, id) {
  // findFirst with both id AND userId: another user's id behaves exactly like a missing one,
  // so the API never confirms that someone else's record exists (404, not 403).
  const transaction = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!transaction) throw AppError.notFound('Transaction not found');
  return serializeTransaction(transaction);
}

export async function createTransaction(userId, data) {
  const created = await prisma.transaction.create({
    data: { ...toWriteData(data), userId },
  });
  const transaction = serializeTransaction(created);
  return { transaction, budgetAlert: await getBudgetAlert(userId, transaction) };
}

export async function updateTransaction(userId, id, data) {
  // The extra userId condition makes the update a no-op for other users' rows;
  // Prisma then throws P2025, which the error handler turns into a 404.
  const updated = await prisma.transaction.update({
    where: { id, userId },
    data: toWriteData(data),
  });
  const transaction = serializeTransaction(updated);
  return { transaction, budgetAlert: await getBudgetAlert(userId, transaction) };
}

export async function deleteTransaction(userId, id) {
  await prisma.transaction.delete({ where: { id, userId } });
}

export async function exportTransactionsCsv(userId, query) {
  const where = buildWhere(userId, query);
  const total = await prisma.transaction.count({ where });
  if (total > MAX_EXPORT_ROWS) {
    throw AppError.badRequest(
      `Too many transactions to export (${total}). Narrow the filters to ${MAX_EXPORT_ROWS} or fewer.`,
      'EXPORT_TOO_LARGE',
    );
  }

  const rows = await prisma.transaction.findMany({ where, orderBy: buildOrderBy(query) });

  return toCsv(
    ['Date', 'Type', 'Category', 'Description', 'Amount'],
    rows.map((t) => [
      toDateString(t.date),
      t.type === 'INCOME' ? 'Income' : 'Expense',
      CATEGORY_LABELS[t.category],
      t.description ?? '',
      toNumber(t.amount),
    ]),
  );
}
