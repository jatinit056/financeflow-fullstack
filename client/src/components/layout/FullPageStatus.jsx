import { useAuth } from '../../auth/useAuth.js';
import { useDelayedFlag } from '../../hooks/useDelayedFlag.js';
import { Button } from '../ui/Button.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { LogoMark } from './Logo.jsx';

/** Shown while a saved session is being restored, or when the API can't be reached. */
export function FullPageStatus() {
  const { status, retryCheck } = useAuth();
  const slow = useDelayedFlag(status === 'checking', 4000);

  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6">
      <div className="flex max-w-sm flex-col items-center text-center">
        <LogoMark className="size-12" />
        {status === 'offline' ? (
          <>
            <h1 className="mt-6 text-lg font-semibold">Can't reach FinanceFlow</h1>
            <p className="mt-1 text-sm text-ink-2">
              The server didn't respond. Check your connection, then try again.
            </p>
            <Button className="mt-6" onClick={retryCheck}>
              Try again
            </Button>
          </>
        ) : (
          <>
            <Spinner className="mt-6 size-6 text-brand-600" />
            <p className="mt-4 text-sm text-ink-2" role="status">
              {slow
                ? 'Waking up the server. On free hosting the first visit can take up to a minute.'
                : 'Loading your account…'}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
