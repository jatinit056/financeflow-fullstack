import { z } from 'zod';
import { emptyToUndefined, monthAnchorQuery } from '../../validation/common.js';

export const ANALYTICS_PERIODS = [3, 6, 12];

export const analyticsQuerySchema = monthAnchorQuery.and(
  z.object({
    months: emptyToUndefined(
      z.coerce
        .number({ error: 'Months must be a number' })
        .int({ error: 'Months must be a whole number' })
        .refine((value) => ANALYTICS_PERIODS.includes(value), {
          error: `Months must be one of ${ANALYTICS_PERIODS.join(', ')}`,
        })
        .default(6),
    ),
  }),
);
