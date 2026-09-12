import type React from "react";
import { Package, BookOpen, Compass, FileText } from "lucide-react";

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

export const LEGACY_PLAN_MAP: Record<string, PlanTier> = {
  BASIC: "PL-001",
  STANDARD: "PL-002",
  PREMIUM: "PL-003",
  ADVANCED: "PL-003",
};

export const RESOURCE_CATEGORY_ICONS: Record<ResourceCategory, React.ComponentType<{ className?: string }>> = {
  software: Package,
  manual: BookOpen,
  guide: Compass,
  document: FileText,
};

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
    id: "rmm-agent-win",
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
  },
  {
    id: "msp-endpoint-suite",
    titleKey: "MSP Endpoint Suite",
    descriptionKey: "Unified Windows Endpoint Agent & Desktop Assistant (Intune/GPO compatible MSI bundle).",
    category: "software",
    plans: [],
    url: "/uploads/binaries/msp-endpoint-suite.msi",
    fileName: "msp-endpoint-suite.msi",
    fileType: "MSI",
    fileSize: "3.5 MB",
    updatedAt: "2026-09-12T00:00:00.000Z",
    os: ["windows"],
  },
];
