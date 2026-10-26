import { Outlet, ScrollRestoration } from 'react-router';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { ToastProvider } from './toast/ToastProvider.jsx';

/** App-wide providers. Lives inside the router so auth can navigate (e.g. after logout). */
export function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Outlet />
        <ScrollRestoration />
      </AuthProvider>
    </ToastProvider>
  );
}
