import type { AppRouteObject } from "@/routes/types";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, TablePageSkeleton, DetailSkeleton } from "@/components/skeletons";
import { createPrefetchLoader, createEnsureDataLoader } from "@/routes/routeUtils";
import { ticketQueryOptions } from "./api/useTicketQueries";

const TicketsPage = lazyWithRetry(() =>
  import("./pages/TicketsPage").then((m) => ({ default: m.TicketsPage }))
);
const TicketDetailPage = lazyWithRetry(() =>
  import("./pages/TicketDetailPage").then((m) => ({ default: m.TicketDetailPage }))
);

/**
 * Helpdesk Tickets Sub-Module Route Manifest (ADR-017).
 * Paths are relative to parent 'helpdesk' ('/helpdesk/tickets' & '/helpdesk/tickets/:id').
 */
export const ticketRoutes: AppRouteObject[] = [
  {
    path: "tickets",
    element: (
      <RouteSuspenseWrapper fallback={<TablePageSkeleton />}>
        <TicketsPage />
      </RouteSuspenseWrapper>
    ),
    loader: createPrefetchLoader(({ request }) => {
      const url = new URL(request.url);
      const filters = Object.fromEntries(url.searchParams.entries());
      return ticketQueryOptions.list(filters);
    }),
    handle: {
      crumb: (t, _params, user) => [
        { label: t("nav.helpdesk", { defaultValue: "Helpdesk" }), to: "/helpdesk/tickets" },
        {
          label: user?.role === "ADMIN" ? t("nav.allTickets") : t("nav.myTickets"),
          to: "/helpdesk/tickets",
        },
      ],
      requiredPermission: ["helpdesk:tickets:read", "tickets:read"],
    },
  },
  {
    path: "tickets/:id",
    element: (
      <RouteSuspenseWrapper fallback={<DetailSkeleton />}>
        <TicketDetailPage />
      </RouteSuspenseWrapper>
    ),
    loader: createEnsureDataLoader(({ params }) => {
      return ticketQueryOptions.detail(params.id || "");
    }),
    handle: {
      crumb: (t, params, user) => [
        { label: t("nav.helpdesk", { defaultValue: "Helpdesk" }), to: "/helpdesk/tickets" },
        {
          label: user?.role === "ADMIN" ? t("nav.allTickets") : t("nav.myTickets"),
          to: "/helpdesk/tickets",
        },
        {
          label: `${t("ticketDetail.ticketId")} #${params?.id?.substring(0, 8) || ""}`,
        },
      ],
      requiredPermission: ["helpdesk:tickets:read", "tickets:read"],
    },
  },
];
