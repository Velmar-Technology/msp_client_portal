import { matchPath } from "react-router-dom";
import { routeCrumbs, type CrumbResolver } from "@/components/layout/routeCrumbs";

/**
 * i18next-compatible translating function signature.
 */
type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/**
 * Current portal user shape consumed when resolving role-conditional titles.
 */
type TitleUser = { role?: string } | null;

/**
 * Title overrides for routes not covered by the breadcrumb config.
 */
const PAGE_TITLE_OVERRIDES: Array<{ path: string; title: CrumbResolver }> = [
  { path: "/", title: (t) => ({ label: t("home.title") }) },
  { path: "/login", title: (t) => ({ label: t("login.signIn") }) },
  { path: "/register", title: (t) => ({ label: t("home.register") }) },
  { path: "/dashboard", title: (t) => ({ label: t("nav.dashboard") }) },
  { path: "/tech/dashboard", title: (t) => ({ label: t("nav.dashboard") }) },
];

/**
 * Resolves the current page name for a pathname by reusing the breadcrumb
 * resolvers (`routeCrumbs`) so the browser tab stays consistent with the
 * visible breadcrumb UI, with overrides for routes breadcrumbs don't cover.
 *
 * @param pathname - Current `location.pathname` to resolve a title for.
 * @param t - i18next translate function used by crumb resolvers.
 * @param user - Current authenticated user (nullable), used for role-based labels.
 * @returns The resolved page name, or `null` when no config matches.
 */
export function resolvePageName(pathname: string, t: TranslateFn, user: TitleUser = null): string | null {
  const resolve = (configs: Array<{ path: string; title: CrumbResolver }>) => {
    for (const config of configs) {
      const match = matchPath({ path: config.path, end: true }, pathname);
      if (match) {
        const crumbs = config.title(t, match.params, user);
        const leaf = Array.isArray(crumbs) ? crumbs[crumbs.length - 1] : crumbs;
        return leaf?.label ?? null;
      }
    }
    return null;
  };

  const override = resolve(PAGE_TITLE_OVERRIDES);
  if (override) {
    return override;
  }

  return resolve(routeCrumbs.map(({ path, crumb }) => ({ path, title: crumb })));
}