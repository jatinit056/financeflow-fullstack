/** Date helpers that work in the user's *local* calendar. */

const pad = (n) => String(n).padStart(2, '0');

/** Today's local date as "YYYY-MM-DD". */
export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The user's current month: { year, month }. */
export function currentMonth(now = new Date()) {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function shiftMonth({ year, month }, delta) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export const daysInMonth = ({ year, month }) => new Date(year, month, 0).getDate();

export const isSameMonth = (a, b) => a.year === b.year && a.month === b.month;

/** Compare months: negative if a is before b. */
export const compareMonths = (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month);

/** First and last day of a month as "YYYY-MM-DD". */
export function monthRange({ year, month }) {
  return {
    start: `${year}-${pad(month)}-01`,
    end: `${year}-${pad(month)}-${pad(daysInMonth({ year, month }))}`,
  };
}

/** Preset date ranges for the transaction filters. */
export function presetRange(preset, now = new Date()) {
  const today = todayString(now);
  const thisMonth = currentMonth(now);

  switch (preset) {
    case 'this-month':
      return { startDate: monthRange(thisMonth).start, endDate: today };
    case 'last-month': {
      const last = shiftMonth(thisMonth, -1);
      return { startDate: monthRange(last).start, endDate: monthRange(last).end };
    }
    case 'last-3-months':
      return { startDate: monthRange(shiftMonth(thisMonth, -2)).start, endDate: today };
    case 'this-year':
      return { startDate: `${thisMonth.year}-01-01`, endDate: today };
    default:
      return { startDate: '', endDate: '' };
  }
}

/** Which preset (if any) a start/end pair corresponds to. */
export function detectPreset(startDate, endDate, now = new Date()) {
  if (!startDate && !endDate) return 'all';
  for (const preset of ['this-month', 'last-month', 'last-3-months', 'this-year']) {
    const range = presetRange(preset, now);
    if (range.startDate === startDate && range.endDate === endDate) return preset;
  }
  return 'custom';
}
