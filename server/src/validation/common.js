import { z } from 'zod';
import { todayString } from '../utils/dates.js';

/** Query strings like "?type=" arrive as "" — treat them as "not provided". */
export const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

export const uuidParam = z.object({
  id: z.uuid({ error: 'Invalid id' }),
});

/** A real calendar date in YYYY-MM-DD format (rejects 2026-02-30). */
export const dateString = z.iso.date({ error: 'Date must be a valid date in YYYY-MM-DD format' });

/**
 * A transaction date: valid, not before 2000, and not in the future.
 * "Future" allows one extra day because the user's local date can be ahead of UTC.
 */
export const transactionDate = dateString
  .refine((value) => value >= '2000-01-01', { error: 'Date must be on or after 2000-01-01' })
  .refine(
    (value) => {
      const tomorrowUtc = todayString(new Date(Date.now() + 24 * 60 * 60 * 1000));
      return value <= tomorrowUtc;
    },
    { error: 'Date cannot be in the future' },
  );

export const monthNumber = z.coerce
  .number({ error: 'Month must be a number' })
  .int({ error: 'Month must be a whole number' })
  .min(1, { error: 'Month must be between 1 and 12' })
  .max(12, { error: 'Month must be between 1 and 12' });

export const yearNumber = z.coerce
  .number({ error: 'Year must be a number' })
  .int({ error: 'Year must be a whole number' })
  .min(2000, { error: 'Year must be between 2000 and 2100' })
  .max(2100, { error: 'Year must be between 2000 and 2100' });

/** Optional ?year=&month= pair used to anchor "current month" to the user's time zone. */
export const monthAnchorQuery = z
  .object({
    year: emptyToUndefined(yearNumber.optional()),
    month: emptyToUndefined(monthNumber.optional()),
  })
  .refine((q) => (q.year === undefined) === (q.month === undefined), {
    error: 'Provide both year and month, or neither',
    path: ['month'],
  });
