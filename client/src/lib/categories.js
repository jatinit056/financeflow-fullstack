import {
  Briefcase,
  Car,
  Clapperboard,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  Receipt,
  Shapes,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
} from 'lucide-react';

/**
 * Category metadata for the UI. The API validates the same lists
 * (server/src/constants/categories.js), so the two must stay in sync.
 */
export const CATEGORIES = {
  SALARY: { label: 'Salary', icon: Briefcase },
  FREELANCE: { label: 'Freelance', icon: Laptop },
  INVESTMENTS: { label: 'Investments', icon: TrendingUp },
  FOOD: { label: 'Food & Dining', icon: UtensilsCrossed },
  TRANSPORT: { label: 'Transport', icon: Car },
  SHOPPING: { label: 'Shopping', icon: ShoppingBag },
  BILLS: { label: 'Bills & Utilities', icon: Receipt },
  RENT: { label: 'Rent & Housing', icon: House },
  HEALTH: { label: 'Health & Fitness', icon: HeartPulse },
  EDUCATION: { label: 'Education', icon: GraduationCap },
  ENTERTAINMENT: { label: 'Entertainment', icon: Clapperboard },
  OTHER: { label: 'Other', icon: Shapes },
};

export const CATEGORIES_BY_TYPE = {
  EXPENSE: [
    'FOOD',
    'TRANSPORT',
    'SHOPPING',
    'BILLS',
    'RENT',
    'HEALTH',
    'EDUCATION',
    'ENTERTAINMENT',
    'OTHER',
  ],
  INCOME: ['SALARY', 'FREELANCE', 'INVESTMENTS', 'OTHER'],
};

export const DEFAULT_CATEGORY = { EXPENSE: 'FOOD', INCOME: 'SALARY' };

export const ALL_CATEGORIES = Object.keys(CATEGORIES);

export const categoryLabel = (key) => CATEGORIES[key]?.label ?? key;

export const TYPE_LABELS = { INCOME: 'Income', EXPENSE: 'Expense' };
