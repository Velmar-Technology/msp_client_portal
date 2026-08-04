export type PlanTier = "PL-001" | "PL-002" | "PL-003";

export type ResourceCategory = "software" | "manual" | "guide" | "document";

export type OperatingSystem = "windows" | "macos" | "linux";

export type OsFilter = OperatingSystem | "ALL";

export interface ResourceItem {
  id: string;
  titleKey: string;
  descriptionKey: string;
  category: ResourceCategory;
  plans: PlanTier[];
  url: string;
  fileName: string;
  fileType: string;
  fileSize: string;
  updatedAt: string;
  os?: OperatingSystem[];
}

export const PLAN_TIERS: PlanTier[] = ["PL-001", "PL-002", "PL-003"];

export const PLAN_OPTIONS: { value: PlanTier; labelKey: string }[] = [
  { value: "PL-001", labelKey: "resources.planBasic" },
  { value: "PL-002", labelKey: "resources.planStandard" },
  { value: "PL-003", labelKey: "resources.planAdvanced" },
];

export const OS_OPTIONS: { value: OsFilter; labelKey: string }[] = [
  { value: "ALL", labelKey: "resources.allOs" },
  { value: "windows", labelKey: "resources.os.windows" },
  { value: "macos", labelKey: "resources.os.macos" },
  { value: "linux", labelKey: "resources.os.linux" },
];

const LEGACY_PLAN_MAP: Record<string, PlanTier> = {
  BASIC: "PL-001",
  STANDARD: "PL-002",
  PREMIUM: "PL-003",
  ADVANCED: "PL-003",
};

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
  return catalog.filter((resource) => resource.plans.some((plan) => allowed.has(plan)));
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

export const RESOURCE_CATALOG: ResourceItem[] = [
  {
    id: "agent-win",
    titleKey: "resources.res.agentWin.title",
    descriptionKey: "resources.res.agentWin.desc",
    category: "software",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "https://github.com/nextcloud-releases/desktop/releases/download/v34.0.0/Nextcloud-34.0.0-x64.msi",
    fileName: "Nextcloud-34.0.0-x64.msi",
    fileType: "MSI",
    fileSize: "148.5 MB",
    updatedAt: "2026-08-04T00:00:00.000Z",
    os: ["windows"],
  },
  // {
  //   id: "basic-handbook",
  //   titleKey: "resources.res.basicHandbook.title",
  //   descriptionKey: "resources.res.basicHandbook.desc",
  //   category: "document",
  //   plans: ["PL-001"],
  //   url: "/resources/basic-remote-support-handbook.pdf",
  //   fileName: "basic-remote-support-handbook.pdf",
  //   fileType: "PDF",
  //   fileSize: "2.1 MB",
  //   updatedAt: "2026-01-20T00:00:00.000Z",
  // },
  // {
  //   id: "monitoring-guide",
  //   titleKey: "resources.res.monitoringGuide.title",
  //   descriptionKey: "resources.res.monitoringGuide.desc",
  //   category: "guide",
  //   plans: ["PL-002", "PL-003"],
  //   url: "/resources/proactive-monitoring-dashboard-guide.pdf",
  //   fileName: "proactive-monitoring-dashboard-guide.pdf",
  //   fileType: "PDF",
  //   fileSize: "3.4 MB",
  //   updatedAt: "2026-02-05T00:00:00.000Z",
  // },
  // {
  //   id: "maintenance-guide",
  //   titleKey: "resources.res.maintenanceGuide.title",
  //   descriptionKey: "resources.res.maintenanceGuide.desc",
  //   category: "guide",
  //   plans: ["PL-002", "PL-003"],
  //   url: "/resources/standard-maintenance-runbook.pdf",
  //   fileName: "standard-maintenance-runbook.pdf",
  //   fileType: "PDF",
  //   fileSize: "2.9 MB",
  //   updatedAt: "2026-02-12T00:00:00.000Z",
  // },
  // {
  //   id: "network-manual",
  //   titleKey: "resources.res.networkManual.title",
  //   descriptionKey: "resources.res.networkManual.desc",
  //   category: "manual",
  //   plans: ["PL-003"],
  //   url: "/resources/network-monitoring-setup-manual.pdf",
  //   fileName: "network-monitoring-setup-manual.pdf",
  //   fileType: "PDF",
  //   fileSize: "5.6 MB",
  //   updatedAt: "2026-02-18T00:00:00.000Z",
  // },
  // {
  //   id: "security-whitepaper",
  //   titleKey: "resources.res.securityWhitepaper.title",
  //   descriptionKey: "resources.res.securityWhitepaper.desc",
  //   category: "document",
  //   plans: ["PL-003"],
  //   url: "/resources/security-vcio-review-whitepaper.pdf",
  //   fileName: "security-vcio-review-whitepaper.pdf",
  //   fileType: "PDF",
  //   fileSize: "4.8 MB",
  //   updatedAt: "2026-02-20T00:00:00.000Z",
  // },
];
