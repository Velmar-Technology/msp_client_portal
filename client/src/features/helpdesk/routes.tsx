import { Navigate } from "react-router-dom";
import type { AppRouteObject } from "@/routes/types";

/**
 * Parent Helpdesk Route Manifest (ADR-017).
 * Child sub-modules ('helpdesk.tickets' & 'helpdesk.kb') automatically nest under '/helpdesk'.
 */
export const helpdeskRoutes: AppRouteObject[] = [
  {
    path: "/helpdesk",
    children: [
      {
        index: true,
        element: <Navigate to="/helpdesk/tickets" replace />,
      },
    ],
  },
];
