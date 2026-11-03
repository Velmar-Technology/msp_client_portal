import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";

const SettingsHubPage = lazyWithRetry(() =>
  import("./pages/SettingsHubPage").then((m) => ({ default: m.SettingsHubPage }))
);

/**
 * Base Settings Domain Route Manifest (ADR-016 / ADR-017 / ADR-019).
 * Unifies profile, workspace, notifications, and AI settings under a single hub.
 *
 * @see ADR-016
 * @see ADR-017
 * @see ADR-019
 */
export const settingsRoutes: AppRouteObject[] = [
  {
    path: "/settings",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <SettingsHubPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.settings", { defaultValue: "Settings" }), to: "/settings" }),
      requiredPermission: "settings:read",
    },
  },
  {
    path: "/profile",
    element: <Navigate to="/settings?tab=profile" replace />,
  },
  {
    path: "/notifications/preferences",
    element: <Navigate to="/settings?tab=notifications" replace />,
  },
];
