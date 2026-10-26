import { Link } from 'react-router';
import { Spinner } from './Spinner.jsx';

const VARIANTS = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-600/50',
  secondary:
    'border border-rule-strong bg-surface text-ink hover:bg-paper active:bg-rule disabled:text-ink-3',
  ghost: 'text-ink-2 hover:bg-ink/5 hover:text-ink active:bg-ink/10 disabled:text-ink-3',
  danger: 'bg-critical text-white hover:bg-[#b52f2f] active:bg-[#9c2828] disabled:bg-critical/50',
  inverse: 'bg-white text-brand-800 hover:bg-brand-50 active:bg-brand-100',
};

const SIZES = {
  sm: 'h-9 gap-1.5 rounded-lg px-3 text-sm',
  md: 'h-11 gap-2 rounded-lg px-4 text-[15px]',
  lg: 'h-12 gap-2 rounded-xl px-5 text-base',
  icon: 'size-9 rounded-lg',
};

function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return [
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed',
    VARIANTS[variant],
    SIZES[size],
    className,
  ].join(' ');
}

export function Button({
  variant,
  size,
  className,
  loading = false,
  disabled,
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, ...props }) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
