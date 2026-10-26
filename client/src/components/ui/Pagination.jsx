import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';

/** "Showing 11–20 of 182" with previous/next controls. */
export function Pagination({ page, totalPages, total, limit, onPageChange, disabled = false }) {
  if (total === 0) return null;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-2" aria-live="polite">
        Showing{' '}
        <span className="font-semibold text-ink tabular-nums">
          {first}–{last}
        </span>{' '}
        of <span className="font-semibold text-ink tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <span className="min-w-16 text-center text-sm text-ink-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
