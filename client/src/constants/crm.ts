import type { LeadStage, LeadActivity, QuotationStatus } from "@/features/crm";

export type ActivityType = LeadActivity["activity_type"];


export interface CRMStageConfig {
  key: LeadStage;
  color: string;
  border: string;
  headerBg: string;
}

export const CRM_STAGES: CRMStageConfig[] = [
  { key: "NEW", color: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", headerBg: "bg-blue-500/10" },
  {
    key: "QUALIFIED",
    color: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
    headerBg: "bg-purple-500/10",
  },
  {
    key: "PROPOSITION",
    color: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    headerBg: "bg-amber-500/10",
  },
  {
    key: "WON",
    color: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    headerBg: "bg-emerald-500/10",
  },
  { key: "LOST", color: "text-muted-foreground", border: "border-border", headerBg: "bg-muted/40" },
];

export const CRM_NEXT_STAGE: Partial<Record<LeadStage, LeadStage>> = {
  NEW: "QUALIFIED",
  QUALIFIED: "PROPOSITION",
  PROPOSITION: "WON",
};

export const CRM_VALID_STAGES: LeadStage[] = ["NEW", "QUALIFIED", "PROPOSITION", "WON", "LOST"];

export const CRM_VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export const ACTIVITY_TYPE_KEYS: Partial<Record<ActivityType, string>> = {
  EMAIL_SENT: "email",
  QUOTE_SENT: "quoteSent",
  QUOTE_REMINDER: "quoteReminder",
  QUOTE_STATUS_CHANGE: "quoteStatusChange",
  CALL: "call",
  MEETING: "meeting",
  NOTE: "note",
  STAGE_CHANGE: "stageChange",
  PLAN_ASSIGNED: "planAssigned",
  SUB_MODIFIED: "subModified",
};

export const QUOTATION_TITLE_TO_STATUS_KEY: Record<string, string> = {
  "Quotation Drafted": "draft",
  "Quotation Sent": "sent",
  "Quotation Accepted": "accepted",
  "Quotation Declined": "declined",
  "Quotation Expired": "expired",
};

export const QUOTATION_STATUS_BADGES: Record<QuotationStatus, string> = {
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  DECLINED: "bg-destructive/10 text-destructive border-destructive/20",
  SENT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  EXPIRED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  DRAFT: "bg-muted text-muted-foreground border-border",
};
