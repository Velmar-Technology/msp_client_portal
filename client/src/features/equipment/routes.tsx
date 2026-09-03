import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton, ContentPageSkeleton } from "@/components/skeletons";
import { createPrefetchLoader } from "@/routes/routeUtils";
import { equipmentQueryOptions } from "./api/useEquipmentQueries";
import { FEATURE_CODES } from "@/constants/subscriptions";

const DevicesPage = lazyWithRetry(() =>
  import("./pages/DevicesPage").then((m) => ({ default: m.DevicesPage }))
);
const ResourcesPage = lazyWithRetry(() =>
  import("@/routes/_app/resources").then((m) => ({ default: m.ResourcesPage || m.default }))
);

/**
 * Equipment & Devices Domain Route Manifest (ADR-002 / ADR-003)
 */
export const equipmentRoutes: AppRouteObject[] = [
  {
    path: "/devices",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <DevicesPage />
      </RouteSuspenseWrapper>
    ),
    loader: createPrefetchLoader(() => equipmentQueryOptions.myDevices()),
    handle: {
      crumb: (t) => ({ label: t("nav.devices"), to: "/devices" }),
      allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
      requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT,
    },
  },
  {
    path: "/rmm",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <DevicesPage />
      </RouteSuspenseWrapper>
    ),
    loader: createPrefetchLoader(() => equipmentQueryOptions.myDevices()),
    handle: {
      crumb: (t) => ({ label: t("nav.devices"), to: "/rmm" }),
      allowedRoles: ["CLIENT", "ADMIN", "TECHNICIAN"],
      requiredFeature: FEATURE_CODES.RMM_PATCH_MANAGEMENT,
    },
  },
  {
    path: "/resources",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <ResourcesPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => ({ label: t("nav.resources"), to: "/resources" }),
      allowedRoles: ["CLIENT", "ADMIN"],
      requiredFeature: FEATURE_CODES.CLOUD_STORAGE,
    },
  },
];
