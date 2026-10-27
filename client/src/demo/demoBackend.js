/**
 * In-browser stand-in for the FinanceFlow REST API, used only by the static GitHub Pages build
 * (`npm run build:pages`). GitHub Pages can't run the Express server or PostgreSQL, so this
 * module answers the same endpoints with the same status codes, error format and JSON shapes.
 *
 * What is shared with the real API (imported straight from server/src):
 *   - request validation: the server's own Zod schemas, so error messages match exactly
 *   - sample data, budget status, CSV export, date and money helpers
 * What is re-implemented here: the database queries, over plain arrays.
 *
 * Data is stored in this browser only (localStorage, or memory when storage is blocked).
 * Amounts are kept as integer paise so sums stay exact, like DECIMAL(12, 2) in Postgres.
 */
import { AxiosError, CanceledError } from 'axios';
import { CATEGORY_LABELS, categoriesMatching } from '../../../server/src/constants/categories.js';
import { loginSchema, registerSchema } from '../../../server/src/modules/auth/auth.schemas.js';
import { analyticsQuerySchema } from '../../../server/src/modules/analytics/analytics.schemas.js';
import { budgetBodySchema } from '../../../server/src/modules/budget/budget.schemas.js';
import {
  exportQuerySchema,
  listQuerySchema,
  transactionBodySchema,
} from '../../../server/src/modules/transactions/transactions.schemas.js';
import { AppError } from '../../../server/src/utils/AppError.js';
import { getBudgetStatus } from '../../../server/src/utils/budgetStatus.js';
import { toCsv } from '../../../server/src/utils/csv.js';
import {
  currentYearMonth,
  lastMonths,
  monthBounds,
  monthKey,
  monthLabel,
  monthName,
  todayString,
} from '../../../server/src/utils/dates.js';
import { percentage, round2 } from '../../../server/src/utils/money.js';
import { buildSampleData } from '../../../server/src/utils/sampleData.js';
import { monthAnchorQuery, uuidParam } from '../../../server/src/validation/common.js';

const STORAGE_KEY = 'financeflow.demo-db.v1';
const SEEDED_EMAIL = 'demo@financeflow.app';
const SEEDED_PASSWORD = 'Demo@12345';
const HOUR = 60 * 60 * 1000;
const SESSION_TTL = { user: 7 * 24 * HOUR, demo: 24 * HOUR };
const MAX_SANDBOX_USERS = 5;
const MAX_EXPORT_ROWS = 10_000;

// Postgres sorts enum columns by declaration order (schema.prisma), not alphabetically.
const CATEGORY_ORDER = [
  'SALARY',
  'FREELANCE',
  'INVESTMENTS',
  'FOOD',
  'TRANSPORT',
  'SHOPPING',
  'BILLS',
  'RENT',
  'HEALTH',
  'EDUCATION',
  'ENTERTAINMENT',
  'OTHER',
];

/* ------------------------------------------------------------------ storage */

let memoryDb = null;
let storageWorks = true;

function readDb() {
  if (storageWorks) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      storageWorks = false;
    }
  }
  return memoryDb;
}

function writeDb(db) {
  memoryDb = db;
  if (!storageWorks) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: carry on in memory for the rest of this visit.
    storageWorks = false;
  }
}

/* ------------------------------------------------------------------ helpers */

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (length) => toHex(crypto.getRandomValues(new Uint8Array(length)));

