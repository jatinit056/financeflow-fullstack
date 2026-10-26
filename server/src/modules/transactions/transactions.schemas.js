import { z } from 'zod';
import {
  CATEGORIES,
  CATEGORIES_BY_TYPE,
  CATEGORY_LABELS,
  TRANSACTION_TYPES,
} from '../../constants/categories.js';
import { hasAtMostTwoDecimals } from '../../utils/money.js';
import { dateString, emptyToUndefined, transactionDate } from '../../validation/common.js';

export const MAX_AMOUNT = 1_000_000_000; // ₹100 crore — far above any personal transaction

const amount = z.coerce
  .number({ error: 'Amount must be a number' })
  .positive({ error: 'Amount must be greater than 0' })
  .max(MAX_AMOUNT, { error: 'Amount is too large' })
  .refine(hasAtMostTwoDecimals, { error: 'Amount can have at most 2 decimal places' });

const type = z.enum(TRANSACTION_TYPES, { error: 'Type must be INCOME or EXPENSE' });
const category = z.enum(CATEGORIES, { error: 'Choose a valid category' });

/** Used for both create (POST) and full update (PUT). */
export const transactionBodySchema = z
  .object({
    amount,
    type,
    category,
    description: z
      .string({ error: 'Description must be text' })
      .trim()
      .max(255, { error: 'Description must be at most 255 characters' })
      .nullish()
      .transform((value) => value || null),
    date: transactionDate,
  })
  .superRefine((data, ctx) => {
    // Runs even when other fields failed, so only check once type and category are both valid.
    const allowed = CATEGORIES_BY_TYPE[data.type];
    if (allowed && CATEGORY_LABELS[data.category] && !allowed.includes(data.category)) {
      ctx.addIssue({
        code: 'custom',
        path: ['category'],
        message: `${CATEGORY_LABELS[data.category]} is not a valid ${data.type.toLowerCase()} category`,
      });
    }
  });

const filterFields = {
  search: emptyToUndefined(z.string().trim().max(100, { error: 'Search is too long' }).optional()),
  type: emptyToUndefined(type.optional()),
  category: emptyToUndefined(category.optional()),
  startDate: emptyToUndefined(dateString.optional()),
  endDate: emptyToUndefined(dateString.optional()),
  sortBy: emptyToUndefined(
    z
      .enum(['date', 'amount', 'category', 'createdAt'], { error: 'Invalid sort field' })
      .default('date'),
  ),
  sortOrder: emptyToUndefined(
    z.enum(['asc', 'desc'], { error: 'Sort order must be asc or desc' }).default('desc'),
  ),
};

const validDateRange = (query) =>
  !query.startDate || !query.endDate || query.startDate <= query.endDate;
const dateRangeIssue = { error: 'End date must be on or after the start date', path: ['endDate'] };

export const listQuerySchema = z
  .object({
    ...filterFields,
    page: emptyToUndefined(
      z.coerce.number().int().min(1, { error: 'Page must be 1 or more' }).default(1),
    ),
    limit: emptyToUndefined(
      z.coerce
        .number()
        .int()
        .min(1, { error: 'Limit must be between 1 and 100' })
        .max(100, { error: 'Limit must be between 1 and 100' })
        .default(10),
    ),
  })
  .refine(validDateRange, dateRangeIssue);

export const exportQuerySchema = z.object(filterFields).refine(validDateRange, dateRangeIssue);
