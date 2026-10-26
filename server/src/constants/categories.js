/**
 * Transaction types and categories. The values mirror the Prisma enums
 * (tests/unit/constants.test.js fails if the two drift apart).
 */
export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'];

export const INCOME_CATEGORIES = ['SALARY', 'FREELANCE', 'INVESTMENTS', 'OTHER'];

export const EXPENSE_CATEGORIES = [
  'FOOD',
  'TRANSPORT',
  'SHOPPING',
  'BILLS',
  'RENT',
  'HEALTH',
  'EDUCATION',
  'ENTERTAINMENT',
  'OTHER',
];

export const CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

export const CATEGORIES_BY_TYPE = {
  INCOME: INCOME_CATEGORIES,
  EXPENSE: EXPENSE_CATEGORIES,
};

export const CATEGORY_LABELS = {
  SALARY: 'Salary',
  FREELANCE: 'Freelance',
  INVESTMENTS: 'Investments',
  FOOD: 'Food & Dining',
  TRANSPORT: 'Transport',
  SHOPPING: 'Shopping',
  BILLS: 'Bills & Utilities',
  RENT: 'Rent & Housing',
  HEALTH: 'Health & Fitness',
  EDUCATION: 'Education',
  ENTERTAINMENT: 'Entertainment',
  OTHER: 'Other',
};

/** Categories whose label matches a free-text search, e.g. "food" -> ["FOOD"]. */
export function categoriesMatching(search) {
  const term = search.trim().toLowerCase();
  if (!term) return [];
  return CATEGORIES.filter(
    (category) =>
      CATEGORY_LABELS[category].toLowerCase().includes(term) ||
      category.toLowerCase().includes(term),
  );
}
