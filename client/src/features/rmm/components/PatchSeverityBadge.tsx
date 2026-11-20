import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

export interface PatchSeverityBadgeProps {
  severity: string;
}

export const PatchSeverityBadge: React.FC<PatchSeverityBadgeProps> = ({ severity }) => {
  const { t } = useTranslation();
  const normalized = severity.toUpperCase();

  switch (normalized) {
    case 'CRITICAL':
      return (
        <Badge className="bg-red-500/10 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-semibold text-[11px] px-2 py-0.5 shadow-2xs">
          {t("rmm.severityCritical")}
        </Badge>
      );
    case 'HIGH':
      return (
        <Badge className="bg-orange-500/10 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800/60 font-semibold text-[11px] px-2 py-0.5 shadow-2xs">
          {t("rmm.severityHigh")}
        </Badge>
      );
    case 'MEDIUM':
      return (
        <Badge className="bg-amber-500/10 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-semibold text-[11px] px-2 py-0.5 shadow-2xs">
          {t("rmm.severityMedium")}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border border-border font-semibold text-[11px] px-2 py-0.5 shadow-2xs">
          {t("rmm.severityLow")}
        </Badge>
      );
  }
};
