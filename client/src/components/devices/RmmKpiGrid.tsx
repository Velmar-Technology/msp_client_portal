import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { RmmOverviewStats } from '@/features/rmm';
import { SummaryCard } from '@/components/shared';
import { Server, ShieldCheck, TrendingUp, Zap, CheckCircle2 } from 'lucide-react';

export interface RmmKpiGridProps {
  stats: RmmOverviewStats | null;
  totalDevicesCount: number;
}

export const RmmKpiGrid: React.FC<RmmKpiGridProps> = memo(({ stats, totalDevicesCount }) => {
  const { t } = useTranslation();
  const monitoredTotal = stats?.monitoredDevices ?? totalDevicesCount ?? 0;
  const onlineCount = stats?.onlineDevices ?? totalDevicesCount ?? 0;
  const offlineCount = stats?.offlineDevices ?? 0;
  const pendingPatches = stats?.pendingPatchesCount ?? 0;
  const nrrFormatted = ((stats?.noiseReductionRatio ?? 0) * 100).toFixed(1);
  const sheFormatted = ((stats?.selfHealingEfficiency ?? 0) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0">
      {/* 1. Monitored Devices */}
      <SummaryCard
        icon={<Server className="h-4 w-4 text-zinc-600 dark:text-zinc-400 shrink-0" />}
        title={t("rmm.kpiMonitoredDevices")}
        value={<span className="font-mono text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">{monitoredTotal}</span>}
        subtitle={
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
            <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-1.5 py-0.5 rounded font-mono font-bold uppercase inline-flex items-center gap-1 shrink-0">
              <CheckCircle2 className="h-3 w-3" /> {t("rmm.kpiOnline", { count: onlineCount })}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">•</span>
            <span className="text-rose-600 dark:text-rose-400 font-mono font-semibold shrink-0">
              {t("rmm.kpiOffline", { count: offlineCount })}
            </span>
          </div>
        }
      />

      {/* 2. Pending Security Patches */}
      <SummaryCard
        icon={<ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />}
        title={t("rmm.kpiPendingPatches")}
        value={<span className="font-mono text-2xl font-extrabold text-amber-600 dark:text-amber-400">{pendingPatches}</span>}
        subtitle={<span className="text-[10px] text-zinc-400 font-medium">{t("rmm.kpiAdvisoriesReady")}</span>}
      />

      {/* 3. Noise Reduction Ratio (NRR) */}
      <SummaryCard
        icon={<TrendingUp className="h-4 w-4 text-blue-500 shrink-0" />}
        title={t("rmm.kpiAlertNrr")}
        value={<span className="font-mono text-2xl font-extrabold text-blue-600 dark:text-blue-400">{nrrFormatted}%</span>}
        subtitle={<span className="text-[10px] text-zinc-400 font-medium">{t("rmm.kpiDeduplicatedAlerts")}</span>}
      />

      {/* 4. Self-Healing Efficiency (SHE) */}
      <SummaryCard
        icon={<Zap className="h-4 w-4 text-emerald-500 shrink-0" />}
        title={t("rmm.kpiSelfHealing")}
        value={<span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{sheFormatted}%</span>}
        subtitle={<span className="text-[10px] text-zinc-400 font-medium">{t("rmm.kpiAutoClosed")}</span>}
      />
    </div>
  );
});

RmmKpiGrid.displayName = 'RmmKpiGrid';
