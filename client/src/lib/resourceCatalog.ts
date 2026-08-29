export type {
  PlanTier,
  ResourceCategory,
  OperatingSystem,
  OsFilter,
  ResourceItem,
} from "@/constants/resources";

export {
  PLAN_TIERS,
  PLAN_OPTIONS,
  OS_OPTIONS,
  LEGACY_PLAN_MAP,
  RESOURCE_CATALOG,
  RESOURCE_CATEGORY_ICONS,
} from "@/constants/resources";

import {
  type PlanTier,
  type OsFilter,
  type ResourceItem,
  PLAN_TIERS,
  LEGACY_PLAN_MAP,
} from "@/constants/resources";

/**
 * Normalizes a raw plan string into a valid PlanTier enum, accounting for legacy plan aliases.
 *
 * @param plan - Raw plan string identifier from database, subscription, or URL state.
 * @returns Normalized `PlanTier` value or `null` if unrecognized.
 */
export function normalizePlan(plan: string | null | undefined): PlanTier | null {
  if (!plan) return null;
  const upper = plan.toUpperCase();
  if ((PLAN_TIERS as string[]).includes(upper)) return upper as PlanTier;
  return LEGACY_PLAN_MAP[upper] || null;
}

/**
 * Filters the resource catalog items by the user's active subscription plans.
 *
 * @param catalog - List of downloadable resource items.
 * @param planIds - Array of active plan tiers the user has access to.
 * @param showAll - Flag to bypass plan filtering and return all resources.
 * @returns Filtered subset of resource items matching user permissions.
 */
export function filterResourcesByPlan(
  catalog: ResourceItem[],
  planIds: PlanTier[],
  showAll = false
): ResourceItem[] {
  if (showAll || planIds.length === 0) return catalog;
  const allowed = new Set(planIds);
  return catalog.filter(
    (resource) =>
      !resource.plans ||
      resource.plans.length === 0 ||
      resource.plans.some((plan) => allowed.has(plan))
  );
}

/**
 * Filters the resource catalog items by the target operating system.
 *
 * @param catalog - List of downloadable resource items.
 * @param osFilter - Selected operating system filter ('ALL' | 'WINDOWS' | 'MACOS' | 'LINUX').
 * @returns Filtered subset of resource items targeting the specified OS.
 */
export function filterResourcesByOs(
  catalog: ResourceItem[],
  osFilter: OsFilter
): ResourceItem[] {
  if (osFilter === "ALL") return catalog;
  return catalog.filter((resource) => {
    if (!resource.os || resource.os.length === 0) return true;
    return resource.os.includes(osFilter);
  });
}

/**
 * Triggers a browser download for a designated resource catalog item.
 *
 * @param item - Resource item containing target download URL and default filename.
 * @returns void
 */
export function triggerResourceDownload(item: ResourceItem): void {
  const link = document.createElement("a");
  link.href = item.url;
  link.download = item.fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
