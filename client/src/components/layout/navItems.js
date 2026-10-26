import { ArrowLeftRight, ChartColumnBig, LayoutDashboard, Target } from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/budget', label: 'Budget', icon: Target },
  { to: '/analytics', label: 'Analytics', icon: ChartColumnBig },
];
