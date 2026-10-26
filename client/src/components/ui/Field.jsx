import { useId } from 'react';

const controlBase =
  'w-full rounded-lg border bg-surface text-[15px] text-ink transition-colors placeholder:text-ink-3 ' +
  'focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none ' +
  'disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-3';

const controlState = (invalid) => (invalid ? 'border-critical' : 'border-rule-strong');

/**
 * Label + control + hint/error, wired together with ids so screen readers announce
 * the hint and the error with the input. `children` is a render function receiving
 * the props the control needs.
 */
export function Field({ label, hint, error, optional = false, className = '', children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink"
      >
        {label}
        {optional && <span className="text-xs font-normal text-ink-3">Optional</span>}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-negative">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', invalid, ...props }) {
  return (
    <input
      className={`${controlBase} ${controlState(invalid)} h-11 px-3 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = '', invalid, children, ...props }) {
  return (
    <select
      className={`${controlBase} ${controlState(invalid)} h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%2356625d'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 pl-3 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
