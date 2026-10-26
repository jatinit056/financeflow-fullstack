import { beforeEach, describe, expect, it } from 'vitest';
import {
  addTransaction,
  api,
  prisma,
  registerUser,
  useCleanDatabase,
  validTransaction,
} from './helpers.js';

useCleanDatabase();

let alice;
let bob;

beforeEach(async () => {
  alice = await registerUser({ name: 'Alice' });
  bob = await registerUser({ name: 'Bob' });
});

describe('authentication', () => {
  it.each([
    ['get', '/api/transactions'],
    ['post', '/api/transactions'],
    ['get', '/api/transactions/export'],
    ['get', '/api/transactions/0192f2b4-0000-7000-8000-000000000000'],
    ['put', '/api/transactions/0192f2b4-0000-7000-8000-000000000000'],
    ['delete', '/api/transactions/0192f2b4-0000-7000-8000-000000000000'],
  ])('%s %s requires a token', async (method, path) => {
    const res = await api()[method](path);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/transactions', () => {
  it('creates a transaction for the logged-in user', async () => {
    const res = await api().post('/api/transactions').set(alice.auth).send(validTransaction());

    expect(res.status).toBe(201);
    expect(res.body.transaction).toMatchObject({
      id: expect.any(String),
      amount: 450.5,
      type: 'EXPENSE',
      category: 'FOOD',
      description: 'Lunch with team',
      date: '2025-06-15',
    });

    const stored = await prisma.transaction.findUnique({ where: { id: res.body.transaction.id } });
    expect(stored.userId).toBe(alice.user.id);
    expect(stored.amount.toString()).toBe('450.5');
  });

  it('ignores a userId sent in the body (mass assignment protection)', async () => {
    const res = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send({ ...validTransaction(), userId: bob.user.id });

    expect(res.status).toBe(201);
    const stored = await prisma.transaction.findUnique({ where: { id: res.body.transaction.id } });
    expect(stored.userId).toBe(alice.user.id);
  });

  it('accepts numeric strings and trims the description', async () => {
    const res = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ amount: '1999.99', description: '  Headphones  ' }));

    expect(res.status).toBe(201);
    expect(res.body.transaction.amount).toBe(1999.99);
    expect(res.body.transaction.description).toBe('Headphones');
  });

  it('stores an empty description as null', async () => {
    const res = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ description: '   ' }));

    expect(res.status).toBe(201);
    expect(res.body.transaction.description).toBeNull();
  });

  it.each([
    ['a missing amount', { amount: undefined }, 'amount'],
    ['a negative amount', { amount: -10 }, 'amount'],
    ['a zero amount', { amount: 0 }, 'amount'],
    ['more than 2 decimals', { amount: 10.555 }, 'amount'],
    ['a non-numeric amount', { amount: 'ten' }, 'amount'],
    ['an unknown type', { type: 'TRANSFER' }, 'type'],
    ['an unknown category', { category: 'CRYPTO' }, 'category'],
    ['an income category on an expense', { type: 'EXPENSE', category: 'SALARY' }, 'category'],
    ['an expense category on income', { type: 'INCOME', category: 'RENT' }, 'category'],
    ['an impossible date', { date: '2025-02-30' }, 'date'],
    ['a badly formatted date', { date: '15/06/2025' }, 'date'],
    ['a future date', { date: '2099-01-01' }, 'date'],
    ['a description over 255 chars', { description: 'x'.repeat(256) }, 'description'],
  ])('rejects %s with 400', async (_label, override, field) => {
    const res = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction(override));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });
});

