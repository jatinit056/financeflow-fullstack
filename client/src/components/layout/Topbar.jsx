import { Menu, Plus } from 'lucide-react';
import { useMatches } from 'react-router';
import { useComposer } from '../../composer/useComposer.js';
import { Button } from '../ui/Button.jsx';
import { LogoMark } from './Logo.jsx';
import { UserMenu } from './UserMenu.jsx';

export function Topbar({ onOpenNav }) {
  const matches = useMatches();
  const title = matches.findLast((match) => match.handle?.title)?.handle.title ?? '';
  const { openCreate } = useComposer();

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1304px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenNav}
          className="-ml-1 rounded-lg p-2 text-ink-2 hover:bg-ink/5 hover:text-ink lg:hidden"
          aria-label="Open navigation"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <LogoMark className="size-7 lg:hidden" />
        <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Button
            onClick={openCreate}
            size="md"
            className="max-sm:size-10 max-sm:px-0"
            aria-keyshortcuts="n"
          >
            <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.4} />
            <span className="max-sm:sr-only">Add transaction</span>
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
