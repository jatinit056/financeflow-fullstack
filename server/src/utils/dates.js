/**
 * Date helpers.
 *
 * Transactions store a calendar date (Postgres DATE), not a moment in time. The API always
 * exchanges dates as "YYYY-MM-DD" strings and stores them as UTC midnight, so a transaction
 * dated 2026-10-01 is the same day for every user regardless of their time zone.
 */

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-05" -> Date(2026-10-05T00:00:00.000Z) */
export const toDbDate = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

/** Date -> "2026-10-05" (UTC calendar date) */
export const toDateString = (date) => date.toISOString().slice(0, 10);

export const formatDateString = (year, month, day) => `${year}-${pad(month)}-${pad(day)}`;

export const monthKey = (year, month) => `${year}-${pad(month)}`;

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** Current calendar month in UTC. */
export function currentYearMonth(now = new Date()) {
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

/** Today's date as "YYYY-MM-DD" in UTC. */
export const todayString = (now = new Date()) => toDateString(now);

/** Move a {year, month} pair by `delta` months (negative = back in time). */
export function shiftMonth({ year, month }, delta) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** Inclusive start and exclusive end of a month, as DATE strings. */
export function monthBounds({ year, month }) {
  const next = shiftMonth({ year, month }, 1);
  return {
    start: formatDateString(year, month, 1),
    end: formatDateString(next.year, next.month, 1),
  };
}

/** The `count` months ending at (and including) `end`, oldest first. */
export function lastMonths(end, count) {
  return Array.from({ length: count }, (_, i) => shiftMonth(end, i - (count - 1)));
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const monthName = (month) => MONTH_NAMES[month - 1];

export const monthLabel = ({ year, month }) => `${monthName(month)} ${year}`;
