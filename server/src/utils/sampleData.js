import {
  currentYearMonth,
  daysInMonth,
  formatDateString,
  lastMonths,
  todayString,
} from './dates.js';

/**
 * Generates realistic sample finances (salary, rent, bills, food, travel...) for the last few
 * months. Used by the database seed script and by one-click demo sessions.
 * A seeded PRNG keeps the output deterministic, which makes demos and screenshots repeatable.
 */

function createRandom(seed) {
  // mulberry32 — tiny, fast, good enough for sample data
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FREELANCE = [
  'Landing page for a café',
  'Dashboard bug fixes for a client',
  'Portfolio website project',
  'Payment API integration',
];
const GROCERIES = [
  'BigBasket groceries',
  'DMart groceries',
  'Blinkit grocery order',
  'Vegetables and fruits',
];
const FOOD_DELIVERY = ['Swiggy order', 'Zomato order', 'Lunch at office canteen', 'Chai & snacks'];
const DINING = ['Dinner with friends', 'Weekend brunch', 'Birthday dinner'];
const TRANSPORT = [
  ['Uber ride', 180, 650],
  ['Ola auto', 80, 260],
  ['Rapido bike taxi', 60, 180],
  ['Metro card recharge', 500, 500],
  ['Petrol', 800, 2200],
];
const SHOPPING = [
  'Wireless earbuds from Amazon',
  'Shirts from Myntra',
  'Kitchen essentials from Flipkart',
  'Running shoes from Decathlon',
  'Desk lamp from IKEA',
];
const OUTINGS = [
  'Movie tickets at PVR',
  'Concert tickets',
  'Bowling with friends',
  'Spotify Premium',
];
const HEALTH = ['Apollo Pharmacy', 'Doctor consultation', 'Vitamins and supplements'];
const EDUCATION = ['Udemy system design course', 'Books from Amazon', 'Coursera certificate'];
const OTHER = ['Gift for a friend', 'Haircut', 'Donation', 'Laundry'];

export function buildSampleData({ now = new Date(), months = 6, seed = 2026 } = {}) {
  const random = createRandom(seed);
  const int = (min, max) => Math.floor(min + random() * (max - min + 1));
  const amount = (min, max, step = 10) => Math.round((min + random() * (max - min)) / step) * step;
  const pick = (items) => items[Math.floor(random() * items.length)];
  const chance = (probability) => random() < probability;

  const today = todayString(now);
  const current = currentYearMonth(now);
  const transactions = [];
  const budgets = [];

  const period = lastMonths(current, months);

  for (const [index, { year, month }] of period.entries()) {
    const lastDay = daysInMonth(year, month);
    const monthTransactions = [];

    const add = (day, type, category, value, description) => {
      const date = formatDateString(year, month, Math.min(Math.max(day, 1), lastDay));
      if (date > today) return; // never create future-dated transactions
      monthTransactions.push({ type, category, amount: value.toFixed(2), description, date });
    };
    const anyDay = () => int(1, lastDay);

    // Income
    add(1, 'INCOME', 'SALARY', 72000, 'Salary from Acme Technologies');
    if (chance(0.65))
      add(int(8, 24), 'INCOME', 'FREELANCE', amount(6000, 18000, 500), pick(FREELANCE));
    if (month % 3 === 0)
      add(int(10, 20), 'INCOME', 'INVESTMENTS', amount(900, 2600), 'Mutual fund dividend');

    // Fixed monthly expenses
    add(2, 'EXPENSE', 'RENT', 16000, 'House rent');
    add(3, 'EXPENSE', 'ENTERTAINMENT', 649, 'Netflix subscription');
    add(4, 'EXPENSE', 'HEALTH', 1500, 'Gym membership');
    add(int(4, 7), 'EXPENSE', 'BILLS', amount(900, 2400), 'Electricity bill');
    add(6, 'EXPENSE', 'BILLS', 799, 'JioFiber broadband');
    add(9, 'EXPENSE', 'BILLS', 349, 'Mobile recharge');

    // Variable expenses
    for (let i = int(3, 4); i > 0; i--)
      add(anyDay(), 'EXPENSE', 'FOOD', amount(1100, 2800), pick(GROCERIES));
    for (let i = int(5, 8); i > 0; i--)
      add(anyDay(), 'EXPENSE', 'FOOD', amount(240, 780), pick(FOOD_DELIVERY));
    for (let i = int(1, 2); i > 0; i--)
      add(anyDay(), 'EXPENSE', 'FOOD', amount(900, 2400), pick(DINING));
    for (let i = int(6, 10); i > 0; i--) {
      const [description, min, max] = pick(TRANSPORT);
      add(anyDay(), 'EXPENSE', 'TRANSPORT', amount(min, max), description);
    }
    for (let i = int(0, 2); i > 0; i--)
      add(anyDay(), 'EXPENSE', 'SHOPPING', amount(500, 4000), pick(SHOPPING));
    if (chance(0.7)) add(anyDay(), 'EXPENSE', 'ENTERTAINMENT', amount(400, 1200), pick(OUTINGS));
    if (chance(0.5)) add(anyDay(), 'EXPENSE', 'HEALTH', amount(250, 1400), pick(HEALTH));
    if (chance(0.4)) add(anyDay(), 'EXPENSE', 'EDUCATION', amount(449, 1800), pick(EDUCATION));
    if (chance(0.4)) add(anyDay(), 'EXPENSE', 'OTHER', amount(300, 2000), pick(OTHER));

    // A couple of one-off big expenses make the history more realistic (and blow one budget).
    const monthsAgo = period.length - 1 - index;
    if (monthsAgo === 3) add(18, 'EXPENSE', 'SHOPPING', 24990, 'Washing machine from Croma');
    if (monthsAgo === 1) add(21, 'EXPENSE', 'ENTERTAINMENT', 12400, 'Weekend trip to Goa');

    transactions.push(...monthTransactions);

    // Budgets: a fixed ₹55,000 a month, except the current month, which is sized so the demo
    // shows the "approaching your budget" warning (~86% used).
    const spent = monthTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const budgetAmount =
      monthsAgo === 0 ? Math.max(20000, Math.ceil(spent / 0.86 / 1000) * 1000) : 55000;
    budgets.push({ year, month, amount: budgetAmount.toFixed(2) });
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  return { transactions, budgets };
}
