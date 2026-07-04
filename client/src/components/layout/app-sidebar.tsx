import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoUrl from "../../assets/logo.png";
import { useSidebar, type NavItem } from "../../hooks/useSidebar";
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
} from "../ui/sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../ui/collapsible";
import type { Subscription } from "../../services/subscriptionService";

// 1. Sidebar Brand Sub-component
interface SidebarBrandProps {
  logo: string;
  portalTitle: string;
  infraTitle: string;
}

export function SidebarBrand({ logo, portalTitle, infraTitle }: SidebarBrandProps) {
  return (
    <SidebarHeader className="border-b border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 bg-white dark:bg-zinc-950">
      <div className="flex items-center gap-2.5">
        <img
          src={logo}
          alt="Velmar Logo"
          className="h-5.5 w-auto max-w-full shrink-0 object-contain dark:brightness-110"
        />
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <h1
            className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {portalTitle}
          </h1>
          <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 uppercase tracking-wider">
            {infraTitle}
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}

// 2. High-Density Active Subscription Card Sub-component
interface ActiveSubCardProps {
  sub: Subscription;
  renewalLabel: string;
  isSpanish: boolean;
}

export function ActiveSubCard({ sub, renewalLabel, isSpanish }: ActiveSubCardProps) {
  const formattedDate = useMemo(() => {
    return new Date(sub.renewal_date).toLocaleDateString(
      isSpanish ? "es-DO" : "en-US",
      { day: "2-digit", month: "short" }
    );
  }, [sub.renewal_date, isSpanish]);

  return (
    <div className="mx-2 my-2 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shadow-sm group-data-[collapsible=icon]:hidden transition-colors">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[9px] font-mono font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1 rounded uppercase">
          {sub.plan} Plan
        </span>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate">
        {sub.service_name}
      </p>
      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
        {renewalLabel}: {formattedDate}
      </p>
    </div>
  );
}

// 3. Navigation List Component
interface SidebarNavListProps {
  navItems: NavItem[];
  checkIsActive: (to: string) => boolean;
  checkIsGroupActive: (items?: any[]) => boolean;
}

export function SidebarNavList({
  navItems,
  checkIsActive,
  checkIsGroupActive,
}: SidebarNavListProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenu className="gap-0.5 px-1">
      {navItems.map((item) => {
        const translatedLabel = t(`nav.${item.labelKey}`);

        if (item.items) {
          const isGroupActive = checkIsGroupActive(item.items);

          return (
            <Collapsible
              key={item.labelKey}
              asChild
              defaultOpen={isGroupActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={translatedLabel}
                    isActive={isGroupActive}
                    className="h-7 text-xs py-1 px-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 data-[active=true]:text-zinc-900 dark:data-[active=true]:text-zinc-100 data-[active=true]:font-semibold transition-colors"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {translatedLabel}
                    </span>
                    <ChevronRight className="ml-auto h-3 w-3 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-3 border-l border-zinc-200 dark:border-zinc-800 pl-1.5 py-0.5 space-y-0.5">
                    {item.items.map((sub) => {
                      const isSubActive = checkIsActive(sub.to);
                      return (
                        <SidebarMenuSubItem key={sub.to}>
                          <SidebarMenuSubButton 
                            asChild 
                            isActive={isSubActive} 
                            className="h-6 text-[11px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 data-[active=true]:text-zinc-900 dark:data-[active=true]:text-zinc-100 data-[active=true]:font-medium transition-colors"
                          >
                            <NavLink to={sub.to} className="w-full truncate">
                              {t(`nav.${sub.labelKey}`)}
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

        const isActive = checkIsActive(item.to);

        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={translatedLabel}
              className="h-7 text-xs py-1 px-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 data-[active=true]:text-zinc-900 dark:data-[active=true]:text-zinc-100 data-[active=true]:font-semibold transition-colors"
            >
              <NavLink to={item.to} className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {translatedLabel}
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

// 4. Premium SaaS Sidebar Component
export function AppSidebar() {
  const { t } = useTranslation();
  const {
    user,
    activeSubscription,
    navItems,
    checkIsActive,
    checkIsGroupActive,
  } = useSidebar();

  const isSpanish = t("dashboard.tableStatus") === "Estado";

  return (
    <ShadcnSidebar className="border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Header section */}
      <SidebarBrand
        logo={logoUrl}
        portalTitle={t("topNav.portal")}
        infraTitle={t("nav.infrastructure")}
      />

      {/* Navigation Content */}
      <SidebarContent className="py-1 bg-white dark:bg-zinc-950">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarNavList
              navItems={navItems}
              checkIsActive={checkIsActive}
              checkIsGroupActive={checkIsGroupActive}
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Subscription Info Card */}
        {user?.role === "CLIENT" && activeSubscription && (
          <ActiveSubCard
            sub={activeSubscription}
            renewalLabel={t("dashboard.tableRenewal")}
            isSpanish={isSpanish}
          />
        )}
      </SidebarContent>

      {/* Footer support item */}
      <SidebarFooter className="border-t border-zinc-200 dark:border-zinc-800 p-1.5 bg-white dark:bg-zinc-950">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={checkIsActive("/help")}
              tooltip={t("nav.help")}
              className="h-7 text-xs py-1 px-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 data-[active=true]:text-zinc-900 dark:data-[active=true]:text-zinc-100 transition-colors"
            >
              <NavLink to="/help" className="flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden font-medium">
                  {t("nav.help")}
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
