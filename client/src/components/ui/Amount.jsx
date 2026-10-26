import { formatSignedAmount } from '../../lib/format.js';

/** Ledger amount: "+₹72,000" in green for income, "−₹450" in ink for expenses. */
export function Amount({ value, type, className = '' }) {
  return (
    <span
      className={`figure font-semibold tabular-nums whitespace-nowrap ${type === 'INCOME' ? 'text-positive' : 'text-ink'} ${className}`}
    >
      <span className="sr-only">{type === 'INCOME' ? 'Income ' : 'Expense '}</span>
      {formatSignedAmount(value, type)}
    </span>
  );
}
