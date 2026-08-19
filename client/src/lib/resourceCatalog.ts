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

export const RESOURCE_CATALOG: ResourceItem[] = [
  {
    id: "agent-win",
    titleKey: "Nextcloud Desktop Client",
    descriptionKey: "Download the latest version of Nextcloud Desktop Client for Windows.",
    category: "software",
    plans: [],
    url: "https://github.com/nextcloud-releases/desktop/releases/download/v34.0.1/Nextcloud-34.0.1-x64.msi",
    fileName: "Nextcloud-34.0.0-x64.msi",
    fileType: "MSI",
    fileSize: "148.5 MB",
    updatedAt: "2026-08-18T00:00:00.000Z",
    os: ["windows"],
  },
  {
    id: "remote-win",
    titleKey: "Rustdesk Desktop Client",
    descriptionKey: "Download the latest version of Remote Desktop Client.",
    category: "software",
    plans: [],
    url: "https://github.com/rustdesk/rustdesk/releases/download/1.4.9/rustdesk-1.4.9-x86_64.msi",
    fileName: "rustdesk-1.4.9-x86_64.msi",
    fileType: "MSI",
    fileSize: "23.6 MB",
    updatedAt: "2026-08-18T00:00:00.000Z",
    os: ["windows"],
  },
  {
    id:"rmm-agent-win",
    titleKey: "RMM Agent",
    descriptionKey: "Download the latest version of RMM Agent.",
    category: "software",
    plans: [],
    url: "https://cdn.zabbix.com/zabbix/binaries/stable/6.0/6.0.48/zabbix_agent2-6.0.48-windows-amd64-openssl.msi",
    fileName: "zabbix_agent2-6.0.48-windows-amd64-openssl.msi",
    fileType: "MSI",
    fileSize: "26.7 MB",
    updatedAt: "2026-08-18T00:00:00.000Z",
    os: ["windows"],
  }

];
