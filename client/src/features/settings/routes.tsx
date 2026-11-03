import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { FEATURE_CODES } from "@/constants/subscriptions";

const PasswordManagerPage = lazyWithRetry(() =>
  import("./pages/PasswordManagerPage").then((m) => ({ default: m.PasswordManagerPage }))
);
const ByokSettingsPage = lazyWithRetry(() =>
  import("./pages/ByokSettingsPage").then((m) => ({ default: m.ByokSettingsPage }))
);

/**
 * Settings & Preferences Domain Route Manifest (ADR-002 / ADR-003)
 */
export const settingsRoutes: AppRouteObject[] = [
  {
    path: "/profile",
    element: <Navigate to="/settings?tab=profile" replace />,
  },
  {
    path: "/notifications/preferences",
    element: <Navigate to="/settings?tab=notifications" replace />,
  },
  {
    path: "/password-manager",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PasswordManagerPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.passwordManager", { defaultValue: "Password Manager" }), to: "/password-manager" }),
      allowedRoles: ["CLIENT", "ADMIN"],
      requiredFeature: FEATURE_CODES.PASSWORD_MANAGER,
    },
  },
  {
    path: "/settings/ai",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ByokSettingsPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.cafAiSettings", { defaultValue: "IA & Calidad CAF" }), to: "/settings/ai" }),
      allowedRoles: ["CLIENT", "ADMIN"],
      requiredFeature: FEATURE_CODES.CAF_EDUCATION_AGENT,
    },
  },
];
