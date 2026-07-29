import * as React from "react";
import { Link, useLocation, matchPath } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { routeCrumbs, type RouteCrumbConfig } from "@/components/layout/routeCrumbs";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";

export function Breadcrumbs({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  // If we are on public pages like login, register, etc., do not show breadcrumbs
  if (["/login", "/register"].includes(location.pathname)) {
    return null;
  }

  const items: Array<{ label: string; to?: string }> = [];

  // Find dynamic route match from routeCrumbs config using matchPath
  let matchedConfig: RouteCrumbConfig | null = null;
  let matchParams: Record<string, string | undefined> = {};

  for (const config of routeCrumbs) {
    const match = matchPath({ path: config.path, end: true }, location.pathname);
    if (match) {
      matchedConfig = config;
      matchParams = match.params;
      break;
    }
  }

  if (matchedConfig) {
    const result = matchedConfig.crumb(t, matchParams, user);
    if (Array.isArray(result)) {
      items.push(...result);
    } else if (result) {
      items.push(result);
    }
  }

  // Render breadcrumbs if there is a depth of at least two levels
  if (items.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
