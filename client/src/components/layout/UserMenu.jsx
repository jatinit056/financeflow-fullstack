import { ChevronDown, LogOut } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../../auth/useAuth.js';
import { initials } from '../../lib/format.js';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const menuId = useId();

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-ink/5"
      >
        <span className="grid size-8 place-items-center rounded-full bg-brand-800 text-[13px] font-semibold text-white">
          {initials(user.name)}
        </span>
        <span className="hidden max-w-36 truncate text-sm font-medium text-ink md:block">
          {user.name}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-ink-3" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 z-30 mt-2 w-64 rounded-xl border border-rule bg-surface p-1.5 shadow-xl shadow-brand-900/10"
        >
          <div className="border-b border-rule px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-sm text-ink-2">
              {user.isDemo ? 'Demo account' : user.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-paper"
          >
            <LogOut aria-hidden="true" className="size-4 text-ink-3" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
