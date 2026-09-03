import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton } from "@/components/skeletons";
import { createPrefetchLoader } from "@/routes/routeUtils";
import { billingQueryOptions } from "./api/useBillingQueries";

const BillingPage = lazyWithRetry(() =>
  import("./pages/BillingPage").then((m) => ({ default: m.BillingPage }))
);

/**
 * Billing Domain Route Manifest (ADR-002 / ADR-003)
 */
export const billingRoutes: AppRouteObject[] = [
  {
    path: "/billing",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <BillingPage />
      </RouteSuspenseWrapper>
    ),
    loader: createPrefetchLoader(({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") || "1");
      const limit = Number(url.searchParams.get("limit") || "10");
      return billingQueryOptions.invoiceList({ page, limit });
    }),
    handle: {
      crumb: (t, _params, user) => [
        { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
        { label: t("nav.billing") },
      ],
      allowedRoles: ["CLIENT", "ADMIN"],
    },
  },
];
