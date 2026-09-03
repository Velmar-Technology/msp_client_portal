import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";
import { createPrefetchLoader } from "@/routes/routeUtils";
import { subscriptionQueryOptions } from "./api/useSubscriptionQueries";

const PlansPage = lazyWithRetry(() =>
  import("./pages/PlansPage").then((m) => ({ default: m.PlansPage }))
);
const PlanEditorPage = lazyWithRetry(() =>
  import("./pages/PlanEditorPage").then((m) => ({ default: m.PlanEditorPage }))
);

/**
 * Subscriptions & Plans Domain Route Manifest (ADR-002 / ADR-003)
 */
export const subscriptionRoutes: AppRouteObject[] = [
  {
    path: "/plans",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PlansPage />
      </RouteSuspenseWrapper>
    ),
    loader: createPrefetchLoader(() => subscriptionQueryOptions.plans()),
    handle: {
      crumb: (t, _params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.plans"), to: "/plans" },
      ],
      allowedRoles: ["CLIENT", "ADMIN"],
    },
  },
  {
    path: "/plans/new",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PlanEditorPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t, _params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.plans"), to: "/plans" },
        { label: t("plans.addNewPlan") },
      ],
      allowedRoles: ["ADMIN"],
    },
  },
  {
    path: "/plans/:id/edit",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <PlanEditorPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t, params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.plans"), to: "/plans" },
        { label: t("plans.editPlanTitle", { id: params?.id || "" }) },
      ],
      allowedRoles: ["ADMIN"],
    },
  },
];
