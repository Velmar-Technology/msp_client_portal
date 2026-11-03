import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";

const KbPage = lazyWithRetry(() =>
  import("./pages/KbPage").then((m) => ({ default: m.KbPage }))
);

/**
 * Helpdesk Knowledge Base Sub-Module Route Manifest (ADR-017).
 * Path 'kb' resolves under parent 'helpdesk' to '/helpdesk/kb'.
 */
export const kbRoutes: AppRouteObject[] = [
  {
    path: "kb",
    element: (
      <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
        <KbPage />
      </RouteSuspenseWrapper>
    ),
    handle: {
      crumb: (t) => [
        { label: t("nav.helpdesk", { defaultValue: "Helpdesk" }), to: "/helpdesk/tickets" },
        { label: t("nav.help"), to: "/helpdesk/kb" },
      ],
      allowedRoles: ["CLIENT", "TECHNICIAN", "ADMIN"],
      requiredPermission: ["helpdesk:kb:read", "tickets:read"],
    },
  },
];