/** Time-ordered UUID v7, like the database's uuid(7) default. */
function uuidv7() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let time = Date.now();
  for (let i = 5; i >= 0; i--) {
    bytes[i] = time % 256;
    time = Math.floor(time / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = toHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** PBKDF2-SHA256 via Web Crypto. Passwords never leave the browser, but aren't kept in plain text. */
async function hashPassword(password, salt = randomHex(16)) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return `${salt}:${toHex(new Uint8Array(bits))}`;
}

async function passwordMatches(password, stored) {
  if (!stored) return false;
  const [salt] = stored.split(':');
  return (await hashPassword(password, salt)) === stored;
}

const toPaise = (amount) => Math.round(Number(amount) * 100);
const sumPaise = (rows) => rows.reduce((total, row) => total + row.paise, 0);
const nowIso = () => new Date().toISOString();

const publicUser = ({ id, name, email, isDemo, createdAt }) => ({
  id,
  name,
  email,
  isDemo,
  createdAt,
});

const serializeTransaction = (t) => ({
  id: t.id,
  amount: t.paise / 100,
  type: t.type,
  category: t.category,
  description: t.description,
  date: t.date,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
});

const serializeBudget = (b) => ({
  id: b.id,
  month: b.month,
  year: b.year,
  amount: b.paise / 100,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

/** Same checks and error shape as server/src/middleware/validate.js. */
function validate(schemas, input) {
  const validated = {};
  const details = [];
  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(input[part] ?? {});
    if (result.success) {
      validated[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ field: issue.path.join('.') || part, message: issue.message });
      }
    }
  }
  if (details.length > 0) {
    throw AppError.badRequest(details[0].message, 'VALIDATION_ERROR', details);
  }
  return validated;
}

/* --------------------------------------------------------------- data setup */

function insertSampleData(db, userId, { transactions, budgets }) {
  const createdAt = nowIso();
  for (const t of transactions) {
    db.transactions.push({
      id: uuidv7(),
      userId,
      paise: toPaise(t.amount),
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      createdAt,
      updatedAt: createdAt,
    });
  }
  for (const b of budgets) {
    db.budgets.push({
      id: uuidv7(),
      userId,
      year: b.year,
      month: b.month,
      paise: toPaise(b.amount),
      createdAt,
      updatedAt: createdAt,
    });
  }
}

/** First visit: an empty database plus the seeded account from the README. */
async function createDb() {
  const db = { version: 1, users: [], sessions: {}, transactions: [], budgets: [] };
  const createdAt = nowIso();
  const user = {
    id: uuidv7(),
    name: 'Demo User',
    email: SEEDED_EMAIL,
    passwordHash: await hashPassword(SEEDED_PASSWORD),
    isDemo: false,
    createdAt,
    updatedAt: createdAt,
  };
  db.users.push(user);
  insertSampleData(db, user.id, buildSampleData());
  return db;
}

function deleteUsers(db, ids) {
  if (ids.size === 0) return;
  db.users = db.users.filter((u) => !ids.has(u.id));
  db.transactions = db.transactions.filter((t) => !ids.has(t.userId));
  db.budgets = db.budgets.filter((b) => !ids.has(b.userId));
  for (const [token, session] of Object.entries(db.sessions)) {
    if (ids.has(session.userId)) delete db.sessions[token];
  }
}

/** Sandbox accounts expire after 24 hours, like on the server; keep only a few per browser. */
function purgeSandboxUsers(db, now = Date.now()) {
  const sandbox = db.users
    .filter((u) => u.isDemo)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const expired = sandbox.filter(
    (u, index) =>
      index >= MAX_SANDBOX_USERS - 1 || now - Date.parse(u.createdAt) > SESSION_TTL.demo,
  );
  deleteUsers(db, new Set(expired.map((u) => u.id)));
}

function startSession(db, user) {
  const token = randomHex(32);
  const ttl = user.isDemo ? SESSION_TTL.demo : SESSION_TTL.user;
  db.sessions[token] = { userId: user.id, expiresAt: Date.now() + ttl };
  return { user: publicUser(user), token };
}

/** Same rules and messages as server/src/middleware/auth.js. */
function authenticate(db, headers) {
  const header = headers?.get?.('authorization') ?? headers?.Authorization ?? '';
  const [scheme, token] = String(header).split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw AppError.unauthorized('Please log in to continue', 'NO_TOKEN');
  }
  const session = db.sessions[token];
  if (!session) {
    throw AppError.unauthorized('Invalid session. Please log in again.', 'INVALID_TOKEN');
  }
  if (session.expiresAt < Date.now()) {
    delete db.sessions[token];
    throw AppError.unauthorized('Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
  }
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) throw AppError.unauthorized('This account no longer exists.', 'INVALID_TOKEN');
  return user;
}

