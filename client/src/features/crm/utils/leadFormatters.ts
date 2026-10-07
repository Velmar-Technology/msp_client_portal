import type { Plan } from "@/features/subscriptions";
import type { Lead } from "../api/crmService";

/**
 * Color mappings for CRM lead client types.
 * Aligns with MSP portal design system and Tailwind tokens.
 */
export const CLIENT_TYPE_STYLES: Record<string, string> = {
  EDUCATOR: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  ENTERPRISE: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  STUDENT: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  OTHER: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
};

/**
 * Returns Tailwind CSS class string for client type badge.
 *
 * @param type - Client type string
 * @returns Tailwind CSS class string
 */
export function getClientTypeBadgeClass(type?: string | null): string {
  if (!type) return "bg-muted text-muted-foreground border-border";
  return CLIENT_TYPE_STYLES[type] || "bg-muted text-muted-foreground border-border";
}

/**
 * Resolves the localized display label for client type badge.
 *
 * @param type - Client type code (e.g. EDUCATOR, ENTERPRISE)
 * @param t - i18next translation function
 * @returns Localized label (e.g. "DOCENTE" / "EDUCATOR")
 */
export function getClientTypeBadgeLabel(
  type: string | undefined | null,
  t: (key: string, options?: any) => string
): string {
  if (!type) return "";
  return t(`crm.clientTypeBadges.${type}`, type);
}

/**
 * Resolves localized plan name for a lead using available plan catalog and current locale.
 *
 * @param lead - Lead entity
 * @param plans - List of catalog plans
 * @param isSpanish - Whether the active UI language is Spanish
 * @returns Localized plan display name or fallback
 */
export function getPlanDisplayName(
  lead: Lead,
  plans?: Plan[] | null,
  isSpanish: boolean = false
): string {
  if (lead.plan_id && plans && plans.length > 0) {
    const plan = plans.find((p) => p.id === lead.plan_id);
    if (plan?.name) {
      if (typeof plan.name === "string") return plan.name;
      const lang = isSpanish ? "es_DO" : "en_US";
      return plan.name[lang] || plan.name.es_DO || plan.name.en_US || lead.plan_name || lead.plan_id || "—";
    }
  }
  return lead.plan_name || lead.plan_id || "—";
}
