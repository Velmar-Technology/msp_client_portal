import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";

export function Breadcrumbs({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  // If we are on public pages like login, register, etc., do not show breadcrumbs
  if (["/login", "/register"].includes(location.pathname)) {
    return null;
  }

  const pathnames = location.pathname.split("/").filter((x) => x);

  // Determine starting dashboard page based on user role
  let dashboardPath = "/dashboard";
  let dashboardLabel = t("nav.dashboard");

  if (user?.role === "ADMIN") {
    dashboardPath = "/admin/dashboard";
    dashboardLabel = t("nav.adminDashboard");
  } else if (user?.role === "TECHNICIAN") {
    dashboardPath = "/tech/dashboard";
    dashboardLabel = t("nav.dashboard");
  }

  const items: Array<{ label: string; to?: string }> = [];

  // Always start with Dashboard
  items.push({ label: dashboardLabel, to: dashboardPath });

  let currentLink = "";

  for (let i = 0; i < pathnames.length; i++) {
    const segment = pathnames[i];

    // Skip nested route identifiers that correspond to the root dashboards
    if ((segment === "admin" || segment === "tech") && pathnames[i + 1] === "dashboard") {
      continue;
    }
    if (segment === "dashboard" && (pathnames[i - 1] === "admin" || pathnames[i - 1] === "tech")) {
      continue;
    }

    currentLink += `/${segment}`;

    // Skip duplicating the dashboard link
    if (currentLink === dashboardPath) {
      continue;
    }

    let label = segment;
    let isClickable = true;

    // Check if it is a ticket detail route (e.g. tickets/:id)
    const isTicketId = pathnames[i - 1] === "tickets";
    if (isTicketId) {
      // Use "Ticket ID" or format nicely
      label = `${t("ticketDetail.ticketId")} #${segment.substring(0, 8)}`;
      isClickable = false; // Leaf node
    } else {
      const translationKey = `nav.${segment}`;
      const footerKey = `footer.${segment}`;

      if (i18n.exists(translationKey)) {
        label = t(translationKey);
      } else if (i18n.exists(footerKey)) {
        label = t(footerKey);
      } else {
        // Fallback capitalization
        label = segment.charAt(0).toUpperCase() + segment.slice(1);
      }
    }

    items.push({
      label,
      to: isClickable ? currentLink : undefined,
    });
  }

  // Render breadcrumbs if there is a depth of at least one subpage
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
