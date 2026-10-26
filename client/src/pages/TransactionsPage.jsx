import { Download, ReceiptText, SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { transactionsApi } from '../api/endpoints.js';
import { DeleteTransactionDialog } from '../components/transactions/DeleteTransactionDialog.jsx';
import { TransactionFilters } from '../components/transactions/TransactionFilters.jsx';
import {
  TransactionList,
  TransactionListSkeleton,
} from '../components/transactions/TransactionList.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { Select } from '../components/ui/Field.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { Panel } from '../components/ui/Panel.jsx';
import { useComposer } from '../composer/useComposer.js';
import { useApi } from '../hooks/useApi.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { detectPreset, presetRange } from '../lib/dates.js';
import { getErrorMessage, normaliseBlobError } from '../lib/errors.js';
import { formatCurrency } from '../lib/format.js';
import { useToast } from '../toast/useToast.js';

const PAGE_SIZES = [10, 20, 50];
const FILTER_KEYS = ['search', 'type', 'category', 'startDate', 'endDate'];

/** Read filters from the URL (?type=EXPENSE&page=2...) with safe defaults. */
function readFilters(params) {
  const limit = Number(params.get('limit'));
  return {
    search: params.get('search') ?? '',
    type: params.get('type') ?? '',
    category: params.get('category') ?? '',
    startDate: params.get('startDate') ?? '',
    endDate: params.get('endDate') ?? '',
    sort: params.get('sort') ?? 'date-desc',
    page: Math.max(1, Number(params.get('page')) || 1),
    limit: PAGE_SIZES.includes(limit) ? limit : 10,
  };
}

function toApiParams(filters, { paginate = true } = {}) {
  const [sortBy, sortOrder] = filters.sort.split('-');
  return {
    search: filters.search,
    type: filters.type,
    category: filters.category,
    startDate: filters.startDate,
    endDate: filters.endDate,
    sortBy,
    sortOrder,
    ...(paginate && { page: filters.page, limit: filters.limit }),
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
  useDocumentTitle('Transactions');
  const toast = useToast();
  const { dataVersion, openCreate, openEdit, notifyChange } = useComposer();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchText.trim(), 350);
  const [toDelete, setToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  /** Merge changes into the URL. Any filter change sends the user back to page 1. */
  function updateParams(changes, { resetPage = true } = {}) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === '' || value === null || value === undefined) next.delete(key);
          else next.set(key, String(value));
        }
        if (resetPage && !('page' in changes)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  }

  // Push the debounced search text into the URL.
  useEffect(() => {
    if (debouncedSearch !== filters.search) updateParams({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debouncedSearch]);

  const apiParams = toApiParams(filters);
  const { data, error, loading, initialLoading, reload } = useApi(
    (signal) => transactionsApi.list(apiParams, signal),
    [apiParams, dataVersion],
  );

  // After deleting the last row of the last page, step back to a page that exists.
  const totalPages = data?.pagination.totalPages;
  useEffect(() => {
    if (totalPages && filters.page > totalPages)
      updateParams({ page: totalPages }, { resetPage: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the page count changes
  }, [totalPages, filters.page]);

  const datePreset = detectPreset(filters.startDate, filters.endDate);
  const hasActiveFilters = FILTER_KEYS.some((key) => filters[key]);

  function handleDatePreset(preset) {
    if (preset === 'custom') {
      // Keep the current range so the user can adjust it, or start from this month.
      const range = filters.startDate || filters.endDate ? filters : presetRange('this-month');
      updateParams({ startDate: range.startDate, endDate: range.endDate });
      return;
    }
    updateParams(presetRange(preset));
  }

  function clearFilters() {
    setSearchText('');
    updateParams({ search: '', type: '', category: '', startDate: '', endDate: '' });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await transactionsApi.exportCsv(toApiParams(filters, { paginate: false }));
      const disposition = response.headers['content-disposition'] ?? '';
      const filename =
        /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'financeflow-transactions.csv';
      downloadBlob(response.data, filename);
      toast.success(
        `Exported ${data?.pagination.total ?? ''} transaction${data?.pagination.total === 1 ? '' : 's'} to CSV.`,
      );
    } catch (err) {
      toast.error(getErrorMessage(await normaliseBlobError(err)), "Couldn't export transactions");
    } finally {
      setExporting(false);
    }
  }

  const total = data?.pagination.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">Every rupee in and out, searchable and sortable.</p>
        <Button variant="secondary" onClick={handleExport} loading={exporting} disabled={!total}>
          <Download aria-hidden="true" className="size-4" />
          Export CSV
        </Button>
      </div>

      <TransactionFilters
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filters={filters}
        datePreset={datePreset}
        onChange={(changes) => updateParams(changes)}
        onDatePresetChange={handleDatePreset}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <Panel bodyClassName="pt-2 sm:pt-3">
        {initialLoading && <TransactionListSkeleton />}

        {error && !data && (
          <ErrorState error={error} onRetry={reload} title="Couldn't load transactions" />
        )}

        {data && total === 0 && !hasActiveFilters && (
          <EmptyState
            icon={ReceiptText}
            title="No transactions yet"
            description="Add your income and expenses to start tracking where your money goes."
            action={<Button onClick={openCreate}>Add your first transaction</Button>}
          />
        )}

        {data && total === 0 && hasActiveFilters && (
          <EmptyState
            icon={SearchX}
            title="No transactions match these filters"
            description="Try a different search, category or date range."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        )}

        {data && total > 0 && (
          <>
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-rule pb-3 text-sm"
              aria-live="polite"
            >
              <p className="font-semibold text-ink">
                {total} transaction{total === 1 ? '' : 's'}
              </p>
              <p className="text-ink-2">
                In{' '}
                <span className="figure font-semibold text-positive tabular-nums">
                  {formatCurrency(data.summary.income)}
                </span>
              </p>
              <p className="text-ink-2">
                Out{' '}
                <span className="figure font-semibold text-ink tabular-nums">
                  {formatCurrency(data.summary.expenses)}
                </span>
              </p>
              <p className="text-ink-2">
                Net{' '}
                <span
                  className={`figure font-semibold tabular-nums ${data.summary.net < 0 ? 'text-negative' : 'text-ink'}`}
                >
                  {formatCurrency(data.summary.net)}
                </span>
              </p>
            </div>

            <TransactionList
              transactions={data.data}
              onEdit={openEdit}
              onDelete={setToDelete}
              busy={loading}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
              <Pagination
                page={data.pagination.page}
                totalPages={data.pagination.totalPages}
                total={total}
                limit={data.pagination.limit}
                onPageChange={(page) => updateParams({ page }, { resetPage: false })}
                disabled={loading}
              />
              <div className="flex items-center gap-2 text-sm text-ink-2">
                <label htmlFor="page-size" className="whitespace-nowrap">
                  Rows per page
                </label>
                <Select
                  id="page-size"
                  value={filters.limit}
                  onChange={(event) => updateParams({ limit: event.target.value })}
                  className="h-9 w-20"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </>
        )}
      </Panel>

      <DeleteTransactionDialog
        transaction={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={notifyChange}
      />
    </div>
  );
}
