import { isRouteErrorResponse, useRouteError } from 'react-router';
import { LogoMark } from '../components/layout/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';

/** Last line of defence: shown if a page crashes while rendering. */
export default function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'An unexpected error stopped this page from loading.';

  return (
    <main role="alert" className="grid min-h-dvh place-items-center bg-paper px-6">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-12" />
        <h1 className="mt-8 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-ink-2">{message} Reloading usually fixes it.</p>
        <Button className="mt-8" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
      </div>
    </main>
  );
}