describe('GET /api/transactions/:id', () => {
  it('returns a transaction owned by the user', async () => {
    const created = await addTransaction(alice.auth);
    const res = await api().get(`/api/transactions/${created.id}`).set(alice.auth);

    expect(res.status).toBe(200);
    expect(res.body.transaction).toEqual(created);
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await api()
      .get('/api/transactions/0192f2b4-0000-7000-8000-000000000000')
      .set(alice.auth);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const res = await api().get('/api/transactions/not-a-uuid').set(alice.auth);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/transactions/:id', () => {
  it('updates every field', async () => {
    const created = await addTransaction(alice.auth);
    const update = {
      amount: 72000,
      type: 'INCOME',
      category: 'SALARY',
      description: 'June salary',
      date: '2025-06-30',
    };
    const res = await api().put(`/api/transactions/${created.id}`).set(alice.auth).send(update);

    expect(res.status).toBe(200);
    expect(res.body.transaction).toMatchObject({ id: created.id, ...update });

    const refetched = await api().get(`/api/transactions/${created.id}`).set(alice.auth);
    expect(refetched.body.transaction).toMatchObject(update);
  });

  it('validates the update body', async () => {
    const created = await addTransaction(alice.auth);
    const res = await api()
      .put(`/api/transactions/${created.id}`)
      .set(alice.auth)
      .send(validTransaction({ amount: -5 }));

    expect(res.status).toBe(400);
  });

  it('returns 404 for a missing transaction', async () => {
    const res = await api()
      .put('/api/transactions/0192f2b4-0000-7000-8000-000000000000')
      .set(alice.auth)
      .send(validTransaction());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('deletes the transaction', async () => {
    const created = await addTransaction(alice.auth);

    const res = await api().delete(`/api/transactions/${created.id}`).set(alice.auth);
    expect(res.status).toBe(204);

    const after = await api().get(`/api/transactions/${created.id}`).set(alice.auth);
    expect(after.status).toBe(404);
  });

  it('returns 404 when deleting twice', async () => {
    const created = await addTransaction(alice.auth);
    await api().delete(`/api/transactions/${created.id}`).set(alice.auth);

    const res = await api().delete(`/api/transactions/${created.id}`).set(alice.auth);
    expect(res.status).toBe(404);
  });
});

describe('authorization — users can only touch their own data', () => {
  it("cannot read, update or delete another user's transaction", async () => {
    const alicesTx = await addTransaction(alice.auth, { amount: 999 });

    const read = await api().get(`/api/transactions/${alicesTx.id}`).set(bob.auth);
    const update = await api()
      .put(`/api/transactions/${alicesTx.id}`)
      .set(bob.auth)
      .send(validTransaction({ amount: 1 }));
    const remove = await api().delete(`/api/transactions/${alicesTx.id}`).set(bob.auth);

    // 404 (not 403) so the API does not even confirm the record exists
    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);

    const untouched = await prisma.transaction.findUnique({ where: { id: alicesTx.id } });
    expect(untouched.amount.toString()).toBe('999');
  });

  it('only lists and exports the user’s own transactions', async () => {
    await addTransaction(alice.auth, { description: 'Alice private' });
    await addTransaction(bob.auth, { description: 'Bob private' });

    const list = await api().get('/api/transactions').set(bob.auth);
    expect(list.body.data.map((t) => t.description)).toEqual(['Bob private']);
    expect(list.body.pagination.total).toBe(1);

    const csv = await api().get('/api/transactions/export').set(bob.auth);
    expect(csv.text).toContain('Bob private');
    expect(csv.text).not.toContain('Alice private');
  });
});

describe('GET /api/transactions — list, filter, search, sort, paginate', () => {
  beforeEach(async () => {
    const seed = [
      {
        amount: 72000,
        type: 'INCOME',
        category: 'SALARY',
        description: 'Salary',
        date: '2025-05-01',
      },
      {
        amount: 16000,
        type: 'EXPENSE',
        category: 'RENT',
        description: 'House rent',
        date: '2025-05-02',
      },
      {
        amount: 450,
        type: 'EXPENSE',
        category: 'FOOD',
        description: 'Swiggy order',
        date: '2025-05-10',
      },
      {
        amount: 1200,
        type: 'EXPENSE',
        category: 'TRANSPORT',
        description: 'Uber to airport',
        date: '2025-05-20',
      },
      {
        amount: 8000,
        type: 'INCOME',
        category: 'FREELANCE',
        description: 'Logo design',
        date: '2025-06-05',
      },
      {
        amount: 2300,
        type: 'EXPENSE',
        category: 'FOOD',
        description: 'Groceries',
        date: '2025-06-12',
      },
    ];
    for (const tx of seed) await addTransaction(alice.auth, tx);
  });

  it('returns newest first with pagination metadata and totals', async () => {
    const res = await api().get('/api/transactions?limit=4').set(alice.auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data.map((t) => t.date)).toEqual([
      '2025-06-12',
      '2025-06-05',
      '2025-05-20',
      '2025-05-10',
    ]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 4, total: 6, totalPages: 2 });
    expect(res.body.summary).toEqual({ income: 80000, expenses: 19950, net: 60050 });
  });

  it('returns the second page', async () => {
    const res = await api().get('/api/transactions?limit=4&page=2').set(alice.auth);

    expect(res.body.data.map((t) => t.date)).toEqual(['2025-05-02', '2025-05-01']);
  });

  it('filters by type', async () => {
    const res = await api().get('/api/transactions?type=INCOME').set(alice.auth);

    expect(res.body.data.every((t) => t.type === 'INCOME')).toBe(true);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.summary.expenses).toBe(0);
  });

  it('filters by category', async () => {
    const res = await api().get('/api/transactions?category=FOOD').set(alice.auth);

    expect(res.body.data.map((t) => t.description).sort()).toEqual(['Groceries', 'Swiggy order']);
  });

  it('filters by an inclusive date range', async () => {
    const res = await api()
      .get('/api/transactions?startDate=2025-05-02&endDate=2025-05-20')
      .set(alice.auth);

    expect(res.body.data.map((t) => t.date)).toEqual(['2025-05-20', '2025-05-10', '2025-05-02']);
  });

  it('searches descriptions case-insensitively', async () => {
    const res = await api().get('/api/transactions?search=UBER').set(alice.auth);

    expect(res.body.data.map((t) => t.description)).toEqual(['Uber to airport']);
  });

  it('treats % and _ in a search literally', async () => {
    await addTransaction(alice.auth, { description: 'Paid 50% deposit', date: '2025-06-20' });
    await addTransaction(alice.auth, { description: 'file_name.pdf printout', date: '2025-06-21' });

    const percent = await api().get('/api/transactions?search=%25').set(alice.auth);
    const underscore = await api().get('/api/transactions?search=_').set(alice.auth);

    expect(percent.body.data.map((t) => t.description)).toEqual(['Paid 50% deposit']);
    expect(underscore.body.data.map((t) => t.description)).toEqual(['file_name.pdf printout']);
  });

  it('search also matches category names', async () => {
    const res = await api().get('/api/transactions?search=dining').set(alice.auth);

    expect(res.body.data.every((t) => t.category === 'FOOD')).toBe(true);
    expect(res.body.pagination.total).toBe(2);
  });

  it('sorts by amount ascending', async () => {
    const res = await api().get('/api/transactions?sortBy=amount&sortOrder=asc').set(alice.auth);
    const amounts = res.body.data.map((t) => t.amount);

    expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
  });

  it('combines filters', async () => {
    const res = await api()
      .get('/api/transactions?type=EXPENSE&category=FOOD&startDate=2025-06-01')
      .set(alice.auth);

    expect(res.body.data.map((t) => t.description)).toEqual(['Groceries']);
  });

  it('treats empty query values as "no filter"', async () => {
    const res = await api().get('/api/transactions?type=&category=&search=').set(alice.auth);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(6);
  });

  it.each([
    ['limit above 100', 'limit=500'],
    ['page 0', 'page=0'],
    ['unknown sort field', 'sortBy=password'],
    ['invalid type', 'type=TRANSFER'],
    ['end date before start date', 'startDate=2025-06-01&endDate=2025-05-01'],
  ])('rejects %s with 400', async (_label, query) => {
    const res = await api().get(`/api/transactions?${query}`).set(alice.auth);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/transactions/export', () => {
  it('downloads matching transactions as CSV', async () => {
    await addTransaction(alice.auth, { description: 'Groceries, weekly', amount: 1500 });
    await addTransaction(alice.auth, { description: 'Said "hello"', amount: 20 });
    await addTransaction(alice.auth, {
      type: 'INCOME',
      category: 'SALARY',
      description: 'Salary',
      amount: 50000,
    });

    const res = await api().get('/api/transactions/export?type=EXPENSE').set(alice.auth);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="?financeflow-transactions-\d{4}-\d{2}-\d{2}\.csv"?$/,
    );

    const lines = res.text
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines[0]).toBe('Date,Type,Category,Description,Amount');
    expect(lines).toHaveLength(3); // header + 2 expenses
    expect(res.text).toContain('"Groceries, weekly"');
    expect(res.text).toContain('"Said ""hello"""');
    expect(res.text).not.toContain('Salary');
  });

  it('neutralises spreadsheet formulas (CSV injection)', async () => {
    await addTransaction(alice.auth, { description: '=HYPERLINK("http://evil.example")' });

    const res = await api().get('/api/transactions/export').set(alice.auth);

    expect(res.text).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
  });
});

describe('budget alerts on expenses', () => {
  it('warns at 80% of the monthly budget and again when it is exceeded', async () => {
    await api().post('/api/budget').set(alice.auth).send({ year: 2025, month: 6, amount: 1000 });

    const first = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ amount: 500, date: '2025-06-03' }));
    expect(first.body.budgetAlert).toBeNull();

    const second = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ amount: 350, date: '2025-06-04' }));
    expect(second.body.budgetAlert).toMatchObject({ status: 'warning', percentUsed: 85 });

    const third = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ amount: 200, date: '2025-06-05' }));
    expect(third.body.budgetAlert).toMatchObject({ status: 'exceeded', spent: 1050, budget: 1000 });
  });

  it('never attaches an alert to income', async () => {
    await api().post('/api/budget').set(alice.auth).send({ year: 2025, month: 6, amount: 100 });
    await addTransaction(alice.auth, { amount: 500, date: '2025-06-03' });

    const res = await api()
      .post('/api/transactions')
      .set(alice.auth)
      .send(validTransaction({ type: 'INCOME', category: 'SALARY', date: '2025-06-03' }));

    expect(res.body.budgetAlert).toBeNull();
  });
});
