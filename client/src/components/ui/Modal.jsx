import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

/**
 * Accessible modal built on the native <dialog> element: it traps focus, closes on Escape,
 * makes the page behind it inert and returns focus to the trigger when closed.
 * Content only renders while open, so forms start fresh every time.
 */
export function Modal({ open, onClose, title, description, size = 'md', children }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // <dialog> focuses its first focusable element (the close button); prefer the main field.
      dialog.querySelector('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault(); // let React state drive closing
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose(); // click on the backdrop
      }}
      className={`m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-visible rounded-t-2xl border-0 bg-transparent p-0 text-ink backdrop:backdrop-blur-[2px] sm:m-auto sm:rounded-2xl ${widths[size]}`}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
          <header className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-6">
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-ink-2">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-lg p-2 text-ink-3 hover:bg-paper hover:text-ink"
              aria-label="Close"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </header>
          <div className="overscroll-contain overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
