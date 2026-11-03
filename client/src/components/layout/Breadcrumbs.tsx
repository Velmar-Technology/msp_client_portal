/**
 * Legacy In-Page Breadcrumbs Component.
 *
 * Breadcrumbs have been unified globally into the sticky TopNav header
 * (`TopNavBreadcrumbs`). In-page breadcrumbs return null to eliminate
 * redundant duplicate breadcrumb trails across portal pages while
 * preserving backward-compatibility for compounds like `<Page.Breadcrumbs />`.
 *
 * @returns null
 */
export function Breadcrumbs(_props?: { className?: string }) {
  return null;
}
