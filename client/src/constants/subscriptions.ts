/**
 * Subscription & Plan Constants
 */

export const PLAN_CLIENT_TYPES = ["CLIENT", "ENTERPRISE", "STUDENT", "OTHER"] as const;
export type PlanClientType = (typeof PLAN_CLIENT_TYPES)[number];

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  EXPIRING: "bg-secondary text-secondary-foreground border-border",
  EXPIRED: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};