/* -------------------------------------------------------------- aggregations */

const ownTransactions = (db, userId) => db.transactions.filter((t) => t.userId === userId);

const inRange = (t, { start, end } = {}) => (!start || t.date >= start) && (!end || t.date < end);

function sumByType(rows, range) {
  const scoped = rows.filter((t) => inRange(t, range));
  const income = sumPaise(scoped.filter((t) => t.type === 'INCOME')) / 100;
  const expenses = sumPaise(scoped.filter((t) => t.type === 'EXPENSE')) / 100;
  return { income, expenses, net: round2(income - expenses), count: scoped.length };
}

function expensesByCategory(rows, range) {
  const groups = new Map();
  for (const t of rows) {
    if (t.type !== 'EXPENSE' || !inRange(t, range)) continue;
    const group = groups.get(t.category) ?? { paise: 0, count: 0 };
    group.paise += t.paise;
    group.count += 1;
    groups.set(t.category, group);
  }
  const total = [...groups.values()].reduce((sum, g) => sum + g.paise, 0);
  return [...groups.entries()]
    .sort((a, b) => b[1].paise - a[1].paise)
    .map(([category, g]) => ({
      category,
      total: g.paise / 100,
      count: g.count,
      percentage: total > 0 ? Math.round((g.paise / total) * 1000) / 10 : 0,
    }));
}

function monthlyTotals(rows, range) {
  const totals = new Map();
  for (const t of rows) {
    if (!inRange(t, range)) continue;
    const key = t.date.slice(0, 7);
    const month = totals.get(key) ?? { income: 0, expenses: 0 };
    if (t.type === 'INCOME') month.income += t.paise;
    else month.expenses += t.paise;
    totals.set(key, month);
  }
  return new Map(
    [...totals].map(([key, m]) => [key, { income: m.income / 100, expenses: m.expenses / 100 }]),
  );
}

function budgetSnapshot(db, userId, { year, month }) {
  const range = monthBounds({ year, month });
  const budget = db.budgets.find(
    (b) => b.userId === userId && b.year === year && b.month === month,
  );
  const spentPaise = sumPaise(
    ownTransactions(db, userId).filter((t) => t.type === 'EXPENSE' && inRange(t, range)),
  );
  const amount = budget ? budget.paise / 100 : null;
  const spent = spentPaise / 100;
  return {
    year,
    month,
    budget: budget ? serializeBudget(budget) : null,
    amount,
    spent,
    ...getBudgetStatus(amount, spent),
  };
}

