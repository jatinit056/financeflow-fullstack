import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageStatus } from '../components/layout/FullPageStatus.jsx';
import { useAuth } from './useAuth.js';

/** Login/register pages: logged-in users are sent back to where they were going. */
export function PublicOnlyRoute() {
  const { status, finishSignOut } = useAuth();
  const location = useLocation();

  // Logging out: now that a public page is showing, the user can be cleared safely.
  useEffect(() => {
    if (status === 'signing-out') finishSignOut();
  }, [status, finishSignOut]);

  if (status === 'checking' || status === 'offline') return <FullPageStatus />;

  if (status === 'authenticated') {
    const destination = location.state?.from?.pathname ?? '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
