/**
 * Formatting helpers. Amounts use Indian digit grouping (₹1,65,248) and dates are
 * calendar dates ("YYYY-MM-DD") formatted in UTC so they never shift by a day.
 */

const LOCALE = 'en-IN';

const currencyWhole = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const currencyCents = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const isWhole = (value) => Math.abs(value - Math.round(value)) < 0.005;

/** 165248 -> "₹1,65,248"; 450.5 -> "₹450.50". */
export function formatCurrency(value) {
  const amount = Number(value) || 0;
  return (isWhole(amount) ? currencyWhole : currencyCents).format(amount);
}

/** Signed amount for ledgers: "+₹72,000" / "−₹450.50" (true minus sign). */
export function formatSignedAmount(value, type) {
  const sign = type === 'INCOME' ? '+' : '−';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

/** Axis ticks: 72000 -> "₹72K", 150000 -> "₹1.5L", 15000000 -> "₹1.5Cr". */
export function formatCompactCurrency(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) < 1000) return formatCurrency(amount);
  return `${amount < 0 ? '-' : ''}₹${compactNumber.format(Math.abs(amount))}`;
}

export function formatPercent(value, { decimals = 0 } = {}) {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(decimals)}%`;
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const toUtcDate = (dateString) => new Date(`${dateString}T00:00:00Z`);

/** "2026-10-26" -> "26 Oct 2026" */
export const formatDate = (dateString) => dateFormatter.format(toUtcDate(dateString));

/** "2026-10-26" -> "26 Oct" */
export const formatShortDate = (dateString) => shortDateFormatter.format(toUtcDate(dateString));

const MONTHS = [
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

export const monthName = (month) => MONTHS[month - 1];

/** {year: 2026, month: 10} -> "October 2026" */
export const formatMonth = ({ year, month }) => `${monthName(month)} ${year}`;

/** Two-letter initials for avatars: "Jatin Gohel" -> "JG". */
export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}
