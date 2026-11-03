import { useMemo } from "react";
import { useLocation, Link, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs, type RouteCrumb, type RouteCrumbConfig } from "@/components/layout/routeCrumbs";
import { getDiscoveredFeatureRoutes } from "@/routes/featureRegistry";
import type { AppRouteObject } from "@/routes/types";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Recursively extracts breadcrumb configurations from auto-discovered feature routes.
 */
function collectFeatureRouteCrumbs(
  routes: AppRouteObject[],
  parentPath = ""
): RouteCrumbConfig[] {
  const configs: RouteCrumbConfig[] = [];
  for (const route of routes) {
    const rawPath = route.path ?? "";
    const fullPath = rawPath.startsWith("/")
      ? rawPath
      : parentPath
        ? `${parentPath.replace(/\/+$/, "")}/${rawPath}`
        : `/${rawPath}`;

    if (route.handle?.crumb && fullPath) {
      configs.push({
        path: fullPath,
        crumb: route.handle.crumb,
      });
    }
    if (route.children?.length) {
      configs.push(...collectFeatureRouteCrumbs(route.children, fullPath));
    }
  }
  return configs;
}

/**
 * Dynamic Breadcrumbs component for the TopNav header.
 * Computes trail based on current location across both static `routeCrumbs`
 * and auto-discovered hierarchical feature manifests (`ADR-017`).
 *
 * @returns JSX.Element
 */
export function TopNavBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  const homePath = user ? (user.role === "TECHNICIAN" ? "/tech/dashboard" : "/dashboard") : "/";

  const allCrumbConfigs = useMemo<RouteCrumbConfig[]>(() => {
    const discovered = collectFeatureRouteCrumbs(getDiscoveredFeatureRoutes());
    return [...routeCrumbs, ...discovered];
  }, []);

  const crumbs = useMemo<RouteCrumb[]>(() => {
    const pathname = location.pathname;

    // Default root anchor
    const list: RouteCrumb[] = [{ label: t("topNav.home"), to: homePath }];

    if (pathname === "/" || pathname === "/dashboard" || pathname === "/tech/dashboard") {
      return list;
    }

    for (const config of allCrumbConfigs) {
      const match = matchPath({ path: config.path, end: true }, pathname);
      if (match) {
        const resolved = config.crumb(t, match.params, user);
        const resolvedList = Array.isArray(resolved) ? resolved : [resolved];
        return [...list, ...resolvedList];
      }
    }

    // Fallback: derive single crumb from last path segment if not explicitly mapped
    const segment = pathname.split("/").filter(Boolean).pop();
    if (segment) {
      const formatted = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
      list.push({ label: formatted });
    }

    return list;
  }, [location.pathname, t, user, homePath, allCrumbConfigs]);

  return (
    <Breadcrumb className="hidden sm:flex items-center">
      <BreadcrumbList className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-semibold text-foreground text-xs">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : crumb.to ? (
                  <BreadcrumbLink asChild className="text-muted-foreground hover:text-foreground font-normal transition-colors text-xs">
                    <Link to={crumb.to}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground hover:text-foreground font-normal transition-colors text-xs cursor-default">
                    {crumb.label}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="size-3 text-muted-foreground/50" />}
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
