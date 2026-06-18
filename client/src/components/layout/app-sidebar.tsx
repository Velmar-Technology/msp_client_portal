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
  SidebarGroupContent,
} from '../ui/sidebar';

import { useTranslation } from 'react-i18next';

const clientNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/tickets', icon: Ticket, labelKey: 'tickets' },
  { to: '/plans', icon: Package, labelKey: 'plans' },
  { to: '/billing', icon: CreditCard, labelKey: 'billing' },
  { to: '/profile', icon: User, labelKey: 'profile' },
];

const techNavItems = [
  { to: '/tech/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/tickets', icon: Ticket, labelKey: 'myTickets' },
  { to: '/profile', icon: User, labelKey: 'profile' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: Shield, labelKey: 'adminDashboard' },
  { to: '/tickets', icon: Ticket, labelKey: 'allTickets' },
  { to: '/plans', icon: Package, labelKey: 'plans' },
  { to: '/billing', icon: CreditCard, labelKey: 'billing' },
  { to: '/profile', icon: User, labelKey: 'profile' },
];

export function AppSidebar() {
  const { t } = useTranslation();
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
              {t('topNav.portal')}
            </h1>
            <span className="text-[10px] text-on-surface-variant opacity-70 mt-0.5">
              {t('nav.infrastructure')}
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = item.to === '/dashboard' || item.to === '/tech/dashboard' || item.to === '/admin/dashboard'
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                
                const translatedLabel = t(`nav.${item.labelKey}`);
                
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={translatedLabel}
                    >
                      <NavLink to={item.to} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
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
              tooltip={t('nav.help')}
            >
              <NavLink to="/help" className="flex items-center gap-3">
                <HelpCircle className="h-4 w-4 flex-shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{t('nav.help')}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
