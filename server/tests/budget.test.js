import { beforeEach, describe, expect, it } from 'vitest';
import { addTransaction, api, registerUser, useCleanDatabase } from './helpers.js';

useCleanDatabase();

let user;

beforeEach(async () => {
  user = await registerUser();
});

const getBudget = (auth, year = 2025, month = 6) =>
  api().get(`/api/budget?year=${year}&month=${month}`).set(auth);

describe('POST /api/budget', () => {
  it('sets a monthly budget', async () => {
    const res = await api()
      .post('/api/budget')
      .set(user.auth)
      .send({ year: 2025, month: 6, amount: 40000 });

    expect(res.status).toBe(201);
    expect(res.body.budget).toMatchObject({ year: 2025, month: 6, amount: 40000 });
  });

  it('refuses a second budget for the same month', async () => {
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 6, amount: 40000 });
    const res = await api()
      .post('/api/budget')
      .set(user.auth)
      .send({ year: 2025, month: 6, amount: 50000 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BUDGET_EXISTS');
  });

  it.each([
    ['month 13', { month: 13 }, 'month'],
    ['month 0', { month: 0 }, 'month'],
    ['year 1999', { year: 1999 }, 'year'],
    ['a zero amount', { amount: 0 }, 'amount'],
    ['a negative amount', { amount: -100 }, 'amount'],
    ['a missing amount', { amount: undefined }, 'amount'],
  ])('rejects %s', async (_label, override, field) => {
    const res = await api()
      .post('/api/budget')
      .set(user.auth)
      .send({ year: 2025, month: 6, amount: 40000, ...override });

    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  it('requires authentication', async () => {
    const res = await api().post('/api/budget').send({ year: 2025, month: 6, amount: 1 });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/budget', () => {
  it('updates an existing budget', async () => {
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 6, amount: 40000 });
    const res = await api()
      .put('/api/budget')
      .set(user.auth)
      .send({ year: 2025, month: 6, amount: 45000.5 });

    expect(res.status).toBe(200);
    expect(res.body.budget.amount).toBe(45000.5);
  });

  it('returns 404 when no budget exists for that month', async () => {
    const res = await api()
      .put('/api/budget')
      .set(user.auth)
      .send({ year: 2025, month: 7, amount: 45000 });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BUDGET_NOT_FOUND');
  });
});

describe('GET /api/budget', () => {
  it('reports "none" when no budget is set, but still totals spending', async () => {
    await addTransaction(user.auth, { amount: 1200, date: '2025-06-10' });
    const res = await getBudget(user.auth);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      year: 2025,
      month: 6,
      label: 'June 2025',
      budget: null,
      spent: 1200,
      status: 'none',
      remaining: null,
      percentUsed: null,
    });
  });

  it.each([
    [7000, 'on_track', 3000, 70],
    [8000, 'warning', 2000, 80],
    [10000, 'warning', 0, 100],
    [12500, 'exceeded', -2500, 125],
  ])('spending %d of 10,000 is "%s"', async (spent, status, remaining, percentUsed) => {
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 6, amount: 10000 });
    await addTransaction(user.auth, { amount: spent, date: '2025-06-10' });

    const res = await getBudget(user.auth);

    expect(res.body).toMatchObject({ amount: 10000, spent, status, remaining, percentUsed });
  });

  it('only counts expenses from that month', async () => {
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 6, amount: 10000 });
    await addTransaction(user.auth, { amount: 1000, date: '2025-06-01' });
    await addTransaction(user.auth, { amount: 2000, date: '2025-06-30' });
    await addTransaction(user.auth, { amount: 5000, date: '2025-05-31' }); // previous month
    await addTransaction(user.auth, { amount: 5000, date: '2025-07-01' }); // next month
    await addTransaction(user.auth, {
      type: 'INCOME',
      category: 'SALARY',
      amount: 90000,
      date: '2025-06-15',
    });

    const res = await getBudget(user.auth);

    expect(res.body.spent).toBe(3000);
  });

  it('breaks spending down by category, largest first', async () => {
    await addTransaction(user.auth, { category: 'FOOD', amount: 300, date: '2025-06-02' });
    await addTransaction(user.auth, { category: 'RENT', amount: 1500, date: '2025-06-03' });
    await addTransaction(user.auth, { category: 'FOOD', amount: 200, date: '2025-06-04' });

    const res = await getBudget(user.auth);

    expect(res.body.categoryBreakdown).toEqual([
      { category: 'RENT', total: 1500, count: 1, percentage: 75 },
      { category: 'FOOD', total: 500, count: 2, percentage: 25 },
    ]);
  });

  it('returns six months of history across a year boundary', async () => {
    await api().post('/api/budget').set(user.auth).send({ year: 2025, month: 12, amount: 5000 });
    await addTransaction(user.auth, { amount: 6000, date: '2025-12-24' });

    const res = await getBudget(user.auth, 2026, 2);

    expect(res.body.history.map((h) => `${h.year}-${h.month}`)).toEqual([
      '2025-9',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-1',
      '2026-2',
    ]);
    expect(res.body.history[3]).toMatchObject({ budget: 5000, spent: 6000, status: 'exceeded' });
    expect(res.body.history[5]).toMatchObject({ budget: null, status: 'none' });
  });

  it("is not affected by other users' budgets or spending", async () => {
    const other = await registerUser();
    await api().post('/api/budget').set(other.auth).send({ year: 2025, month: 6, amount: 100 });
    await addTransaction(other.auth, { amount: 9999, date: '2025-06-10' });

    const res = await getBudget(user.auth);

    expect(res.body).toMatchObject({ budget: null, spent: 0, status: 'none' });
  });

  it('requires year and month together', async () => {
    const res = await api().get('/api/budget?year=2025').set(user.auth);
    expect(res.status).toBe(400);
  });
});
