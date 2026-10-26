import { useState } from 'react';
import { Outlet } from 'react-router';
import { useAuth } from '../../auth/useAuth.js';
import { ComposerProvider } from '../../composer/ComposerProvider.jsx';
import { DemoBanner } from './DemoBanner.jsx';
import { Logo } from './Logo.jsx';
import { MobileNav } from './MobileNav.jsx';
import { SidebarNav } from './SidebarNav.jsx';
import { Topbar } from './Topbar.jsx';

/** Shell for every signed-in page: sidebar, top navbar, and the shared "add transaction" modal. */
export function AppLayout() {
  const { user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <ComposerProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand-800 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="min-h-dvh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-surface px-4 py-5 lg:flex">
          <Logo className="px-2" />
          <div className="mt-9 flex-1">
            <SidebarNav />
          </div>
          <p className="px-3 text-xs text-ink-3">
            Press{' '}
            <kbd className="rounded border border-rule-strong bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-2">
              N
            </kbd>{' '}
            anywhere to add a transaction.
          </p>
        </aside>

        <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

        <div className="flex min-w-0 flex-col">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          {user?.isDemo && <DemoBanner />}
          <main
            id="main"
            tabIndex={-1}
            className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            <div className="mx-auto max-w-[1240px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ComposerProvider>
  );
}
