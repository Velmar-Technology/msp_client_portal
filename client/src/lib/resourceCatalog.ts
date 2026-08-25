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

export function normalizePlan(plan: string | null | undefined): PlanTier | null {
  if (!plan) return null;
  const upper = plan.toUpperCase();
  if ((PLAN_TIERS as string[]).includes(upper)) return upper as PlanTier;
  return LEGACY_PLAN_MAP[upper] || null;
}

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

export function triggerResourceDownload(item: ResourceItem): void {
  const link = document.createElement("a");
  link.href = item.url;
  link.download = item.fileName;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
