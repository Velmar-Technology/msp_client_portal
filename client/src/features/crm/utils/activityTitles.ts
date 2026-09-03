import type { LeadActivity } from "../api/crmService";

export type TranslateFn = (key: string, options?: Record<string, string>) => string;

type ActivityType = LeadActivity["activity_type"];

import {
  ACTIVITY_TYPE_KEYS,
  QUOTATION_TITLE_TO_STATUS_KEY,
} from "@/constants/crm";


function translateStage(stageCode: string, t: TranslateFn): string {
  return t(`crm.stages.${stageCode.toLowerCase()}`);
}

export function getActivityTypeLabel(type: ActivityType, t: TranslateFn): string {
  const key = ACTIVITY_TYPE_KEYS[type];
  return key ? t(`crm.activities.${key}`) : type;
}

export function resolveActivityTitle(title: string, type: ActivityType, t: TranslateFn): string {
  switch (type) {
    case "STAGE_CHANGE": {
      if (title === "Lead Created") {
        return t("crm.systemActivity.leadCreated");
      }
      const stageChange = title.match(/^Stage Changed: ([A-Z_]+) → ([A-Z_]+)$/);
      if (stageChange) {
        return t("crm.systemActivity.stageChanged", {
          from: translateStage(stageChange[1], t),
          to: translateStage(stageChange[2], t),
        });
      }
      return title;
    }

    case "QUOTE_SENT": {
      const sent = title.match(/^Quotation Sent: (.+)$/);
      return sent ? t("crm.systemActivity.quotationSent", { number: sent[1] }) : title;
    }

    case "QUOTE_REMINDER": {
      const due = title.match(/^Follow-up reminder due: (.+)$/);
      if (due) {
        return t("crm.systemActivity.followUpDue", { number: due[1] });
      }
      const reminderSent = title.match(/^Quotation Reminder Sent: (.+)$/);
      return reminderSent ? t("crm.systemActivity.quoteReminderSent", { number: reminderSent[1] }) : title;
    }

    case "QUOTE_STATUS_CHANGE": {
      const statusChange = title.match(/^(Quotation (?:Drafted|Sent|Accepted|Declined|Expired)): (.+)$/);
      if (!statusChange) {
        return title;
      }
      const statusKey = QUOTATION_TITLE_TO_STATUS_KEY[statusChange[1]];
      return t("crm.systemActivity.quotationStatus", {
        status: t(`crm.quotationStatus.${statusKey}`),
        number: statusChange[2],
      });
    }

    case "PLAN_ASSIGNED": {
      const converted = title.match(/^Lead Converted: Active Subscription Created \((.+)\)$/);
      return converted ? t("crm.systemActivity.leadConverted", { plan: converted[1] }) : title;
    }

    case "SUB_MODIFIED": {
      if (title === "Subscription Cancelled") {
        return t("crm.systemActivity.subscriptionCancelled");
      }
      const modified = title.match(/^Subscription Modified \((.+)\)$/);
      return modified ? t("crm.systemActivity.subscriptionModified", { plan: modified[1] }) : title;
    }

    default:
      return title;
  }
}
