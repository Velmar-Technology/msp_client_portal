import { useMemo } from "react";
import { useLocation, Link, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs, type RouteCrumb } from "@/components/layout/routeCrumbs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Dynamic Breadcrumbs component for the TopNav header.
 * Computes trail based on current location and `routeCrumbs` configuration.
 * Always anchors at 'Home'. Intermediate crumbs remain muted with hover state;
 * active leaf page receives bold foreground contrast.
 *
 * @returns JSX.Element
 */
export function TopNavBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();

  const homePath = user ? (user.role === "TECHNICIAN" ? "/tech/dashboard" : "/dashboard") : "/";

  const crumbs = useMemo<RouteCrumb[]>(() => {
    const pathname = location.pathname;

    // Default root anchor
    const list: RouteCrumb[] = [{ label: t("topNav.home"), to: homePath }];

    if (pathname === "/" || pathname === "/dashboard" || pathname === "/tech/dashboard") {
      return list;
    }

    for (const config of routeCrumbs) {
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
  }, [location.pathname, t, user, homePath]);

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