function budgetAlert(db, userId, transaction) {
  if (transaction.type !== 'EXPENSE') return null;
  const [year, month] = transaction.date.split('-').map(Number);
  const snapshot = budgetSnapshot(db, userId, { year, month });
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

/* ---------------------------------------------------------- transaction list */

function matchesFilters(t, filters) {
  if (filters.type && t.type !== filters.type) return false;
  if (filters.category && t.category !== filters.category) return false;
  if (filters.startDate && t.date < filters.startDate) return false;
  if (filters.endDate && t.date > filters.endDate) return false;
  if (filters.search) {
    const inDescription = (t.description ?? '')
      .toLowerCase()
      .includes(filters.search.toLowerCase());
    if (!inDescription && !categoriesMatching(filters.search).includes(t.category)) return false;
  }
  return true;
}

const SORT_VALUE = {
  date: (t) => t.date,
  amount: (t) => t.paise,
  category: (t) => CATEGORY_ORDER.indexOf(t.category),
  createdAt: (t) => t.createdAt,
  id: (t) => t.id,
};

/** Same ordering as the API: the chosen column, then date, createdAt and id as tie-breakers. */
function compareTransactions({ sortBy, sortOrder }) {
  const keys = [[sortBy, sortOrder]];
  if (sortBy !== 'date') keys.push(['date', 'desc']);
  if (sortBy !== 'createdAt') keys.push(['createdAt', 'desc']);
  keys.push(['id', 'desc']);

  return (a, b) => {
    for (const [field, order] of keys) {
      const x = SORT_VALUE[field](a);
      const y = SORT_VALUE[field](b);
      if (x !== y) return (x < y ? -1 : 1) * (order === 'asc' ? 1 : -1);
    }
    return 0;
  };
}

function findTransaction(db, userId, id) {
  const transaction = db.transactions.find((t) => t.id === id && t.userId === userId);
  if (!transaction) throw AppError.notFound('Transaction not found');
  return transaction;
}

/* ------------------------------------------------------------------ handlers */

const created = (data) => ({ status: 201, data });
const ok = (data) => ({ status: 200, data });
const anchorFrom = (query) =>
  query.year && query.month ? { year: query.year, month: query.month } : currentYearMonth();

const handlers = {
  async register({ db, body }) {
    const { name, email, password } = validate({ body: registerSchema }, { body }).body;
    if (db.users.some((u) => u.email === email)) {
      throw AppError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
    }
    const timestamp = nowIso();
    const user = {
      id: uuidv7(),
      name,
      email,
      passwordHash: await hashPassword(password),
      isDemo: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.users.push(user);
    return created(startSession(db, user));
  },

  async login({ db, body }) {
    const { email, password } = validate({ body: loginSchema }, { body }).body;
    const user = db.users.find((u) => u.email === email);
    if (!user || !(await passwordMatches(password, user.passwordHash))) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }
    return ok(startSession(db, user));
  },

  demo({ db }) {
    purgeSandboxUsers(db);
    const timestamp = nowIso();
    const user = {
      id: uuidv7(),
      name: 'Demo User',
      email: `demo-${crypto.randomUUID()}@demo.financeflow.app`,
      passwordHash: null,
      isDemo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.users.push(user);
    insertSampleData(db, user.id, buildSampleData());
    return created(startSession(db, user));
  },

  me: ({ user }) => ok({ user: publicUser(user) }),

  listTransactions({ db, user, query }) {
    const filters = validate({ query: listQuerySchema }, { query }).query;
    const matching = ownTransactions(db, user.id).filter((t) => matchesFilters(t, filters));
    matching.sort(compareTransactions(filters));

    const income = sumPaise(matching.filter((t) => t.type === 'INCOME')) / 100;
    const expenses = sumPaise(matching.filter((t) => t.type === 'EXPENSE')) / 100;
    const skip = (filters.page - 1) * filters.limit;

    return ok({
      data: matching.slice(skip, skip + filters.limit).map(serializeTransaction),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: matching.length,
        totalPages: Math.max(1, Math.ceil(matching.length / filters.limit)),
      },
      summary: { income, expenses, net: Math.round((income - expenses) * 100) / 100 },
    });
  },

  exportTransactions({ db, user, query }) {
    const filters = validate({ query: exportQuerySchema }, { query }).query;
    const matching = ownTransactions(db, user.id).filter((t) => matchesFilters(t, filters));
    if (matching.length > MAX_EXPORT_ROWS) {
      throw AppError.badRequest(
        `Too many transactions to export (${matching.length}). Narrow the filters to ${MAX_EXPORT_ROWS} or fewer.`,
        'EXPORT_TOO_LARGE',
      );
    }
    matching.sort(compareTransactions(filters));
    const csv = toCsv(
      ['Date', 'Type', 'Category', 'Description', 'Amount'],
      matching.map((t) => [
        t.date,
        t.type === 'INCOME' ? 'Income' : 'Expense',
        CATEGORY_LABELS[t.category],
        t.description ?? '',
        t.paise / 100,
      ]),
    );
    return {
      status: 200,
      data: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="financeflow-transactions-${todayString()}.csv"`,
      },
    };
  },

  getTransaction({ db, user, params }) {
    const { id } = validate({ params: uuidParam }, { params }).params;
    return ok({ transaction: serializeTransaction(findTransaction(db, user.id, id)) });
  },

  createTransaction({ db, user, body }) {
    const data = validate({ body: transactionBodySchema }, { body }).body;
    const timestamp = nowIso();
    const row = {
      id: uuidv7(),
      userId: user.id,
      paise: toPaise(data.amount),
      type: data.type,
      category: data.category,
      description: data.description,
      date: data.date,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.transactions.push(row);
    const transaction = serializeTransaction(row);
    return created({ transaction, budgetAlert: budgetAlert(db, user.id, transaction) });
  },

  updateTransaction({ db, user, params, body }) {
    const validated = validate(
      { params: uuidParam, body: transactionBodySchema },
      { params, body },
    );
    const row = findTransaction(db, user.id, validated.params.id);
    const data = validated.body;
    Object.assign(row, {
      paise: toPaise(data.amount),
      type: data.type,
      category: data.category,
      description: data.description,
      date: data.date,
      updatedAt: nowIso(),
    });
    const transaction = serializeTransaction(row);
    return ok({ transaction, budgetAlert: budgetAlert(db, user.id, transaction) });
  },

  deleteTransaction({ db, user, params }) {
    const { id } = validate({ params: uuidParam }, { params }).params;
    const row = findTransaction(db, user.id, id);
    db.transactions = db.transactions.filter((t) => t !== row);
    return { status: 204, data: '' };
  },

  getBudget({ db, user, query }) {
    const anchor = anchorFrom(validate({ query: monthAnchorQuery }, { query }).query);
    const months = lastMonths(anchor, 6);
    const rows = ownTransactions(db, user.id);
    const totals = monthlyTotals(rows, {
      start: monthBounds(months[0]).start,
      end: monthBounds(anchor).end,
    });

    const history = months.map(({ year, month }) => {
      const budget = db.budgets.find(
        (b) => b.userId === user.id && b.year === year && b.month === month,
      );
      const amount = budget ? budget.paise / 100 : null;
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

    return ok({
      ...budgetSnapshot(db, user.id, anchor),
      label: monthLabel(anchor),
      categoryBreakdown: expensesByCategory(rows, monthBounds(anchor)),
      history,
    });
  },

  createBudget({ db, user, body }) {
    const { year, month, amount } = validate({ body: budgetBodySchema }, { body }).body;
    if (db.budgets.some((b) => b.userId === user.id && b.year === year && b.month === month)) {
      throw AppError.conflict(
        `A budget for ${monthLabel({ year, month })} already exists. Update it instead.`,
        'BUDGET_EXISTS',
      );
    }
    const timestamp = nowIso();
    const budget = {
      id: uuidv7(),
      userId: user.id,
      year,
      month,
      paise: toPaise(amount),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    db.budgets.push(budget);
    return created({ budget: serializeBudget(budget) });
  },

  updateBudget({ db, user, body }) {
    const { year, month, amount } = validate({ body: budgetBodySchema }, { body }).body;
    const budget = db.budgets.find(
      (b) => b.userId === user.id && b.year === year && b.month === month,
    );
    if (!budget) {
      throw AppError.notFound(
        `No budget set for ${monthLabel({ year, month })} yet`,
        'BUDGET_NOT_FOUND',
      );
    }
    Object.assign(budget, { paise: toPaise(amount), updatedAt: nowIso() });
    return ok({ budget: serializeBudget(budget) });
  },

  getDashboard({ db, user, query }) {
    const anchor = anchorFrom(validate({ query: monthAnchorQuery }, { query }).query);
    const months = lastMonths(anchor, 6);
    const thisMonth = monthBounds(anchor);
    const rows = ownTransactions(db, user.id);
    const allTime = sumByType(rows);
    const monthTotals = sumByType(rows, thisMonth);
    const budget = budgetSnapshot(db, user.id, anchor);
    const totalsByMonth = monthlyTotals(rows, {
      start: monthBounds(months[0]).start,
      end: thisMonth.end,
    });
    const recent = [...rows]
      .sort(compareTransactions({ sortBy: 'date', sortOrder: 'desc' }))
      .slice(0, 6);

    return ok({
      period: { ...anchor, label: monthLabel(anchor) },
      summary: {
        totalIncome: allTime.income,
        totalExpenses: allTime.expenses,
        balance: allTime.net,
        transactionCount: allTime.count,
      },
      currentMonth: {
        income: monthTotals.income,
        expenses: monthTotals.expenses,
        net: monthTotals.net,
        transactionCount: monthTotals.count,
      },
      budget: {
        amount: budget.amount,
        spent: budget.spent,
        remaining: budget.remaining,
        percentUsed: budget.percentUsed,
        status: budget.status,
      },
      expenseBreakdown: expensesByCategory(rows, thisMonth),
      monthlyTrend: months.map(({ year, month }) => {
        const totals = totalsByMonth.get(monthKey(year, month)) ?? { income: 0, expenses: 0 };
        return {
          key: monthKey(year, month),
          label: monthName(month).slice(0, 3),
          year,
          month,
          income: totals.income,
          expenses: totals.expenses,
          net: round2(totals.income - totals.expenses),
        };
      }),
      recentTransactions: recent.map(serializeTransaction),
    });
  },

  getAnalytics({ db, user, query }) {
    const validated = validate({ query: analyticsQuerySchema }, { query }).query;
    const anchor = anchorFrom(validated);
    const { months } = validated;
    const series = lastMonths(anchor, months);
    const range = { start: monthBounds(series[0]).start, end: monthBounds(anchor).end };
    const rows = ownTransactions(db, user.id);

    const totalsByMonth = monthlyTotals(rows, range);
    const categoryExpenses = expensesByCategory(rows, range);
    const beforeRange = sumByType(rows, { end: range.start });
    const withinRange = sumByType(rows, range);
    const largest = rows
      .filter((t) => t.type === 'EXPENSE' && inRange(t, range))
      .sort((a, b) => b.paise - a.paise || b.date.localeCompare(a.date))[0];

    let balance = beforeRange.net;
    const monthly = series.map(({ year, month }) => {
      const totals = totalsByMonth.get(monthKey(year, month)) ?? { income: 0, expenses: 0 };
      const net = round2(totals.income - totals.expenses);
      balance = round2(balance + net);
      return {
        key: monthKey(year, month),
        label: `${monthName(month).slice(0, 3)} ${String(year).slice(2)}`,
        year,
        month,
        income: totals.income,
        expenses: totals.expenses,
        net,
        balance,
        savingsRate: percentage(net, totals.income),
      };
    });

    const active = monthly.filter((m) => m.income > 0 || m.expenses > 0);
    const bestMonth = active.reduce((best, m) => (!best || m.net > best.net ? m : best), null);
    const topSpending = active.reduce(
      (top, m) => (!top || m.expenses > top.expenses ? m : top),
      null,
    );

    return ok({
      range: {
        months,
        start: range.start,
        end: range.end,
        label: `${monthLabel(series[0])} – ${monthLabel(anchor)}`,
      },
      totals: {
        income: withinRange.income,
        expenses: withinRange.expenses,
        net: withinRange.net,
        savingsRate: percentage(withinRange.net, withinRange.income),
        openingBalance: beforeRange.net,
        closingBalance: balance,
        transactionCount: withinRange.count,
      },
      averages: {
        monthlyIncome: round2(withinRange.income / months),
        monthlyExpenses: round2(withinRange.expenses / months),
      },
      monthly,
      categoryExpenses,
      insights: {
        topCategory: categoryExpenses[0] ?? null,
        largestExpense: largest ? serializeTransaction(largest) : null,
        bestMonth: bestMonth
          ? { key: bestMonth.key, label: monthLabel(bestMonth), net: bestMonth.net }
          : null,
        topSpendingMonth: topSpending
          ? { key: topSpending.key, label: monthLabel(topSpending), expenses: topSpending.expenses }
          : null,
      },
    });
  },

  health: () => ok({ status: 'ok', uptime: 0, timestamp: nowIso() }),
};

/* -------------------------------------------------------------------- router */

const ROUTES = [
  ['GET', '/health', 'health', { public: true }],
  ['POST', '/auth/register', 'register', { public: true }],
  ['POST', '/auth/login', 'login', { public: true }],
  ['POST', '/auth/demo', 'demo', { public: true }],
  ['GET', '/auth/me', 'me'],
  ['GET', '/transactions', 'listTransactions'],
  ['POST', '/transactions', 'createTransaction'],
  ['GET', '/transactions/export', 'exportTransactions'],
  ['GET', '/transactions/:id', 'getTransaction'],
  ['PUT', '/transactions/:id', 'updateTransaction'],
  ['DELETE', '/transactions/:id', 'deleteTransaction'],
  ['GET', '/budget', 'getBudget'],
  ['POST', '/budget', 'createBudget'],
  ['PUT', '/budget', 'updateBudget'],
  ['GET', '/dashboard', 'getDashboard'],
  ['GET', '/analytics', 'getAnalytics'],
];

function matchRoute(method, path) {
  const segments = path.split('/').filter(Boolean);
  for (const [routeMethod, pattern, handler, options = {}] of ROUTES) {
    if (routeMethod !== method) continue;
    const parts = pattern.split('/').filter(Boolean);
    if (parts.length !== segments.length) continue;
    const params = {};
    const matches = parts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = decodeURIComponent(segments[i]);
        return true;
      }
      return part === segments[i];
    });
    if (matches) return { handler, params, options };
  }
  return null;
}

/** Query values arrive as strings over HTTP; mimic that so the schemas coerce the same way. */
const toQuery = (params = {}) =>
  Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );

function parseBody(data) {
  if (data === undefined || data === null || data === '') return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    throw AppError.badRequest('Request body is not valid JSON', 'INVALID_JSON');
  }
}

// One request at a time, so concurrent calls can't overwrite each other's changes.
let queue = Promise.resolve();
const serialize = (task) => {
  const run = queue.then(task, task);
  queue = run.catch(() => {});
  return run;
};

async function dispatch(config) {
  const method = (config.method ?? 'get').toUpperCase();
  const path = (config.url ?? '').split('?')[0];
  const route = matchRoute(method, path);
  if (!route) {
    throw new AppError(404, `Route ${method} /api${path} not found`, 'ROUTE_NOT_FOUND');
  }

  let db = readDb();
  if (!db) {
    db = await createDb();
    writeDb(db);
  }
  for (const [token, session] of Object.entries(db.sessions)) {
    if (session.expiresAt < Date.now()) delete db.sessions[token];
  }

  const user = route.options.public ? null : authenticate(db, config.headers);
  const result = await handlers[route.handler]({
    db,
    user,
    params: route.params,
    query: toQuery(config.params),
    body: parseBody(config.data),
  });
  writeDb(db);
  return result;
}

const STATUS_TEXT = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const latency = () => (import.meta.env.MODE === 'test' ? 0 : 120 + Math.random() * 180);

function throwIfCancelled(config) {
  if (config.signal?.aborted) throw new CanceledError(undefined, undefined, config);
}

/**
 * Axios adapter: takes the request config and resolves like a real HTTP response
 * (2xx), or rejects with an AxiosError carrying the API's JSON error body.
 */
export async function handleRequest(config) {
  throwIfCancelled(config);
  // A short, slightly variable delay keeps loading states visible, as with a real network.
  await wait(latency());
  throwIfCancelled(config);

  let result;
  try {
    result = await serialize(() => dispatch(config));
  } catch (error) {
    if (!(error instanceof AppError)) console.error('[demo api]', error);
    result =
      error instanceof AppError
        ? {
            status: error.statusCode,
            data: {
              error: {
                code: error.code,
                message: error.message,
                ...(error.details ? { details: error.details } : {}),
              },
            },
          }
        : {
            status: 500,
            data: {
              error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
            },
          };
  }

  const response = {
    data: result.data,
    status: result.status,
    statusText: STATUS_TEXT[result.status] ?? '',
    headers: { 'content-type': 'application/json; charset=utf-8', ...result.headers },
    config,
    request: {},
  };

  if (response.status >= 200 && response.status < 300) return response;
  throw new AxiosError(
    `Request failed with status code ${response.status}`,
    response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    config,
    response.request,
    response,
  );
}

/** For tests: start from an empty browser. */
export function resetDemoDatabase() {
  memoryDb = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable
  }
}
