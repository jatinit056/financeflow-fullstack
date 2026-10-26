/** Shown when there is nothing to display yet — always points to the next action. */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center px-4 py-10 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Icon aria-hidden="true" className="size-6" />
        </span>
      )}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
