import { Spinner } from '../ui/Spinner.jsx';
import { LogoMark } from './Logo.jsx';

/** First paint while the initial page's code loads. */
export function BootScreen() {
  return (
    <div className="grid min-h-dvh place-items-center bg-paper">
      <div className="flex flex-col items-center gap-5">
        <LogoMark className="size-12" />
        <Spinner className="size-6 text-brand-600" />
        <span className="sr-only">Loading FinanceFlow…</span>
      </div>
    </div>
  );
}
