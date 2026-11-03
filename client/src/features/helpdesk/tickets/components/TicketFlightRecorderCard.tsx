import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Cpu,
  HardDrive,
  Layers,
  Terminal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Monitor,
  Clock,
} from 'lucide-react';
import type { AgentFlightRecorder } from '@shared/contracts';
import { Button } from '@/components/ui/button';

export interface TicketFlightRecorderCardProps {
  snapshot?: AgentFlightRecorder | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  deviceName?: string | null;
}

/**
 * Renders the hardware metrics and process telemetry captured at the exact moment of ticket submission.
 */
export const TicketFlightRecorderCard: React.FC<TicketFlightRecorderCardProps> = ({
  snapshot,
  reporterName,
  reporterEmail,
  deviceName,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  if (!snapshot && !reporterName) {
    return null;
  }

  const cpu = snapshot?.cpuUsagePercent ?? 0;
  const memory = snapshot?.memoryUsagePercent ?? 0;
  const disk = snapshot?.diskUsagePercent ?? 0;

  const getMetricColor = (val: number) => {
    if (val >= 85) return 'text-destructive';
    if (val >= 60) return 'text-amber-500';
    return 'text-emerald-500';
  };

  const getProgressColor = (val: number) => {
    if (val >= 85) return 'bg-destructive';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return null;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return null;
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading flex items-center gap-1.5">
              {t('ticketDetail.flightRecorderTitle')}
              <span className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.2 rounded font-mono font-medium lowercase">
                {t('ticketDetail.agentTelemetryBadge')}
              </span>
            </h3>
          </div>
        </div>

        {snapshot && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                {t('ticketDetail.collapseTelemetry')}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                {t('ticketDetail.expandTelemetry')}
              </>
            )}
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-4">
        {/* Reporter Attribution Banner */}
        {(reporterName || deviceName) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Monitor className="h-4 w-4 text-primary shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-foreground">
                  {reporterName || t('ticketDetail.anonymousDeskUser')}
                </span>
                {reporterEmail && (
                  <span className="text-muted-foreground ml-1.5 font-mono">
                    &lt;{reporterEmail}&gt;
                  </span>
                )}
                {deviceName && (
                  <span className="text-muted-foreground ml-2">
                    • {t('ticketDetail.endpointHost')}: <strong className="font-mono text-foreground">{deviceName}</strong>
                  </span>
                )}
              </div>
            </div>
            {snapshot?.uptimeSeconds && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                <span>{t('ticketDetail.uptime')}: {formatUptime(snapshot.uptimeSeconds)}</span>
              </div>
            )}
          </div>
        )}

        {snapshot && (
          <>
            {/* Primary Vitals Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* CPU */}
              <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <Cpu className="h-3.5 w-3.5" />
                    CPU
                  </span>
                  <span className={`font-mono font-bold ${getMetricColor(cpu)}`}>
                    {cpu.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(cpu)}`}
                    style={{ width: `${Math.min(cpu, 100)}%` }}
                  />
                </div>
              </div>

              {/* Memory */}
              <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <Layers className="h-3.5 w-3.5" />
                    RAM
                  </span>
                  <span className={`font-mono font-bold ${getMetricColor(memory)}`}>
                    {memory.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(memory)}`}
                    style={{ width: `${Math.min(memory, 100)}%` }}
                  />
                </div>
                {snapshot.memoryUsedBytes && snapshot.memoryTotalBytes && (
                  <span className="text-[10px] text-muted-foreground font-mono self-end">
                    {formatBytes(snapshot.memoryUsedBytes)} / {formatBytes(snapshot.memoryTotalBytes)}
                  </span>
                )}
              </div>

              {/* Disk */}
              <div className="p-3 rounded-lg border border-border bg-background flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1 font-medium">
                    <HardDrive className="h-3.5 w-3.5" />
                    Disk
                  </span>
                  <span className={`font-mono font-bold ${getMetricColor(disk)}`}>
                    {disk.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(disk)}`}
                    style={{ width: `${Math.min(disk, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Window / Context */}
            {(snapshot.activeWindowTitle || snapshot.os) && (
              <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                {snapshot.os && (
                  <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-mono">
                    OS: {snapshot.os} {snapshot.osVersion ? `(${snapshot.osVersion})` : ''}
                  </span>
                )}
                {snapshot.activeWindowTitle && (
                  <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border truncate max-w-full font-mono">
                    {t('ticketDetail.activeWindow')}: &quot;{snapshot.activeWindowTitle}&quot;
                  </span>
                )}
              </div>
            )}

            {/* Expandable Diagnostic Deep Dive */}
            {isExpanded && (
              <div className="mt-2 pt-3 border-t border-border flex flex-col gap-4">
                {/* Top Processes */}
                {snapshot.topProcesses && snapshot.topProcesses.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('ticketDetail.topProcesses')}
                    </h4>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-muted/50 text-[10px] text-muted-foreground uppercase border-b border-border">
                          <tr>
                            <th className="px-3 py-1.5 font-semibold">PID</th>
                            <th className="px-3 py-1.5 font-semibold">{t('ticketDetail.processName')}</th>
                            <th className="px-3 py-1.5 font-semibold text-right">CPU %</th>
                            <th className="px-3 py-1.5 font-semibold text-right">RAM</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-mono text-[11px]">
                          {snapshot.topProcesses.map((p, idx) => (
                            <tr key={`${p.pid ?? idx}-${p.name}`} className="hover:bg-muted/20">
                              <td className="px-3 py-1 text-muted-foreground">{p.pid ?? '-'}</td>
                              <td className="px-3 py-1 font-sans font-medium text-foreground truncate max-w-40">
                                {p.name}
                              </td>
                              <td className="px-3 py-1 text-right">
                                {p.cpuPercent !== undefined ? `${p.cpuPercent.toFixed(1)}%` : '-'}
                              </td>
                              <td className="px-3 py-1 text-right text-muted-foreground">
                                {p.memoryBytes ? formatBytes(p.memoryBytes) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Event Log Errors */}
                {snapshot.recentEventErrors && snapshot.recentEventErrors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-destructive uppercase tracking-wider font-heading flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('ticketDetail.recentSystemErrors')}
                    </h4>
                    <div className="space-y-1.5">
                      {snapshot.recentEventErrors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/5 text-xs flex flex-col gap-0.5"
                        >
                          <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                            <span className="font-semibold text-destructive">{err.source} {err.eventId ? `(#${err.eventId})` : ''}</span>
                            {err.timestamp && <span>{new Date(err.timestamp).toLocaleTimeString()}</span>}
                          </div>
                          <p className="text-foreground text-[11px] whitespace-pre-wrap">{err.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON toggle */}
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="h-6 px-2 text-[11px] text-muted-foreground"
                  >
                    {showRawJson ? t('ticketDetail.hideRawTelemetry') : t('ticketDetail.showRawTelemetry')}
                  </Button>
                  {showRawJson && (
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-[10px] font-mono overflow-x-auto text-foreground max-h-60">
                      {JSON.stringify(snapshot, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
