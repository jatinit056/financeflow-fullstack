import { Pencil, Trash2 } from 'lucide-react';
import { categoryLabel } from '../../lib/categories.js';
import { formatDate, formatShortDate } from '../../lib/format.js';
import { Amount } from '../ui/Amount.jsx';
import { CategoryIcon } from '../ui/CategoryIcon.jsx';
import { Skeleton } from '../ui/Skeleton.jsx';

function RowActions({ transaction, onEdit, onDelete }) {
  const name = transaction.description || categoryLabel(transaction.category);
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEdit(transaction)}
        className="rounded-lg p-2 text-ink-3 hover:bg-paper hover:text-ink"
        aria-label={`Edit ${name}`}
      >
        <Pencil aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(transaction)}
        className="rounded-lg p-2 text-ink-3 hover:bg-critical/10 hover:text-critical"
        aria-label={`Delete ${name}`}
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/**
 * Ledger of transactions: a table from the md breakpoint up, a stacked list on phones.
 * Amounts are right-aligned with tabular figures so the digits line up like a statement.
 */
export function TransactionList({ transactions, onEdit, onDelete, busy = false }) {
  const withActions = Boolean(onEdit && onDelete);

  return (
    <div aria-busy={busy || undefined} className={`transition-opacity ${busy ? 'opacity-55' : ''}`}>
      {/* Phones */}
      <ul className="divide-y divide-rule md:hidden">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-3">
            <CategoryIcon category={t.category} type={t.type} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">
                {t.description || categoryLabel(t.category)}
              </p>
              <p className="truncate text-sm text-ink-2">
                {categoryLabel(t.category)}, {formatShortDate(t.date)}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <Amount value={t.amount} type={t.type} />
              {withActions && <RowActions transaction={t} onEdit={onEdit} onDelete={onDelete} />}
            </div>
          </li>
        ))}
      </ul>

      {/* Tablets and up */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-rule text-[13px] text-ink-3">
            <th scope="col" className="py-2.5 pr-4 font-medium">
              Date
            </th>
            <th scope="col" className="w-full py-2.5 pr-4 font-medium">
              Description
            </th>
            <th scope="col" className="hidden py-2.5 pr-4 font-medium lg:table-cell">
              Category
            </th>
            <th scope="col" className="py-2.5 pr-2 text-right font-medium">
              Amount
            </th>
            {withActions && (
              <th scope="col" className="w-24 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {transactions.map((t) => (
            <tr key={t.id} className="group hover:bg-paper/70">
              <td className="py-3 pr-4 whitespace-nowrap text-ink-2 tabular-nums">
                {formatDate(t.date)}
              </td>
              <td className="max-w-0 py-3 pr-4">
                <div className="flex items-center gap-3">
                  <CategoryIcon category={t.category} type={t.type} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {t.description || categoryLabel(t.category)}
                    </p>
                    <p className="truncate text-[13px] text-ink-3 lg:hidden">
                      {categoryLabel(t.category)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="hidden py-3 pr-4 whitespace-nowrap text-ink-2 lg:table-cell">
                {categoryLabel(t.category)}
              </td>
              <td className="py-3 pr-2 text-right">
                <Amount value={t.amount} type={t.type} />
              </td>
              {withActions && (
                <td className="py-1.5">
                  <RowActions transaction={t} onEdit={onEdit} onDelete={onDelete} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TransactionListSkeleton({ rows = 6 }) {
  return (
    <div aria-busy="true" className="divide-y divide-rule">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
      <span className="sr-only">Loading transactions…</span>
    </div>
  );
}
