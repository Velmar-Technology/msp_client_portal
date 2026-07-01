import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Ticket,
  User,
  HelpCircle,
  Shield,
  ChevronRight,
  Settings,
} from 'lucide-react';
import logoUrl from '../../assets/logo.png';
import { useAuth } from '../../hooks/useAuth';
import { subscriptionService } from '../../services/subscriptionService';
import type { Subscription } from '../../services/subscriptionService';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '../ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';

import { useTranslation } from 'react-i18next';

interface NavSubItem {
  to: string;
  labelKey: string;
}

interface NavItem {
  to: string;
  icon: any;
  labelKey: string;
  items?: NavSubItem[];
}

const clientNavItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  {
    to: '/tickets-group',
    icon: Ticket,
    labelKey: 'tickets',
    items: [
      { to: '/tickets', labelKey: 'myTickets' },
      { to: '/devices', labelKey: 'devices' },
    ],
  },
  {
    to: '/profile-group',
    icon: User,
    labelKey: 'profile',
    items: [
      { to: '/profile', labelKey: 'profile' },
      { to: '/notifications/preferences', labelKey: 'notificationPreferences' },
      { to: '/plans', labelKey: 'plans' },
      { to: '/billing', labelKey: 'billing' },
    ],
  },
];

const techNavItems: NavItem[] = [
  { to: '/tech/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { to: '/tickets', icon: Ticket, labelKey: 'myTickets' },
  {
    to: '/profile-group',
    icon: User,
    labelKey: 'profile',
    items: [
      { to: '/profile', labelKey: 'profile' },
      { to: '/notifications/preferences', labelKey: 'notificationPreferences' },
    ],
  },
];

const adminNavItems: NavItem[] = [
  { to: '/admin/dashboard', icon: Shield, labelKey: 'adminDashboard' },
  {
    to: '/tickets-group',
    icon: Ticket,
    labelKey: 'tickets',
    items: [
      { to: '/tickets', labelKey: 'allTickets' },
      { to: '/devices', labelKey: 'devices' },
    ],
  },
  {
    to: '/settings-group',
    icon: Settings,
    labelKey: 'settings',
    items: [
      { to: '/profile', labelKey: 'profile' },
      { to: '/notifications/preferences', labelKey: 'notificationPreferences' },
      { to: '/plans', labelKey: 'plans' },
      { to: '/billing', labelKey: 'billing' },
    ],
  },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    if (user?.role !== 'CLIENT') {
      setActiveSubscription(null);
      return;
    }

    let isMounted = true;
    async function loadActiveSub() {
      try {
        const subs = await subscriptionService.getAll();
        if (isMounted) {
          const active = subs.find((sub) => sub.status === 'ACTIVE');
          setActiveSubscription(active || null);
        }
      } catch (err) {
        console.error('Failed to load active subscription for sidebar', err);
      }
    }
    loadActiveSub();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
          <img src={logoUrl} alt="Velmar Logo" className="h-6 w-auto max-w-full shrink-0 object-contain dark:brightness-110" />
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
                if (item.items) {
                  const isGroupActive = item.items.some((sub) =>
                    location.pathname.startsWith(sub.to)
                  );
                  const translatedLabel = t(`nav.${item.labelKey}`);

                  return (
                    <Collapsible
                      key={item.labelKey}
                      asChild
                      defaultOpen={isGroupActive}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={translatedLabel} isActive={isGroupActive}>
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((sub) => {
                              const isSubActive = location.pathname.startsWith(sub.to);
                              return (
                                <SidebarMenuSubItem key={sub.to}>
                                  <SidebarMenuSubButton asChild isActive={isSubActive}>
                                    <NavLink to={sub.to}>
                                      <span>{t(`nav.${sub.labelKey}`)}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

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
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.role === 'CLIENT' && activeSubscription && (
          <div className="mx-3 my-4 p-4 rounded-xl bg-primary/10 border border-primary/20 backdrop-blur-sm shadow-sm group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-label-sm font-bold text-primary uppercase tracking-wider">
                {activeSubscription.plan} Plan
              </span>
            </div>
            <p className="text-body-md font-semibold text-on-surface truncate">
              {activeSubscription.service_name}
            </p>
            <p className="text-[11px] text-on-surface-variant/80 mt-1">
              {t('dashboard.tableRenewal')}: {new Date(activeSubscription.renewal_date).toLocaleDateString(t('dashboard.tableStatus') === 'Estado' ? 'es-DO' : 'en-US', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        )}
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
                <HelpCircle className="h-4 w-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{t('nav.help')}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
