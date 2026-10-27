import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { PublicOnlyRoute } from './auth/PublicOnlyRoute.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { BootScreen } from './components/layout/BootScreen.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import RouteError from './pages/RouteError.jsx';
import { RootLayout } from './RootLayout.jsx';

/** Route-level code splitting: each page (and Recharts) loads only when first visited. */
const page = (load) => async () => ({ Component: (await load()).default });

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <BootScreen />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        {
          element: <PublicOnlyRoute />,
          children: [
            { path: 'login', lazy: page(() => import('./pages/LoginPage.jsx')) },
            { path: 'register', lazy: page(() => import('./pages/RegisterPage.jsx')) },
          ],
        },
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <AppLayout />,
              children: [
                {
                  path: 'dashboard',
                  handle: { title: 'Dashboard' },
                  lazy: page(() => import('./pages/DashboardPage.jsx')),
                },
                {
                  path: 'transactions',
                  handle: { title: 'Transactions' },
                  lazy: page(() => import('./pages/TransactionsPage.jsx')),
                },
                {
                  path: 'budget',
                  handle: { title: 'Budget' },
                  lazy: page(() => import('./pages/BudgetPage.jsx')),
                },
                {
                  path: 'analytics',
                  handle: { title: 'Analytics' },
                  lazy: page(() => import('./pages/AnalyticsPage.jsx')),
                },
              ],
            },
          ],
        },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  // "/" normally; "/financeflow-fullstack/" on GitHub Pages (Vite's `base`).
  { basename: import.meta.env.BASE_URL },
);
