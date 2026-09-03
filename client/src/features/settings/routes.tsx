import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { FEATURE_CODES } from "@/constants/subscriptions";

const ProfilePage = lazyWithRetry(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const NotificationPreferencesPage = lazyWithRetry(() =>
  import("./pages/NotificationPreferencesPage").then((m) => ({
    default: m.NotificationPreferencesPage,
  }))
);
const PasswordManagerPage = lazyWithRetry(() =>
  import("./pages/PasswordManagerPage").then((m) => ({ default: m.PasswordManagerPage }))
);
const HelpPage = lazyWithRetry(() =>
  import("@/routes/_app/help").then((m) => ({ default: m.HelpPage || m.default }))
);

/**
 * Settings & Preferences Domain Route Manifest (ADR-002 / ADR-003)
 */
export const settingsRoutes: AppRouteObject[] = [
  {
    path: "/profile",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ProfilePage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t, _params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.profile") },
      ],
    },
  },
  {
    path: "/notifications/preferences",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <NotificationPreferencesPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t, _params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.notificationPreferences") },
      ],
    },
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
    path: "/help",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <HelpPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.help"), to: "/help" }),
    },
  },
];
