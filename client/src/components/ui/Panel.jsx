import { useId } from 'react';

/**
 * The basic content container. Panels are separated by hairline borders rather than
 * drop shadows; hierarchy comes from spacing and type, not from card chrome.
 */
export function Panel({
  title,
  description,
  actions,
  className = '',
  bodyClassName = '',
  children,
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`min-w-0 rounded-panel border border-rule bg-surface ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-[17px] leading-tight font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={`px-5 pt-4 pb-5 sm:px-6 sm:pb-6 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
