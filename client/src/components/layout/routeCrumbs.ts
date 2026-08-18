export interface RouteCrumb {
  label: string;
  to?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CrumbResolver = (t: any, params: any, user: any) => RouteCrumb | RouteCrumb[];

export interface RouteCrumbConfig {
  path: string;
  crumb: CrumbResolver;
}

export const routeCrumbs: RouteCrumbConfig[] = [
  {
    path: "/financial",
    crumb: (t) => ({ label: t("nav.financial"), to: "/financial" }),
  },
  {
    path: "/plans",
    crumb: (t, _params, user) => [
      { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
      { label: t("nav.plans") },
    ],
  },
  {
    path: "/billing",
    crumb: (t, _params, user) => [
      { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
      { label: t("nav.billing") },
    ],
  },
  {
    path: "/devices",
    crumb: (t) => ({ label: t("nav.devices"), to: "/devices" }),
  },
  {
    path: "/resources",
    crumb: (t) => ({ label: t("nav.resources"), to: "/resources" }),
  },
  {
    path: "/maintenance",
    crumb: (t) => ({ label: t("nav.maintenance"), to: "/maintenance" }),
  },

  {
    path: "/admin/users",
    crumb: (t) => ({ label: t("nav.userManagement"), to: "/admin/users" }),
  },
  {
    path: "/admin/api-status",
    crumb: (t) => ({ label: t("nav.apiStatus"), to: "/admin/api-status" }),
  },
  {
    path: "/tickets",
    crumb: (t, _params, user) => ({
      label: user?.role === "ADMIN" ? t("nav.allTickets") : t("nav.myTickets"),
      to: "/tickets",
    }),
  },
  {
    path: "/tickets/:id",
    crumb: (t, params, user) => [
      {
        label: user?.role === "ADMIN" ? t("nav.allTickets") : t("nav.myTickets"),
        to: "/tickets",
      },
      {
        label: `${t("ticketDetail.ticketId")} #${params?.id?.substring(0, 8) || ""}`,
      },
    ],
  },
  {
    path: "/profile",
    crumb: (t, _params, user) => [
      { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
      { label: t("nav.profile") },
    ],
  },
  {
    path: "/notifications/preferences",
    crumb: (t, _params, user) => [
      { label: user?.role === "ADMIN" ? t("nav.settings") : t("nav.account") },
      { label: t("nav.notificationPreferences") },
    ],
  },
  {
    path: "/help",
    crumb: (t) => ({ label: t("nav.help"), to: "/help" }),
  },
  {
    path: "/terms",
    crumb: (t) => ({ label: t("footer.terms"), to: "/terms" }),
  },
  {
    path: "/privacy",
    crumb: (t) => ({ label: t("footer.privacy"), to: "/privacy" }),
  },
];
