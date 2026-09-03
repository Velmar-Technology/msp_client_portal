import type { RouteObject } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { RouteSuspenseWrapper, ContentPageSkeleton } from "@/components/skeletons";

const HomePage = lazyWithRetry(() =>
  import("@/routes/_public/index").then((m) => ({ default: m.HomePage || m.default }))
);
const TermsPage = lazyWithRetry(() =>
  import("@/routes/_public/terms").then((m) => ({ default: m.TermsPage || m.default }))
);
const PrivacyPage = lazyWithRetry(() =>
  import("@/routes/_public/privacy").then((m) => ({ default: m.PrivacyPage || m.default }))
);

/**
 * Public Informational Routes (Landing, Terms, Privacy)
 */
export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        element: (
          <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
            <HomePage />
          </RouteSuspenseWrapper>
        ),
      },
      {
        path: "/terms",
        element: (
          <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
            <TermsPage />
          </RouteSuspenseWrapper>
        ),
      },
      {
        path: "/privacy",
        element: (
          <RouteSuspenseWrapper fallback={<ContentPageSkeleton />}>
            <PrivacyPage />
          </RouteSuspenseWrapper>
        ),
      },
    ],
  },
];
