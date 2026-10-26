import { beforeEach, describe, expect, it } from 'vitest';
import { addTransaction, api, registerUser, useCleanDatabase } from './helpers.js';

useCleanDatabase();

let user;

beforeEach(async () => {
  user = await registerUser();
});

async function seedHistory(auth) {
  const rows = [
    // March 2025 (before a 3-month window ending June)
    { type: 'INCOME', category: 'SALARY', amount: 50000, date: '2025-03-01' },
    { type: 'EXPENSE', category: 'RENT', amount: 15000, date: '2025-03-02' },
    // April
    { type: 'INCOME', category: 'SALARY', amount: 50000, date: '2025-04-01' },
    { type: 'EXPENSE', category: 'RENT', amount: 15000, date: '2025-04-02' },
    { type: 'EXPENSE', category: 'FOOD', amount: 5000, date: '2025-04-12' },
    // May — no transactions at all
    // June
    { type: 'INCOME', category: 'SALARY', amount: 50000, date: '2025-06-01' },
    { type: 'INCOME', category: 'FREELANCE', amount: 10000, date: '2025-06-08' },
    { type: 'EXPENSE', category: 'RENT', amount: 15000, date: '2025-06-02' },
    { type: 'EXPENSE', category: 'SHOPPING', amount: 25000, date: '2025-06-18' },
    { type: 'EXPENSE', category: 'FOOD', amount: 4000, date: '2025-06-20' },
  ];
  for (const row of rows) await addTransaction(auth, { description: null, ...row });
}

describe('GET /api/dashboard', () => {
  it('returns zeros and empty lists for a brand-new user', async () => {
    const res = await api().get('/api/dashboard?year=2025&month=6').set(user.auth);

    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      transactionCount: 0,
    });
    expect(res.body.budget.status).toBe('none');
    expect(res.body.recentTransactions).toEqual([]);
    expect(res.body.expenseBreakdown).toEqual([]);
    expect(res.body.monthlyTrend).toHaveLength(6);
    expect(res.body.monthlyTrend.every((m) => m.income === 0 && m.expenses === 0)).toBe(true);
  });

  it('summarises all-time totals, the current month, budget and trend', async () => {
    await seedHistory(user.auth);
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 6, amount: 50000 });

    const res = await api().get('/api/dashboard?year=2025&month=6').set(user.auth);
    const body = res.body;

    expect(body.period).toEqual({ year: 2025, month: 6, label: 'June 2025' });
    expect(body.summary).toEqual({
      totalIncome: 160000,
      totalExpenses: 79000,
      balance: 81000,
      transactionCount: 10,
    });
    expect(body.currentMonth).toEqual({
      income: 60000,
      expenses: 44000,
      net: 16000,
      transactionCount: 5,
    });
    expect(body.budget).toEqual({
      amount: 50000,
      spent: 44000,
      remaining: 6000,
      percentUsed: 88,
      status: 'warning',
    });
    expect(body.expenseBreakdown.map((c) => c.category)).toEqual(['SHOPPING', 'RENT', 'FOOD']);
    expect(body.expenseBreakdown.reduce((sum, c) => sum + c.percentage, 0)).toBeCloseTo(100, 0);

    expect(body.monthlyTrend.map((m) => m.key)).toEqual([
      '2025-01',
      '2025-02',
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
    ]);
    expect(body.monthlyTrend[3]).toMatchObject({
      label: 'Apr',
      income: 50000,
      expenses: 20000,
      net: 30000,
    });
    expect(body.monthlyTrend[4]).toMatchObject({ income: 0, expenses: 0 });

    expect(body.recentTransactions).toHaveLength(6);
    expect(body.recentTransactions[0].date).toBe('2025-06-20');
  });

  it("never includes another user's data", async () => {
    const other = await registerUser();
    await seedHistory(other.auth);

    const res = await api().get('/api/dashboard?year=2025&month=6').set(user.auth);

    expect(res.body.summary.transactionCount).toBe(0);
    expect(res.body.recentTransactions).toEqual([]);
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/dashboard')).status).toBe(401);
  });
});

describe('GET /api/analytics', () => {
  it('builds a monthly series with a running balance that starts from the opening balance', async () => {
    await seedHistory(user.auth);

    const res = await api().get('/api/analytics?months=3&year=2025&month=6').set(user.auth);
    const body = res.body;

    expect(res.status).toBe(200);
    expect(body.range).toMatchObject({ months: 3, start: '2025-04-01', end: '2025-07-01' });
    // March is before the window: 50,000 - 15,000 = 35,000 opening balance
    expect(body.totals.openingBalance).toBe(35000);
    expect(body.monthly.map((m) => [m.key, m.income, m.expenses, m.net, m.balance])).toEqual([
      ['2025-04', 50000, 20000, 30000, 65000],
      ['2025-05', 0, 0, 0, 65000],
      ['2025-06', 60000, 44000, 16000, 81000],
    ]);
    expect(body.totals).toMatchObject({
      income: 110000,
      expenses: 64000,
      net: 46000,
      closingBalance: 81000,
      savingsRate: 41.8,
    });
  });

  it('ranks categories and surfaces insights', async () => {
    await seedHistory(user.auth);

    const res = await api().get('/api/analytics?months=3&year=2025&month=6').set(user.auth);
    const { categoryExpenses, insights } = res.body;

    expect(categoryExpenses.map((c) => [c.category, c.total])).toEqual([
      ['RENT', 30000],
      ['SHOPPING', 25000],
      ['FOOD', 9000],
    ]);
    expect(insights.topCategory.category).toBe('RENT');
    expect(insights.largestExpense).toMatchObject({ amount: 25000, category: 'SHOPPING' });
    expect(insights.bestMonth).toMatchObject({ key: '2025-04', net: 30000 });
    expect(insights.topSpendingMonth).toMatchObject({ key: '2025-06', expenses: 44000 });
  });

  it('defaults to six months', async () => {
    const res = await api().get('/api/analytics').set(user.auth);

    expect(res.status).toBe(200);
    expect(res.body.monthly).toHaveLength(6);
  });

  it('only allows 3, 6 or 12 months', async () => {
    const res = await api().get('/api/analytics?months=5').set(user.auth);

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('months');
  });
});
