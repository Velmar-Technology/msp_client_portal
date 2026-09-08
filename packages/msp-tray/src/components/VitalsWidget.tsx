import React from 'react';
import { Cpu, HardDrive, MemoryStick, Clock } from 'lucide-react';
import { SystemVitals } from '../services/tauri';

interface VitalsWidgetProps {
  vitals: SystemVitals | null;
}

export const VitalsWidget: React.FC<VitalsWidgetProps> = ({ vitals }) => {
  if (!vitals) {
    return (
      <div className="p-3 bg-[#0d1424]/60 rounded-xl border border-[#1c2942] animate-pulse">
        <div className="h-3.5 bg-[#162238] rounded w-1/3 mb-2" />
        <div className="h-2 bg-[#162238] rounded w-full" />
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getMetricGradient = (val: number, normalGradient: string) => {
    if (val > 88) return 'from-rose-600 to-rose-400';
    if (val > 70) return 'from-[#ff5e00] to-amber-400';
    return normalGradient;
  };

  return (
    <div className="bg-[#0d1424]/90 border border-[#1c2942] rounded-xl p-3 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
        <span className="flex items-center gap-1.5 font-semibold text-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0084ff]" />
          System Telemetry
        </span>
        <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-[#ff5e00]" /> Uptime: {formatUptime(vitals.uptimeSeconds)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* CPU - Velmar Blue */}
        <div className="bg-[#080d18]/90 border border-[#17243d] rounded-lg p-2 flex flex-col group hover:border-[#0084ff]/40 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#0084ff]" /> CPU
            </span>
            <span className={`text-[11px] font-bold font-mono ${vitals.cpuPercent > 85 ? 'text-rose-400' : 'text-[#0084ff]'}`}>
              {Math.round(vitals.cpuPercent)}%
            </span>
          </div>
          <div className="w-full bg-[#121b2d] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getMetricGradient(
                vitals.cpuPercent,
                'from-[#006bd1] to-[#0084ff]'
              )}`}
              style={{ width: `${Math.min(100, Math.max(0, vitals.cpuPercent))}%` }}
            />
          </div>
        </div>

        {/* Memory - Velmar Orange */}
        <div className="bg-[#080d18]/90 border border-[#17243d] rounded-lg p-2 flex flex-col group hover:border-[#ff5e00]/40 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
              <MemoryStick className="w-3 h-3 text-[#ff5e00]" /> RAM
            </span>
            <span className={`text-[11px] font-bold font-mono ${vitals.memoryPercent > 85 ? 'text-rose-400' : 'text-[#ff5e00]'}`}>
              {Math.round(vitals.memoryPercent)}%
            </span>
          </div>
          <div className="w-full bg-[#121b2d] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getMetricGradient(
                vitals.memoryPercent,
                'from-[#d94e00] to-[#ff5e00]'
              )}`}
              style={{ width: `${Math.min(100, Math.max(0, vitals.memoryPercent))}%` }}
            />
          </div>
        </div>

        {/* Disk - Velmar Cyan / Azure */}
        <div className="bg-[#080d18]/90 border border-[#17243d] rounded-lg p-2 flex flex-col group hover:border-[#38bdf8]/40 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1">
              <HardDrive className="w-3 h-3 text-[#38bdf8]" /> DISK
            </span>
            <span className={`text-[11px] font-bold font-mono ${vitals.diskPercent > 85 ? 'text-rose-400' : 'text-[#38bdf8]'}`}>
              {Math.round(vitals.diskPercent)}%
            </span>
          </div>
          <div className="w-full bg-[#121b2d] rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getMetricGradient(
                vitals.diskPercent,
                'from-[#0084ff] to-[#38bdf8]'
              )}`}
              style={{ width: `${Math.min(100, Math.max(0, vitals.diskPercent))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
