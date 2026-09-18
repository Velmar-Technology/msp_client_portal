import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { resolvePageName } from "./pageTitle";

/**
 * Static portal brand suffix appended to the resolved page name.
 */
export const PORTAL_TITLE = "Portal";

/**
 * Keeps `document.title` in sync with the active route, formatted as
 * `"<page> - Portal"` (fallback to `"Portal"` when no route match exists).
 */
export function usePageTitle(): void {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const pageName = resolvePageName(location.pathname, t, user);
    document.title = pageName ? `${pageName} - ${PORTAL_TITLE}` : PORTAL_TITLE;
  }, [location.pathname, t, user]);
}