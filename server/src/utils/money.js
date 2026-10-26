/**
 * Money helpers.
 *
 * Amounts live in Postgres as DECIMAL(12, 2), so storage and SUM() are exact. Prisma hands us
 * Decimal objects; we convert to plain numbers only at the edge, for JSON responses.
 */

/** Prisma Decimal | number | string | null -> number (null/undefined -> 0). */
export const toNumber = (value) => (value === null || value === undefined ? 0 : Number(value));

/** Round to 2 decimal places, avoiding float artifacts like 0.1 + 0.2. */
export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** True when a number has at most two digits after the decimal point. */
export const hasAtMostTwoDecimals = (value) => {
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
};

/** Number -> exact string for Prisma Decimal columns, e.g. 1499.5 -> "1499.50". */
export const toAmountString = (value) => round2(value).toFixed(2);

/** Share of `part` in `total` as a percentage with one decimal (0 when total is 0). */
export const percentage = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);
