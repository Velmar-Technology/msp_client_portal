import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Radio, RefreshCw } from 'lucide-react';

export interface RmmDashboardHeaderProps {
  loading: boolean;
  onRefresh: () => void;
}

export const RmmDashboardHeader: React.FC<RmmDashboardHeaderProps> = memo(({ loading, onRefresh }) => {
  return (
    <div className="w-full max-w-full min-w-0 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
            <Radio className="h-3 w-3 text-emerald-500 animate-pulse shrink-0" />
            Zabbix Telemetry Engine
          </span>
        </div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
          Remote Monitoring & Management (RMM)
        </h2>
        <p className="text-xs text-zinc-500 leading-relaxed max-w-2xl">
          Real-time infrastructure telemetry, auto-healing deduplication (BL-103), and 1-click security patch deployment.
        </p>
      </div>
      <Button
        onClick={onRefresh}
        disabled={loading}
        className="h-8 px-3 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md shadow-xs transition-opacity cursor-pointer shrink-0 gap-1.5"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        <span>Refresh Telemetry</span>
      </Button>
    </div>
  );
});

RmmDashboardHeader.displayName = 'RmmDashboardHeader';
