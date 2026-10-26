import { FlaskConical } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';

export function DemoBanner() {
  const { logout } = useAuth();

  return (
    <div className="border-b border-brand-100 bg-brand-50">
      <div className="mx-auto flex max-w-[1304px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <FlaskConical aria-hidden="true" className="size-4 shrink-0 text-brand-600" />
        <p className="text-brand-900">
          You're exploring a demo account with sample data. It's deleted automatically after 24
          hours.
        </p>
        <button
          type="button"
          onClick={() => logout({ redirectTo: '/register', message: null })}
          className="font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:decoration-brand-700"
        >
          Create your own account
        </button>
      </div>
    </div>
  );
}
