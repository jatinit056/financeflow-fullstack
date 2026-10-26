import { RotateCw, WifiOff } from 'lucide-react';
import { getErrorMessage } from '../../lib/errors.js';
import { Button } from './Button.jsx';

/** A failed request: say what happened and offer a retry. */
export function ErrorState({ error, onRetry, title = "Couldn't load this", className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center px-4 py-10 text-center ${className}`}>
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-critical/10 text-critical">
        <WifiOff aria-hidden="true" className="size-6" />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-2">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
