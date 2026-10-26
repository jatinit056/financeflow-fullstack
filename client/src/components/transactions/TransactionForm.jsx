import { ArrowDownLeft, ArrowUpRight, CircleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import { CATEGORIES, CATEGORIES_BY_TYPE, DEFAULT_CATEGORY } from '../../lib/categories.js';
import { todayString } from '../../lib/dates.js';
import { getErrorMessage, getFieldErrors } from '../../lib/errors.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';
import { SegmentedControl } from '../ui/SegmentedControl.jsx';

const TYPE_OPTIONS = [
  { value: 'EXPENSE', label: 'Expense', icon: ArrowUpRight, className: 'flex-1' },
  { value: 'INCOME', label: 'Income', icon: ArrowDownLeft, className: 'flex-1' },
];

const MAX_AMOUNT = 1_000_000_000;

function validate(values) {
  const errors = {};
  const raw = values.amount.replace(/,/g, '').trim();

  if (!raw) errors.amount = 'Enter an amount';
  else if (!/^\d+(\.\d{1,2})?$/.test(raw))
    errors.amount = 'Enter a number with up to 2 decimal places';
  else if (Number(raw) <= 0) errors.amount = 'Amount must be greater than 0';
  else if (Number(raw) > MAX_AMOUNT) errors.amount = 'Amount is too large';

  if (!values.date) errors.date = 'Choose a date';
  else if (values.date > todayString()) errors.date = 'Date cannot be in the future';

  if (values.description.trim().length > 255) {
    errors.description = 'Keep the description under 255 characters';
  }
  return errors;
}

/** Add/edit form. Validates on the client for instant feedback; the API validates again. */
export function TransactionForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [values, setValues] = useState(() => ({
    type: initial?.type ?? 'EXPENSE',
    amount: initial ? String(initial.amount) : '',
    category: initial?.category ?? DEFAULT_CATEGORY.EXPENSE,
    date: initial?.date ?? todayString(),
    description: initial?.description ?? '',
  }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);

  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const changeType = (type) => {
    setValues((current) => ({
      ...current,
      type,
      category: CATEGORIES_BY_TYPE[type].includes(current.category)
        ? current.category
        : DEFAULT_CATEGORY[type],
    }));
    setErrors((current) => ({ ...current, category: undefined }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit({
        type: values.type,
        category: values.category,
        amount: Number(values.amount.replace(/,/g, '')),
        date: values.date,
        description: values.description.trim() || null,
      });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-critical/10 px-3 py-2.5 text-sm text-negative"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      )}

      <SegmentedControl
        label="Transaction type"
        options={TYPE_OPTIONS}
        value={values.type}
        onChange={changeType}
        className="flex w-full"
      />

      <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr]">
        <Field label="Amount" error={errors.amount}>
          {(fieldProps) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-lg font-semibold text-ink-3">
                ₹
              </span>
              <Input
                {...fieldProps}
                invalid={Boolean(errors.amount)}
                inputMode="decimal"
                autoComplete="off"
                data-autofocus
                placeholder="0"
                value={values.amount}
                onChange={(event) => setField('amount', event.target.value)}
                className="figure h-12 pl-8 text-xl font-semibold"
              />
            </div>
          )}
        </Field>

        <Field label="Date" error={errors.date}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              invalid={Boolean(errors.date)}
              type="date"
              max={todayString()}
              value={values.date}
              onChange={(event) => setField('date', event.target.value)}
              className="h-12"
            />
          )}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Category</legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES_BY_TYPE[values.type].map((key) => {
            const { label, icon: Icon } = CATEGORIES[key];
            return (
              <label
                key={key}
                className="flex min-h-[68px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-rule-strong px-2 py-2.5 text-center text-[13px] leading-tight font-medium text-ink-2 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600 hover:border-ink-3"
              >
                <input
                  type="radio"
                  name="category"
                  value={key}
                  checked={values.category === key}
                  onChange={() => setField('category', key)}
                  className="sr-only"
                />
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.9} />
                {label}
              </label>
            );
          })}
        </div>
        {errors.category && <p className="mt-1.5 text-sm text-negative">{errors.category}</p>}
      </fieldset>

      <Field label="Description" optional error={errors.description}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            invalid={Boolean(errors.description)}
            maxLength={255}
            placeholder={
              values.type === 'INCOME' ? 'e.g. October salary' : 'e.g. Groceries at DMart'
            }
            value={values.description}
            onChange={(event) => setField('description', event.target.value)}
          />
        )}
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
