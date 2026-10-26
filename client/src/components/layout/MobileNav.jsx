import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Logo } from './Logo.jsx';
import { SidebarNav } from './SidebarNav.jsx';

/** Slide-in navigation for small screens (native <dialog>: focus trap + Escape for free). */
export function MobileNav({ open, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Navigation"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-[min(300px,85vw)] max-w-none border-0 bg-transparent p-0 lg:hidden"
    >
      <div className="flex h-full flex-col bg-surface px-4 py-5">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ink-3 hover:bg-paper hover:text-ink"
            aria-label="Close menu"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <div className="mt-8">
          <SidebarNav onNavigate={onClose} />
        </div>
      </div>
    </dialog>
  );
}
