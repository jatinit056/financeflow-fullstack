import { useState } from 'react';
import { budgetApi } from '../../api/endpoints.js';
import { getErrorMessage, getFieldErrors } from '../../lib/errors.js';
import { formatMonth } from '../../lib/format.js';
import { useToast } from '../../toast/useToast.js';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Field.jsx';

/** Set (POST) or change (PUT) the budget for one month. */
export function BudgetForm({ period, existing, onSaved, onCancel }) {
  const toast = useToast();
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const value = Number(amount.replace(/,/g, ''));
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError('Enter a budget greater than 0');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const body = { year: period.year, month: period.month, amount: value };
      await (existing ? budgetApi.update(body) : budgetApi.create(body));
      toast.success(`Budget for ${formatMonth(period)} saved.`);
      onSaved();
    } catch (err) {
      setError(getFieldErrors(err).amount ?? getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-wrap items-end gap-3">
      <Field
        label={`Monthly budget for ${formatMonth(period)}`}
        error={error}
        className="min-w-56 flex-1"
      >
        {(fieldProps) => (
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-ink-3">
              ₹
            </span>
            <Input
              {...fieldProps}
              invalid={Boolean(error)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="40,000"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError('');
              }}
              className="figure pl-7 text-lg font-semibold"
            />
          </div>
        )}
      </Field>
      <div className="flex gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {existing ? 'Update budget' : 'Set budget'}
        </Button>
      </div>
    </form>
  );
}
