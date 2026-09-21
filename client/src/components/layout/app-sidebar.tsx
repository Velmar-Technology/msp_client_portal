import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Fragment } from "react";
import { ChevronDown, ChevronRight, HelpCircle, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import logoUrl from "@/assets/logo.png";
import { useSidebar, type NavItem, type NavSubItem } from "@/hooks/useSidebar";
import { preloadRoute, routePreloaders } from "@/lib/preloadRoute";
import { preloadOnIdle } from "@/lib/lazyWithRetry";
import { useNavCounters, useMarkNavSeen, useNavCounterStream, NavCounterBadge } from "@/features/nav";
import type { NavKey } from "@shared/contracts";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Subscription } from "@/features/subscriptions";

const navItemButtonClass =
  "h-8 gap-2.5 px-2.5 py-1 text-[13px] text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground transition-colors";

const navGroupHeadingClass =
  "px-1.5 pb-1 pt-3 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50";

interface SidebarBrandProps {
  logo: string;
  portalTitle: string;
  infraTitle: string;
}

export function SidebarBrand({ logo, portalTitle, infraTitle }: SidebarBrandProps) {
  return (
    <SidebarHeader className="border-b border-sidebar-border/50 px-3 py-2.5 bg-sidebar">
      <div className="flex items-center gap-2.5">
        <img
          src={logo}
          alt="Velmar Logo"
          className="h-5.5 w-auto max-w-full shrink-0 object-contain dark:brightness-110"
        />
        <div className="flex flex-col group-data-[collapsible=icon]:hidden">
          <h1 className="text-xs font-bold text-sidebar-foreground font-heading leading-none">{portalTitle}</h1>
          <span className="text-[9px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">
            {infraTitle}
          </span>
        </div>
      </div>
    </SidebarHeader>
  );
}

function useSubscriptionMeta(subs: Subscription[]) {
  const { t, i18n } = useTranslation();

  const locale = i18n.language?.startsWith("es") ? "es-DO" : "en-US";

  const [now] = useState(() => Date.now());

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(locale, { day: "2-digit", month: "short" });

  const earliestRenewal = useMemo(() => {
    return subs.reduce((min, s) => {
      const d = new Date(s.renewal_date);
      return d < min ? d : min;
    }, new Date(subs[0].renewal_date));
  }, [subs]);

  const daysRemaining = useMemo(
    () => Math.max(0, Math.ceil((earliestRenewal.getTime() - now) / 86400000)),
    [earliestRenewal, now],
  );

  const daysRemainingLabel =
    daysRemaining === 0 ? t("sidebar.expiresToday") : t("sidebar.daysRemaining", { count: daysRemaining });

  return { t, locale, formatDate, daysRemaining, daysRemainingLabel };
}

interface ActiveSubCardProps {
  subs: Subscription[];
  planNameMap: Map<string, string>;
}

