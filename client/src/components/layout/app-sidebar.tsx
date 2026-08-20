import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import { ChevronRight, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/logo.png";
import { useSidebar, type NavItem, type NavSubItem } from "@/hooks/useSidebar";
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import type { Subscription } from "@/services/subscriptionService";

// 1. Sidebar Brand Sub-component
interface SidebarBrandProps {
  logo: string;
  portalTitle: string;
  infraTitle: string;
}

export function SidebarBrand({ logo, portalTitle, infraTitle }: SidebarBrandProps) {
  return (
    <SidebarHeader className="border-b border-sidebar-border px-3.5 py-2.5 bg-sidebar">
      <div className="flex items-center gap-2.5">
        <img
          src={logo}
          alt="Velmar Logo"
          className="h-5.5 w-auto max-w-full shrink-0 object-contain dark:brightness-110"
        />
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <h1 className="text-xs font-bold text-sidebar-foreground font-heading leading-none">
            {portalTitle}
          </h1>
          <span className="text-[9px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">
            {infraTitle}
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}

// 2. High-Density Active Subscription Card Sub-component
interface ActiveSubCardProps {
  subs: Subscription[];
  planNameMap: Map<string, string>;
  renewalLabel: string;
  isSpanish: boolean;
}

export function ActiveSubCard({ subs, planNameMap, renewalLabel, isSpanish }: ActiveSubCardProps) {
  const representative = subs[0];
  const count = subs.length;
  const displayName = planNameMap.get(representative.plan) || representative.service_name;

  const formattedDate = useMemo(() => {
    const earliest = subs.reduce((min, s) => {
      const d = new Date(s.renewal_date);
      return d < min ? d : min;
    }, new Date(subs[0].renewal_date));
    return earliest.toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
      day: "2-digit",
      month: "short",
    });
  }, [subs, isSpanish]);

  const daysRemaining = useMemo(() => {
    const earliest = subs.reduce((min, s) => {
      const d = new Date(s.renewal_date);
      return d < min ? d : min;
    }, new Date(subs[0].renewal_date));
    const now = new Date();
    const diffMs = earliest.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [subs]);

  const isExpiring = subs.some((s) => s.status === "EXPIRING");

  return (
    <div className={`mx-2 my-1.5 p-2.5 rounded-sm border shadow-xs group-data-[collapsible=icon]:hidden transition-colors ${
      isExpiring
        ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
        : "border-sidebar-border bg-sidebar-accent/50"
    }`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono font-bold text-sidebar-foreground bg-sidebar-accent border border-sidebar-border px-1 rounded-sm uppercase">
            {representative.plan}
          </span>
          {count > 1 && (
            <span className="text-[9px] font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-1 rounded-sm">
              x{count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isExpiring ? (
            <>
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                {isSpanish ? "Expira Pronto" : "Expiring"}
              </span>
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
              <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider">
                Active
              </span>
            </>
          )}
        </div>
      </div>
      <p className="text-[11px] font-medium text-sidebar-foreground truncate">{displayName}</p>
      <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
        {renewalLabel}: {formattedDate}
      </p>
      {isExpiring && (
        <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5 font-semibold">
          {daysRemaining === 0
            ? (isSpanish ? "Vence hoy" : "Expires today")
            : isSpanish
              ? `Quedan ${daysRemaining} día${daysRemaining !== 1 ? "s" : ""}`
              : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`
          }
        </p>
      )}
    </div>
  );
}

// 3. Navigation List Component
interface SidebarNavListProps {
  navItems: NavItem[];
  checkIsActive: (to: string) => boolean;
  checkIsGroupActive: (items?: NavSubItem[]) => boolean;
}

export function SidebarNavList({ navItems, checkIsActive, checkIsGroupActive }: SidebarNavListProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenu className="gap-0.5 px-1">
      {navItems.map((item) => {
        const translatedLabel = t(`nav.${item.labelKey}`);

        if (item.items) {
          const isGroupActive = checkIsGroupActive(item.items);

          return (
            <Collapsible key={item.labelKey} asChild defaultOpen={isGroupActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip={translatedLabel}
                    isActive={isGroupActive}
                    className="h-7 text-xs py-1 px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold transition-colors"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
                    <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub className="ml-3 border-l border-sidebar-border pl-1.5 py-0.5 space-y-0.5">
                    {item.items.map((sub) => {
                      const isSubActive = checkIsActive(sub.to);
                      return (
                        <SidebarMenuSubItem key={sub.to}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubActive}
                            className="h-6 text-[11px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:font-medium transition-colors"
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
              className="h-7 text-xs py-1 px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-foreground data-[active=true]:font-semibold transition-colors"
            >
              <NavLink to={item.to} className="flex items-center gap-2">
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
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
  const { user, location, activeSubscriptions, planNameMap, navItems, checkIsActive, checkIsGroupActive } = useSidebar();

  const isSpanish = t("dashboard.tableStatus") === "Estado";
  const isPublicLegalPage = location.pathname === "/" || location.pathname === "/terms" || location.pathname === "/privacy";

  const appVersion = import.meta.env.VITE_APP_VERSION as string | undefined;

  const groupedSubs = useMemo(() => {
    const groups = new Map<string, Subscription[]>();
    for (const sub of activeSubscriptions) {
      const existing = groups.get(sub.plan);
      if (existing) {
        existing.push(sub);
      } else {
        groups.set(sub.plan, [sub]);
      }
    }
    return Array.from(groups.values());
  }, [activeSubscriptions]);

  const hasMultipleGroups = groupedSubs.length > 1;

  return (
    <ShadcnSidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Header section */}
      <SidebarBrand logo={logoUrl} portalTitle={t("topNav.portal")} infraTitle={t("nav.infrastructure")} />

      {/* Navigation Content */}
      <SidebarContent className="py-1 bg-sidebar">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarNavList navItems={navItems} checkIsActive={checkIsActive} checkIsGroupActive={checkIsGroupActive} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer support item */}
      <SidebarFooter className="border-t border-sidebar-border p-1.5 bg-sidebar">
        {user?.role === "CLIENT" && groupedSubs.length > 0 && !isPublicLegalPage && (
          hasMultipleGroups ? (
            <Collapsible defaultOpen className="group/collapsible-sub">
              <SidebarMenu className="px-0">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className="h-auto py-1.5 px-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                    >
                      <span>{isSpanish ? "Suscripciones" : "Subscriptions"}</span>
                      <span className="ml-auto bg-sidebar-accent border border-sidebar-border rounded-sm px-1.5 py-0.5 text-[9px] font-mono tabular-nums">
                        {groupedSubs.length}
                      </span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible-sub:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0">
                      {groupedSubs.map((group) => (
                        <ActiveSubCard key={group[0].plan} subs={group} planNameMap={planNameMap} renewalLabel={t("dashboard.tableRenewal")} isSpanish={isSpanish} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </SidebarMenu>
            </Collapsible>
          ) : (
            <ActiveSubCard subs={groupedSubs[0]} planNameMap={planNameMap} renewalLabel={t("dashboard.tableRenewal")} isSpanish={isSpanish} />
          )
        )}
        {user && !isPublicLegalPage && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={checkIsActive("/help")}
                tooltip={t("nav.help")}
                className="h-7 text-xs py-1 px-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:text-sidebar-foreground transition-colors"
              >
                <NavLink to="/help" className="flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden font-medium">{t("nav.help")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {appVersion && (
          <div className="group-data-[collapsible=icon]:hidden px-3 pb-1 pt-0.5 text-[9px] font-medium text-muted-foreground">
            v{appVersion}
          </div>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
