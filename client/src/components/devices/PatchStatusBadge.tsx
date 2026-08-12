import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface PatchStatusBadgeProps {
  status: string;
}

export const PatchStatusBadge: React.FC<PatchStatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const normalized = status.toUpperCase();

  switch (normalized) {
    case 'INSTALLED':
      return (
        <Badge className="bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 font-medium text-[11px] px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> {t("rmm.statusInstalled")}
        </Badge>
      );
    case 'INSTALLING':
      return (
        <Badge className="bg-blue-500/10 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-medium text-[11px] px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-2xs">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600 dark:text-blue-400" /> {t("rmm.statusInstalling")}
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge className="bg-red-500/10 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 font-medium text-[11px] px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-2xs">
          <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" /> {t("rmm.statusFailed")}
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-500/10 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 font-medium text-[11px] px-2 py-0.5 flex items-center gap-1.5 w-fit shadow-2xs">
          <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" /> {t("rmm.statusPending")}
        </Badge>
      );
  }
};
