import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageStatus } from '../components/layout/FullPageStatus.jsx';
import { useAuth } from './useAuth.js';

/** Renders its child routes only for logged-in users; everyone else goes to /login. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking' || status === 'offline') return <FullPageStatus />;

  // While signing out, logout() itself navigates away (to /login or /register).
  if (status !== 'authenticated' && status !== 'signing-out') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
