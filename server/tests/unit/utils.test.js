import { describe, expect, it } from 'vitest';
import {
  CATEGORIES,
  CATEGORIES_BY_TYPE,
  CATEGORY_LABELS,
  TRANSACTION_TYPES,
  categoriesMatching,
} from '../../src/constants/categories.js';
import { Category, TransactionType } from '../../src/generated/prisma/enums.ts';
import { getBudgetStatus } from '../../src/utils/budgetStatus.js';
import { escapeCsvValue, toCsv } from '../../src/utils/csv.js';
import { lastMonths, monthBounds, shiftMonth } from '../../src/utils/dates.js';
import { hasAtMostTwoDecimals, percentage, round2, toAmountString } from '../../src/utils/money.js';
import { buildSampleData } from '../../src/utils/sampleData.js';

describe('getBudgetStatus', () => {
  it('is "none" without a budget', () => {
    expect(getBudgetStatus(null, 500)).toEqual({
      status: 'none',
      remaining: null,
      percentUsed: null,
    });
  });

  it.each([
    [0, 'on_track'],
    [7999, 'on_track'],
    [8000, 'warning'],
    [10000, 'warning'], // exactly on budget is not over it
    [10000.01, 'exceeded'],
  ])('spending %d of 10,000 is %s', (spent, status) => {
    expect(getBudgetStatus(10000, spent).status).toBe(status);
  });

  it('computes remaining and percent used', () => {
    expect(getBudgetStatus(40000, 30000)).toEqual({
      status: 'on_track',
      remaining: 10000,
      percentUsed: 75,
    });
  });
});

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(escapeCsvValue('a,b')).toBe('"a,b"');
    expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])('prefixes formula-like text %s', (value) => {
    expect(escapeCsvValue(value)).toBe(`'${value}`);
  });

  it('leaves numbers alone (negative numbers are not formulas)', () => {
    expect(escapeCsvValue(-12.5)).toBe('-12.5');
  });

  it('writes a BOM and CRLF line endings', () => {
    expect(toCsv(['A', 'B'], [[1, 'x']])).toBe('\uFEFFA,B\r\n1,x\r\n');
  });
});

describe('dates', () => {
  it('shifts months across year boundaries', () => {
    expect(shiftMonth({ year: 2025, month: 1 }, -1)).toEqual({ year: 2024, month: 12 });
    expect(shiftMonth({ year: 2025, month: 12 }, 1)).toEqual({ year: 2026, month: 1 });
    expect(shiftMonth({ year: 2025, month: 6 }, -18)).toEqual({ year: 2023, month: 12 });
  });

  it('gives an exclusive end bound for December', () => {
    expect(monthBounds({ year: 2025, month: 12 })).toEqual({
      start: '2025-12-01',
      end: '2026-01-01',
    });
  });

  it('lists the last N months oldest first', () => {
    expect(lastMonths({ year: 2026, month: 2 }, 3)).toEqual([
      { year: 2025, month: 12 },
      { year: 2026, month: 1 },
      { year: 2026, month: 2 },
    ]);
  });
});

describe('money', () => {
  it('detects more than two decimals, despite float quirks', () => {
    expect(hasAtMostTwoDecimals(19.99)).toBe(true);
    expect(hasAtMostTwoDecimals(0.1 + 0.2)).toBe(true);
    expect(hasAtMostTwoDecimals(1.005)).toBe(false);
  });

  it('rounds and formats for DECIMAL columns', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(toAmountString(1499.5)).toBe('1499.50');
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(5, 0)).toBe(0);
  });
});

describe('categories', () => {
  it('match the Prisma enums exactly', () => {
    expect([...CATEGORIES].sort()).toEqual(Object.values(Category).sort());
    expect([...TRANSACTION_TYPES].sort()).toEqual(Object.values(TransactionType).sort());
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(Object.values(Category).sort());
  });

  it('finds categories by label', () => {
    expect(categoriesMatching('dining')).toEqual(['FOOD']);
    expect(categoriesMatching('  ')).toEqual([]);
  });
});

describe('buildSampleData', () => {
  const now = new Date('2026-03-10T08:00:00Z');
  const { transactions, budgets } = buildSampleData({ now });

  it('is deterministic', () => {
    expect(buildSampleData({ now })).toEqual({ transactions, budgets });
  });

  it('never creates future transactions and uses valid categories', () => {
    for (const t of transactions) {
      expect(t.date <= '2026-03-10').toBe(true);
      expect(CATEGORIES_BY_TYPE[t.type]).toContain(t.category);
    }
  });

  it('creates one budget per month', () => {
    expect(budgets.map((b) => `${b.year}-${b.month}`)).toEqual([
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-1',
      '2026-2',
      '2026-3',
    ]);
  });
});
