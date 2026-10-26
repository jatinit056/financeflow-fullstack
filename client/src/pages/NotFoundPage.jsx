import { LogoMark } from '../components/layout/Logo.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-12" />
        <p className="figure mt-8 text-6xl font-semibold text-brand-600">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This page doesn't exist</h1>
        <p className="mt-2 text-ink-2">The link may be broken, or the page may have moved.</p>
        <ButtonLink to="/" className="mt-8">
          Go to your dashboard
        </ButtonLink>
      </div>
    </main>
  );
}
