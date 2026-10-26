import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageStatus } from '../components/layout/FullPageStatus.jsx';
import { useAuth } from './useAuth.js';

/** Login/register pages: logged-in users are sent back to where they were going. */
export function PublicOnlyRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking' || status === 'offline') return <FullPageStatus />;

  if (status === 'authenticated') {
    const destination = location.state?.from?.pathname ?? '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return <Outlet />;
}
