import { describe, expect, it } from 'vitest';
import { detectPreset, monthRange, presetRange, shiftMonth } from '../src/lib/dates.js';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatSignedAmount,
  initials,
} from '../src/lib/format.js';
import { CATEGORIES, CATEGORIES_BY_TYPE } from '../src/lib/categories.js';

describe('formatCurrency', () => {
  it('uses Indian digit grouping', () => {
    expect(formatCurrency(165248)).toBe('₹1,65,248');
    expect(formatCurrency(10000000)).toBe('₹1,00,00,000');
  });

  it('shows paise only when there are paise', () => {
    expect(formatCurrency(450.5)).toBe('₹450.50');
    expect(formatCurrency(72000)).toBe('₹72,000');
    expect(formatCurrency(0.1 + 0.2)).toBe('₹0.30');
  });

  it('signs ledger amounts by type with a true minus sign', () => {
    expect(formatSignedAmount(72000, 'INCOME')).toBe('+₹72,000');
    expect(formatSignedAmount(450, 'EXPENSE')).toBe('−₹450');
  });

  it('compacts axis labels in lakh and crore', () => {
    expect(formatCompactCurrency(72000)).toBe('₹72K');
    expect(formatCompactCurrency(150000)).toBe('₹1.5L');
    expect(formatCompactCurrency(15000000)).toBe('₹1.5Cr');
    expect(formatCompactCurrency(900)).toBe('₹900');
  });
});

describe('formatDate', () => {
  it('formats calendar dates without shifting the day', () => {
    expect(formatDate('2026-10-01')).toBe('1 Oct 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
  });
});

describe('initials', () => {
  it('takes the first and last initial', () => {
    expect(initials('Jatin Gohel')).toBe('JG');
    expect(initials('asha')).toBe('A');
    expect(initials('')).toBe('?');
  });
});

describe('date helpers', () => {
  it('shifts months across years', () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('knows month lengths, including leap years', () => {
    expect(monthRange({ year: 2028, month: 2 })).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    });
  });

  it('builds and recognises preset ranges', () => {
    const now = new Date(2026, 9, 26); // 26 Oct 2026, local time
    expect(presetRange('this-month', now)).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-26',
    });
    expect(presetRange('last-month', now)).toEqual({
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    });
    expect(detectPreset('2026-09-01', '2026-09-30', now)).toBe('last-month');
    expect(detectPreset('', '', now)).toBe('all');
    expect(detectPreset('2026-01-05', '2026-02-01', now)).toBe('custom');
  });
});

describe('categories', () => {
  it('has metadata for every category offered for each type', () => {
    for (const keys of Object.values(CATEGORIES_BY_TYPE)) {
      for (const key of keys) expect(CATEGORIES[key]).toBeDefined();
    }
  });
});
