import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  CreditCard,
  Package,
  User,
  HelpCircle,
  CloudCog,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const clientNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'Tickets' },
  { to: '/plans', icon: Package, label: 'Plans' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const techNavItems = [
  { to: '/tech/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'My Tickets' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: Shield, label: 'Admin Dashboard' },
  { to: '/tickets', icon: Ticket, label: 'All Tickets' },
  { to: '/plans', icon: Package, label: 'Plans' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const { user } = useAuth();

  const navItems =
    user?.role === 'ADMIN'
      ? adminNavItems
      : user?.role === 'TECHNICIAN'
      ? techNavItems
      : clientNavItems;

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 border-r border-outline-variant bg-surface-container-low z-20">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2 px-4 pt-6">
        <CloudCog className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-h2 text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>
            MSP Portal
          </h1>
          <p className="text-label-sm text-on-surface-variant opacity-70">
            Infrastructure Management
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-label-md transition-all duration-150 ${
                isActive
                  ? 'bg-surface-container-high text-primary border-l-2 border-secondary font-medium'
                  : 'text-on-surface-variant opacity-70 hover:bg-surface-container hover:opacity-100'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6">
        <NavLink
          to="/help"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-label-md text-on-surface-variant opacity-70 hover:bg-surface-container transition-all"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help Center</span>
        </NavLink>
      </div>
    </aside>
  );
}