export function ActiveSubCard({ subs, planNameMap }: ActiveSubCardProps) {
  const { t } = useTranslation();
  const { formatDate, daysRemainingLabel } = useSubscriptionMeta(subs);

  const representative = subs[0];
  const count = subs.length;
  const displayName = planNameMap.get(representative.plan) || representative.service_name;
  const isExpiring = subs.some((s) => s.status === "EXPIRING");

  const metaText = isExpiring
    ? daysRemainingLabel
    : t("sidebar.renewsOn", {
        date: formatDate(representative.renewal_date),
      });

  return (
    <div className="mx-1 my-1 flex items-center justify-between gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/60 group-data-[collapsible=icon]:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-primary text-primary-foreground text-[13px] font-semibold shadow-sm">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="text-[13px] font-medium leading-none text-sidebar-foreground truncate">{displayName}</span>
          <span
            className={`mt-1.5 text-[11px] leading-none truncate ${
              isExpiring ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}
          >
            {metaText}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 shrink-0 animate-pulse rounded-full ${isExpiring ? "bg-amber-500" : "bg-primary"}`}
        />
        <span
          className={`text-[9px] font-semibold uppercase tracking-wider leading-none ${
            isExpiring ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          }`}
        >
          {isExpiring ? t("sidebar.expiring") : t("sidebar.active")}
        </span>
        {count > 1 && (
          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono font-bold tabular-nums text-primary">
            x{count}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={displayName}
              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer"
            >
              <ChevronDown width={32} height={32} viewBox="0 0 24 24" strokeWidth={1.5} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="w-56">
            {subs.map((s) => (
              <DropdownMenuItem key={s.id} className="gap-2 text-xs">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.status === "EXPIRING" ? "animate-pulse bg-amber-500" : "bg-primary"
                  }`}
                />
                <span className="flex-1 truncate font-medium">{planNameMap.get(s.plan) || s.service_name}</span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {formatDate(s.renewal_date)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface SidebarNavListProps {
  navItems: NavItem[];
  checkIsActive: (to: string) => boolean;
  checkIsGroupActive: (items?: NavSubItem[]) => boolean;
  isFeatureLocked?: (featureCode?: string) => boolean;
  counters?: Record<string, { count: number; latestAt: string | null }>;
}

export function SidebarNavList({
  navItems,
  checkIsActive,
  checkIsGroupActive,
  isFeatureLocked,
  counters,
}: SidebarNavListProps) {
  const { t } = useTranslation();

  return (
    <SidebarMenu className="gap-0.5 px-1 group-data-[collapsible=icon]:px-2">
      {navItems.map((item, idx) => {
        const translatedLabel = t(`nav.${item.labelKey}`);
        const showHeading = !!item.groupLabelKey && item.groupLabelKey !== navItems[idx - 1]?.groupLabelKey;

        if (item.items) {
          const isGroupActive = checkIsGroupActive(item.items);

          return (
            <Fragment key={item.to}>
              {showHeading && (
                <li aria-hidden="true" className="pointer-events-none list-none">
                  <span className={`${navGroupHeadingClass} group-data-[collapsible=icon]:hidden`}>
                    {t(item.groupLabelKey!)}
                  </span>
                </li>
              )}
              <Collapsible asChild defaultOpen={isGroupActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={translatedLabel}
                      isActive={isGroupActive}
                      className={navItemButtonClass}
                    >
                      <item.icon width={32} height={32} viewBox="0 0 24 24" className="shrink-0" strokeWidth={1.5} />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{translatedLabel}</span>
                      <ChevronRight
                        width={32}
                        height={32}
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        className="ml-auto shrink-0 text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                    <SidebarMenuSub className="ml-3 border-l border-sidebar-border/50 py-0.5 space-y-0.5 pl-1.5">
                      {item.items.map((sub) => {
                        const isSubActive = checkIsActive(sub.to);
                        return (
                          <SidebarMenuSubItem key={sub.to}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubActive}
                              className="h-7 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground transition-colors"
                            >
                              <NavLink
                                to={sub.to}
                                className="w-full truncate flex items-center"
                                onMouseEnter={() => preloadRoute(sub.to)}
                                onFocus={() => preloadRoute(sub.to)}
                              >
                                {t(`nav.${sub.labelKey}`)}
                                {sub.counterKey && counters?.[sub.counterKey]?.count ? (
                                  <NavCounterBadge count={counters[sub.counterKey].count} />
                                ) : null}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </Fragment>
          );
        }

        const isActive = checkIsActive(item.to);
        const isLocked = item.requiredFeature && isFeatureLocked ? isFeatureLocked(item.requiredFeature) : false;

        return (
          <Fragment key={item.to}>
            {showHeading && (
              <li aria-hidden="true" className="pointer-events-none list-none">
                <span className={`${navGroupHeadingClass} group-data-[collapsible=icon]:hidden`}>
                  {t(item.groupLabelKey!)}
                </span>
              </li>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive} tooltip={translatedLabel} className={navItemButtonClass}>
                <NavLink
                  to={item.to}
                  className="flex items-center gap-2.5 w-full"
                  onMouseEnter={() => preloadRoute(item.to)}
                  onFocus={() => preloadRoute(item.to)}
                >
                  <item.icon width={32} height={32} viewBox="0 0 24 24" className="shrink-0" strokeWidth={1.5} />
                  <span className="truncate group-data-[collapsible=icon]:hidden flex-1">{translatedLabel}</span>
                  {item.counterKey && counters?.[item.counterKey]?.count ? (
                    <NavCounterBadge count={counters[item.counterKey].count} />
                  ) : null}
                  {isLocked && (
                    <span
                      data-testid="sidebar-item-lock"
                      className="ml-auto inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 group-data-[collapsible=icon]:hidden shrink-0"
                    >
                      <Lock width={32} height={32} viewBox="0 0 24 24" className="shrink-0" aria-hidden="true" />
                      <span>{t("nav.upgradeBadge", "Upgrade")}</span>
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </Fragment>
        );
      })}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { t } = useTranslation();
  const loc = useLocation();
  const {
    user,
    location,
    activeSubscriptions,
    planNameMap,
    navItems,
    checkIsActive,
    checkIsGroupActive,
    isFeatureLocked,
  } = useSidebar();

  const { data: counters } = useNavCounters();
  const markSeenMutation = useMarkNavSeen();
  useNavCounterStream();

  const markSeenForRoute = useCallback(
    (pathname: string) => {
      if (!user || !navItems.length) return;
      const flatItems = navItems.flatMap((item) => [
        ...(item.counterKey ? [{ to: item.to, counterKey: item.counterKey }] : []),
        ...(item.items ?? []).map((sub) => ({ to: sub.to, counterKey: sub.counterKey })).filter((s) => s.counterKey),
      ]);
      for (const { to, counterKey } of flatItems) {
        // Tickets destination is an actionable unread counter that must not be cleared blindly on navigation.
        // It decrements when individual tickets are opened or when the user explicitly clicks 'Mark all as read'.
        if (counterKey === "tickets") continue;

        if (pathname === to || (to !== "/dashboard" && pathname.startsWith(to))) {
          markSeenMutation.mutate(counterKey as NavKey);
          break;
        }
      }
    },
    [user, navItems, markSeenMutation],
  );

  const hasMarkedRef = useRef(false);
  useEffect(() => {
    if (!hasMarkedRef.current) {
      hasMarkedRef.current = true;
      markSeenForRoute(loc.pathname);
    }
  }, [loc.pathname, markSeenForRoute]);

  const isPublicLegalPage =
    location.pathname === "/" || location.pathname === "/terms" || location.pathname === "/privacy";

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

  useEffect(() => {
    const secondaryPreloaders = [
      routePreloaders["/tickets"],
      routePreloaders["/devices"],
      routePreloaders["/plans"],
      routePreloaders["/billing"],
    ].filter(Boolean) as Array<() => Promise<unknown>>;

    const cancel = preloadOnIdle(secondaryPreloaders, 2500);
    return cancel;
  }, []);

  return (
    <ShadcnSidebar collapsible="icon" className="border-r border-sidebar-border/50 bg-sidebar">
      <SidebarBrand logo={logoUrl} portalTitle={t("topNav.portal")} infraTitle={t("nav.infrastructure")} />

      <SidebarContent className="py-1 bg-sidebar">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarNavList
              navItems={navItems}
              checkIsActive={checkIsActive}
              checkIsGroupActive={checkIsGroupActive}
              isFeatureLocked={isFeatureLocked}
              counters={counters}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-1 bg-sidebar group-data-[collapsible=icon]:px-0">
        {user?.role === "CLIENT" &&
          groupedSubs.length > 0 &&
          !isPublicLegalPage &&
          (hasMultipleGroups ? (
            <Collapsible defaultOpen className="group/collapsible-sub">
              <SidebarMenu className="px-0">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="h-auto w-full px-1.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                      <span>{t("sidebar.subscriptions")}</span>
                      <span className="ml-auto rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[9px] font-mono font-bold tabular-nums text-muted-foreground">
                        {groupedSubs.length}
                      </span>
                      <ChevronRight
                        width={32}
                        height={32}
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        className="text-muted-foreground/50 transition-transform duration-200 group-data-[state=open]/collapsible-sub:rotate-90"
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1">
                    <div className="space-y-0 pb-0.5">
                      {groupedSubs.map((group) => (
                        <ActiveSubCard key={group[0].plan} subs={group} planNameMap={planNameMap} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </SidebarMenu>
            </Collapsible>
          ) : (
            <ActiveSubCard subs={groupedSubs[0]} planNameMap={planNameMap} />
          ))}
        {user && !isPublicLegalPage && (
          <SidebarMenu className="group-data-[collapsible=icon]:px-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={checkIsActive("/help")}
                tooltip={t("nav.help")}
                className={navItemButtonClass}
              >
                <NavLink
                  to="/help"
                  className="flex items-center gap-2.5"
                  onMouseEnter={() => preloadRoute("/help")}
                  onFocus={() => preloadRoute("/help")}
                >
                  <HelpCircle width={32} height={32} viewBox="0 0 24 24" className="shrink-0" strokeWidth={1.5} />
                  <span className="truncate group-data-[collapsible=icon]:hidden">{t("nav.help")}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
