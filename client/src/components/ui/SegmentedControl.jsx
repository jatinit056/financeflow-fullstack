import { useId } from 'react';

/**
 * A row of mutually exclusive options (radio group under the hood, so arrow keys
 * work and screen readers announce "1 of 3").
 */
export function SegmentedControl({ label, options, value, onChange, size = 'md', className = '' }) {
  const name = useId();
  const height = size === 'sm' ? 'h-8 text-[13px]' : 'h-10 text-sm';

  return (
    <fieldset
      className={`inline-flex rounded-lg border border-rule-strong bg-paper p-0.5 ${className}`}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 font-medium whitespace-nowrap text-ink-2 transition-colors has-checked:bg-surface has-checked:text-ink has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-brand-600 hover:text-ink ${height} ${option.className ?? ''}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.icon && <option.icon aria-hidden="true" className="size-4" />}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
