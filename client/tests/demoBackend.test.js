import { beforeEach, describe, expect, it } from 'vitest';
import { handleRequest, resetDemoDatabase } from '../src/demo/demoBackend.js';

/**
 * The GitHub Pages demo answers API calls in the browser. These tests check that it keeps the
 * real API's contract: status codes, error format, auth rules and per-user data isolation.
 */

const call = (method, url, { token, params, body } = {}) =>
  handleRequest({
    method,
    url,
    params,
    data: body === undefined ? undefined : JSON.stringify(body),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

/** Resolve with the error response of a request that is expected to fail. */
const failure = (request) =>
  request.then(
    () => {
      throw new Error('Expected the request to fail');
    },
    (error) => error.response,
  );

const today = new Date().toISOString().slice(0, 10);
const [thisYear, thisMonth] = today.split('-').map(Number);

async function register(email) {
  const response = await call('POST', '/auth/register', {
    body: { name: 'Test User', email, password: 'Secret123' },
  });
  return response.data.token;
}

beforeEach(() => {
  resetDemoDatabase();
});

describe('demo backend: auth', () => {
  it('lets the seeded account log in and rejects a wrong password', async () => {
    const login = await call('POST', '/auth/login', {
      body: { email: 'demo@financeflow.app', password: 'Demo@12345' },
    });
    expect(login.status).toBe(200);
    expect(login.data.user).toMatchObject({ email: 'demo@financeflow.app', isDemo: false });
    expect(login.data.token).toEqual(expect.any(String));

    const wrong = await failure(
      call('POST', '/auth/login', {
        body: { email: 'demo@financeflow.app', password: 'nope-1234' },
      }),
    );
    expect(wrong.status).toBe(401);
    expect(wrong.data.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('validates registration with the API rules and blocks duplicate emails', async () => {
    const weak = await failure(
      call('POST', '/auth/register', {
        body: { name: 'A', email: 'not-an-email', password: 'short' },
      }),
    );
    expect(weak.status).toBe(400);
    expect(weak.data.error.code).toBe('VALIDATION_ERROR');
    expect(weak.data.error.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );

    await register('jatin@example.com');
    const duplicate = await failure(
      call('POST', '/auth/register', {
        body: { name: 'Again', email: 'JATIN@example.com', password: 'Secret123' },
      }),
    );
    expect(duplicate.status).toBe(409);
    expect(duplicate.data.error.code).toBe('EMAIL_TAKEN');
  });

  it('requires a session for protected routes', async () => {
    const response = await failure(call('GET', '/dashboard'));
    expect(response.status).toBe(401);
    expect(response.data.error.code).toBe('NO_TOKEN');

    const bad = await failure(call('GET', '/auth/me', { token: 'not-a-real-token' }));
    expect(bad.data.error.code).toBe('INVALID_TOKEN');
  });
});

describe('demo backend: data', () => {
  it('creates a sandbox account with six months of sample data', async () => {
    const session = await call('POST', '/auth/demo');
    expect(session.status).toBe(201);
    expect(session.data.user.isDemo).toBe(true);

    const dashboard = await call('GET', '/dashboard', {
      token: session.data.token,
      params: { year: thisYear, month: thisMonth },
    });
    expect(dashboard.data.monthlyTrend).toHaveLength(6);
    expect(dashboard.data.summary.transactionCount).toBeGreaterThan(50);
    expect(dashboard.data.recentTransactions).toHaveLength(6);
    expect(dashboard.data.budget.amount).toBeGreaterThan(0);
  });

  it('supports the full transaction lifecycle with filters', async () => {
    const token = await register('crud@example.com');

    const invalid = await failure(
      call('POST', '/transactions', {
        token,
        body: { amount: -5, type: 'EXPENSE', category: 'FOOD', date: today },
      }),
    );
    expect(invalid.status).toBe(400);
    expect(invalid.data.error.details[0]).toEqual({
      field: 'amount',
      message: 'Amount must be greater than 0',
    });

    const created = await call('POST', '/transactions', {
      token,
      body: {
        amount: 123.45,
        type: 'EXPENSE',
        category: 'FOOD',
        description: 'Team lunch',
        date: today,
      },
    });
    expect(created.status).toBe(201);
    const { id } = created.data.transaction;

    const found = await call('GET', '/transactions', { token, params: { search: 'team' } });
    expect(found.data.pagination.total).toBe(1);
    expect(found.data.summary).toEqual({ income: 0, expenses: 123.45, net: -123.45 });

    const byCategory = await call('GET', '/transactions', { token, params: { search: 'dining' } });
    expect(byCategory.data.data[0].id).toBe(id);

    const updated = await call('PUT', `/transactions/${id}`, {
      token,
      body: { amount: 200, type: 'EXPENSE', category: 'FOOD', description: null, date: today },
    });
    expect(updated.data.transaction).toMatchObject({ amount: 200, description: null });

    const removed = await call('DELETE', `/transactions/${id}`, { token });
    expect(removed.status).toBe(204);

    const missing = await failure(call('GET', `/transactions/${id}`, { token }));
    expect(missing.status).toBe(404);
  });

  it("never shows one user's transactions to another", async () => {
    const owner = await register('owner@example.com');
    const created = await call('POST', '/transactions', {
      token: owner,
      body: { amount: 500, type: 'INCOME', category: 'FREELANCE', date: today },
    });

    const stranger = await register('stranger@example.com');
    const list = await call('GET', '/transactions', { token: stranger });
    expect(list.data.pagination.total).toBe(0);

    const peek = await failure(
      call('GET', `/transactions/${created.data.transaction.id}`, { token: stranger }),
    );
    expect(peek.status).toBe(404);
  });

  it('exports CSV and manages the monthly budget', async () => {
    const token = await register('budget@example.com');
    await call('POST', '/transactions', {
      token,
      body: {
        amount: 900,
        type: 'EXPENSE',
        category: 'BILLS',
        description: '=SUM(A1)',
        date: today,
      },
    });

    const csv = await call('GET', '/transactions/export', { token });
    expect(csv.headers['content-disposition']).toContain('financeflow-transactions-');
    const text = await csv.data.text();
    expect(text).toContain('Date,Type,Category,Description,Amount');
    expect(text).toContain("'=SUM(A1)"); // formula injection is neutralised, like the API

    const budget = { year: thisYear, month: thisMonth, amount: 1000 };
    expect((await call('POST', '/budget', { token, body: budget })).status).toBe(201);
    const again = await failure(call('POST', '/budget', { token, body: budget }));
    expect(again.data.error.code).toBe('BUDGET_EXISTS');

    const overview = await call('GET', '/budget', {
      token,
      params: { year: thisYear, month: thisMonth },
    });
    expect(overview.data).toMatchObject({ amount: 1000, spent: 900, status: 'warning' });

    const raised = await call('PUT', '/budget', { token, body: { ...budget, amount: 5000 } });
    expect(raised.data.budget.amount).toBe(5000);
  });
});
