import { percentage, round2 } from './money.js';

/** Spending at or above this share of the budget triggers a warning. */
export const BUDGET_WARNING_THRESHOLD = 80;

/**
 * Pure function: given a budget amount (or null) and the amount spent, describe the budget state.
 *
 * status:
 *   "none"      no budget set for the month
 *   "on_track"  below the warning threshold
 *   "warning"   at or above 80% of the budget
 *   "exceeded"  spent more than the budget
 */
export function getBudgetStatus(budgetAmount, spent) {
  if (budgetAmount === null || budgetAmount === undefined) {
    return { status: 'none', remaining: null, percentUsed: null };
  }

  const remaining = round2(budgetAmount - spent);
  // Decide the status from the exact ratio; the rounded figure is for display only
  // (79.99% must not round up to 80% and trigger a warning).
  const exactPercent = (spent / budgetAmount) * 100;

  let status = 'on_track';
  if (spent > budgetAmount) status = 'exceeded';
  else if (exactPercent >= BUDGET_WARNING_THRESHOLD) status = 'warning';

  return { status, remaining, percentUsed: percentage(spent, budgetAmount) };
}
