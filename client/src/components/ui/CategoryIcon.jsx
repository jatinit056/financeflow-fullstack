import { CATEGORIES } from '../../lib/categories.js';

/** Category glyph in a soft chip. Income chips get a faint blue wash, expenses stay neutral. */
export function CategoryIcon({ category, type, size = 'md' }) {
  const Icon = CATEGORIES[category]?.icon ?? CATEGORIES.OTHER.icon;
  const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const tone = type === 'INCOME' ? 'bg-income/10 text-[#1f5fae]' : 'bg-paper text-ink-2';
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${box} ${tone}`}>
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={1.9} />
    </span>
  );
}
