import { NavLink } from 'react-router';
import { NAV_ITEMS } from './navItems.js';

export function SidebarNav({ onNavigate }) {
  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-2 hover:bg-ink/[0.04] hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    aria-hidden="true"
                    className={`size-5 ${isActive ? 'text-brand-600' : 'text-ink-3'}`}
                    strokeWidth={isActive ? 2.2 : 1.9}
                  />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
