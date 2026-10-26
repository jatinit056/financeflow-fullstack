export function LogoMark({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0b6b57" />
      <g fill="#ffffff">
        <rect x="9" y="8" width="4" height="16" rx="2" />
        <rect x="9" y="8" width="14" height="4" rx="2" />
        <rect x="9" y="14.5" width="10" height="4" rx="2" />
      </g>
    </svg>
  );
}

export function Logo({ className = '', inverse = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span
        className={`text-[19px] font-bold tracking-tight ${inverse ? 'text-white' : 'text-ink'}`}
      >
        FinanceFlow
      </span>
    </span>
  );
}
