import { z } from 'zod';
import { hasAtMostTwoDecimals } from '../../utils/money.js';
import { monthAnchorQuery, monthNumber, yearNumber } from '../../validation/common.js';

export const MAX_BUDGET = 100_000_000;

export const budgetQuerySchema = monthAnchorQuery;

export const budgetBodySchema = z.object({
  month: monthNumber,
  year: yearNumber,
  amount: z.coerce
    .number({ error: 'Budget must be a number' })
    .positive({ error: 'Budget must be greater than 0' })
    .max(MAX_BUDGET, { error: 'Budget is too large' })
    .refine(hasAtMostTwoDecimals, { error: 'Budget can have at most 2 decimal places' }),
});
