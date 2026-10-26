import { CircleAlert, CircleCheck, TriangleAlert, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ToastContext } from './ToastContext.js';

const ICONS = {
  success: { Icon: CircleCheck, className: 'text-good' },
  warning: { Icon: TriangleAlert, className: 'text-warning' },
  error: { Icon: CircleAlert, className: 'text-critical' },
};

const DURATION = { success: 4000, warning: 7000, error: 7000 };

/**
 * Lightweight toast notifications. Messages are announced to screen readers through
 * an aria-live region (errors interrupt with role="alert").
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    ({ type = 'success', title, message }) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current.slice(-2), { id, type, title, message }]);
      setTimeout(() => dismiss(id), DURATION[type] ?? 5000);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, title) => show({ type: 'success', message, title }),
      warning: (message, title) => show({ type: 'warning', message, title }),
      error: (message, title) => show({ type: 'error', message, title }),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => {
          const { Icon, className } = ICONS[toast.type] ?? ICONS.success;
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-rule bg-surface p-4 shadow-lg shadow-brand-900/10"
            >
              <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${className}`} />
              <div className="min-w-0 flex-1 text-sm">
                {toast.title && <p className="font-semibold text-ink">{toast.title}</p>}
                <p className="text-ink-2">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-m-1 rounded-md p-1 text-ink-3 hover:bg-paper hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext>
  );
}
