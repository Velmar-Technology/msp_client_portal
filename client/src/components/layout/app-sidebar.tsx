import { NavLink, useLocation } from 'react-router-dom';
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
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '../ui/sidebar';

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

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();

  const navItems =
    user?.role === 'ADMIN'
      ? adminNavItems
      : user?.role === 'TECHNICIAN'
      ? techNavItems
      : clientNavItems;

  return (
    <ShadcnSidebar>
      {/* Brand / Header */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <div className="flex items-center gap-3">
          <CloudCog className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-label-md font-bold text-on-surface leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              MSP Portal
            </h1>
            <span className="text-[10px] text-on-surface-variant opacity-70 mt-0.5">
              Infrastructure Management
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.to === '/dashboard' || item.to === '/tech/dashboard' || item.to === '/admin/dashboard'
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <NavLink to={item.to} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Support/Help */}
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/help'}
              tooltip="Help Center"
            >
              <NavLink to="/help" className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Help Center</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
