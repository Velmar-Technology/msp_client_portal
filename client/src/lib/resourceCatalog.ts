export type PlanTier = "PL-001" | "PL-002" | "PL-003";

export type ResourceCategory = "software" | "manual" | "guide" | "document";

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
}

export const PLAN_TIERS: PlanTier[] = ["PL-001", "PL-002", "PL-003"];

export const PLAN_OPTIONS: { value: PlanTier; labelKey: string }[] = [
  { value: "PL-001", labelKey: "resources.planBasic" },
  { value: "PL-002", labelKey: "resources.planStandard" },
  { value: "PL-003", labelKey: "resources.planAdvanced" },
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
    url: "/resources/msp-backup-agent-windows.exe",
    fileName: "msp-backup-agent-windows.exe",
    fileType: "EXE",
    fileSize: "48.2 MB",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "agent-macos",
    titleKey: "resources.res.agentMacos.title",
    descriptionKey: "resources.res.agentMacos.desc",
    category: "software",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "/resources/msp-backup-agent-macos.dmg",
    fileName: "msp-backup-agent-macos.dmg",
    fileType: "DMG",
    fileSize: "51.7 MB",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "agent-linux",
    titleKey: "resources.res.agentLinux.title",
    descriptionKey: "resources.res.agentLinux.desc",
    category: "software",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "/resources/msp-backup-agent-linux.deb",
    fileName: "msp-backup-agent-linux.deb",
    fileType: "DEB",
    fileSize: "39.4 MB",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "quickstart",
    titleKey: "resources.res.quickstart.title",
    descriptionKey: "resources.res.quickstart.desc",
    category: "guide",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "/resources/quickstart-activation-backup.pdf",
    fileName: "quickstart-activation-backup.pdf",
    fileType: "PDF",
    fileSize: "1.8 MB",
    updatedAt: "2026-02-02T00:00:00.000Z",
  },
  {
    id: "nextcloud-manual",
    titleKey: "resources.res.nextcloudManual.title",
    descriptionKey: "resources.res.nextcloudManual.desc",
    category: "manual",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "/resources/nextcloud-web-access-manual.pdf",
    fileName: "nextcloud-web-access-manual.pdf",
    fileType: "PDF",
    fileSize: "4.2 MB",
    updatedAt: "2026-02-10T00:00:00.000Z",
  },
  {
    id: "sla-policy",
    titleKey: "resources.res.slaPolicy.title",
    descriptionKey: "resources.res.slaPolicy.desc",
    category: "document",
    plans: ["PL-001", "PL-002", "PL-003"],
    url: "/resources/sla-response-time-policy.pdf",
    fileName: "sla-response-time-policy.pdf",
    fileType: "PDF",
    fileSize: "620 KB",
    updatedAt: "2026-01-30T00:00:00.000Z",
  },
  {
    id: "basic-handbook",
    titleKey: "resources.res.basicHandbook.title",
    descriptionKey: "resources.res.basicHandbook.desc",
    category: "document",
    plans: ["PL-001"],
    url: "/resources/basic-remote-support-handbook.pdf",
    fileName: "basic-remote-support-handbook.pdf",
    fileType: "PDF",
    fileSize: "2.1 MB",
    updatedAt: "2026-01-20T00:00:00.000Z",
  },
  {
    id: "monitoring-guide",
    titleKey: "resources.res.monitoringGuide.title",
    descriptionKey: "resources.res.monitoringGuide.desc",
    category: "guide",
    plans: ["PL-002", "PL-003"],
    url: "/resources/proactive-monitoring-dashboard-guide.pdf",
    fileName: "proactive-monitoring-dashboard-guide.pdf",
    fileType: "PDF",
    fileSize: "3.4 MB",
    updatedAt: "2026-02-05T00:00:00.000Z",
  },
  {
    id: "maintenance-guide",
    titleKey: "resources.res.maintenanceGuide.title",
    descriptionKey: "resources.res.maintenanceGuide.desc",
    category: "guide",
    plans: ["PL-002", "PL-003"],
    url: "/resources/standard-maintenance-runbook.pdf",
    fileName: "standard-maintenance-runbook.pdf",
    fileType: "PDF",
    fileSize: "2.9 MB",
    updatedAt: "2026-02-12T00:00:00.000Z",
  },
  {
    id: "network-manual",
    titleKey: "resources.res.networkManual.title",
    descriptionKey: "resources.res.networkManual.desc",
    category: "manual",
    plans: ["PL-003"],
    url: "/resources/network-monitoring-setup-manual.pdf",
    fileName: "network-monitoring-setup-manual.pdf",
    fileType: "PDF",
    fileSize: "5.6 MB",
    updatedAt: "2026-02-18T00:00:00.000Z",
  },
  {
    id: "security-whitepaper",
    titleKey: "resources.res.securityWhitepaper.title",
    descriptionKey: "resources.res.securityWhitepaper.desc",
    category: "document",
    plans: ["PL-003"],
    url: "/resources/security-vcio-review-whitepaper.pdf",
    fileName: "security-vcio-review-whitepaper.pdf",
    fileType: "PDF",
    fileSize: "4.8 MB",
    updatedAt: "2026-02-20T00:00:00.000Z",
  },
];
