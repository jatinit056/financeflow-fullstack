import { Search, X } from 'lucide-react';
import { ALL_CATEGORIES, CATEGORIES_BY_TYPE, categoryLabel } from '../../lib/categories.js';
import { todayString } from '../../lib/dates.js';
import { Field, Input, Select } from '../ui/Field.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first' },
  { value: 'date-asc', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Highest amount' },
  { value: 'amount-asc', label: 'Lowest amount' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

const DATE_PRESETS = [
  { value: 'all', label: 'All time' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

/**
 * One row of filters above the list. Every control writes to the URL (via the parent),
 * so a filtered view can be bookmarked or shared and survives a page refresh.
 */
export function TransactionFilters({
  searchText,
  onSearchTextChange,
  filters,
  datePreset,
  onChange,
  onDatePresetChange,
  onClear,
  hasActiveFilters,
}) {
  const categories = filters.type ? CATEGORIES_BY_TYPE[filters.type] : ALL_CATEGORIES;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-56 flex-[2_1_16rem]">
          <label htmlFor="transaction-search" className="sr-only">
            Search transactions
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
          />
          <Input
            id="transaction-search"
            type="search"
            placeholder="Search descriptions or categories"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            className="pl-9"
          />
        </div>

        <SegmentedControl
          label="Type"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={(type) => {
            const keepCategory =
              !type || !filters.category || CATEGORIES_BY_TYPE[type].includes(filters.category);
            onChange({ type, category: keepCategory ? filters.category : '' });
          }}
          className="h-11 items-center"
        />

        <div className="min-w-44 flex-1">
          <label htmlFor="category-filter" className="sr-only">
            Category
          </label>
          <Select
            id="category-filter"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((key) => (
              <option key={key} value={key}>
                {categoryLabel(key)}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-40 flex-1">
          <label htmlFor="date-filter" className="sr-only">
            Date range
          </label>
          <Select
            id="date-filter"
            value={datePreset}
            onChange={(event) => onDatePresetChange(event.target.value)}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-40 flex-1">
          <label htmlFor="sort-order" className="sr-only">
            Sort by
          </label>
          <Select
            id="sort-order"
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value === 'date-desc' ? '' : event.target.value })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {(datePreset === 'custom' || hasActiveFilters) && (
        <div className="flex flex-wrap items-end gap-3">
          {datePreset === 'custom' && (
            <>
              <Field label="From" className="w-44">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    max={filters.endDate || todayString()}
                    value={filters.startDate}
                    onChange={(event) => onChange({ startDate: event.target.value })}
                  />
                )}
              </Field>
              <Field label="To" className="w-44">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="date"
                    min={filters.startDate || undefined}
                    max={todayString()}
                    value={filters.endDate}
                    onChange={(event) => onChange({ endDate: event.target.value })}
                  />
                )}
              </Field>
            </>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <X aria-hidden="true" className="size-4" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
