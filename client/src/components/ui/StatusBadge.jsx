import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react';

const BUDGET_STATUS = {
  on_track: {
    label: 'On track',
    Icon: CircleCheck,
    icon: 'text-good',
    tone: 'bg-good/10 text-ink',
  },
  warning: {
    label: 'Close to limit',
    Icon: TriangleAlert,
    icon: 'text-[#b07a00]',
    tone: 'bg-warning/15 text-ink',
  },
  exceeded: {
    label: 'Over budget',
    Icon: CircleAlert,
    icon: 'text-critical',
    tone: 'bg-critical/10 text-ink',
  },
  none: { label: 'No budget', Icon: CircleDashed, icon: 'text-ink-3', tone: 'bg-ink/5 text-ink-2' },
};

/** Budget status — always an icon plus a word, never colour alone. */
export function StatusBadge({ status, className = '' }) {
  const { label, Icon, icon, tone } = BUDGET_STATUS[status] ?? BUDGET_STATUS.none;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${tone} ${className}`}
    >
      <Icon aria-hidden="true" className={`size-3.5 ${icon}`} strokeWidth={2.5} />
      {label}
    </span>
  );
}
