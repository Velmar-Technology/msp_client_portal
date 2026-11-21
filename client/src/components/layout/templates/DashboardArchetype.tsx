import type { ElementType } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Activity, ShieldCheck, Server, AlertTriangle, Calendar, RefreshCw } from "lucide-react";

export interface DashboardMetric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: ElementType;
}

export interface DashboardArchetypeProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

const METRICS: DashboardMetric[] = [
  { label: "Active SLA Compliance", value: "99.8%", change: "+0.4%", trend: "up", icon: Activity },
  { label: "Healthy Endpoints", value: "482 / 486", change: "4 pending", trend: "neutral", icon: Server },
  { label: "Active Vulnerabilities", value: "2 Low", change: "-8 this week", trend: "up", icon: ShieldCheck },
  { label: "Open P1/P2 Incidents", value: "0", change: "Zero breaches", trend: "neutral", icon: AlertTriangle },
];

export function DashboardArchetype({
  title = "Operational Health & Telemetry",
  subtitle = "Real-time infrastructure performance, security score, and SLA status",
  onRefresh,
}: DashboardArchetypeProps) {
  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      variant="full"
      cta={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Calendar className="size-3.5" />
            Last 30 Days
          </Button>
          {onRefresh && (
            <Button size="sm" onClick={onRefresh} className="gap-1.5" data-testid="dashboard-refresh-btn">
              <RefreshCw className="size-3.5" />
              Sync Telemetry
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {METRICS.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div
                key={i}
                className="rounded-lg border border-border/70 bg-card p-4 flex flex-col justify-between shadow-subtle"
              >
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-xs font-medium">{metric.label}</span>
                  <Icon className="size-4 text-muted-foreground/80" />
                </div>
                <div>
                  <div className="text-xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="text-emerald-600 font-medium">{metric.change}</span>
                    <span>vs prior baseline</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 2-Column Split: Telemetry Chart & Recent Incident Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart / Telemetry Area */}
          <div className="lg:col-span-2 rounded-lg border border-border/70 bg-card p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Fleet Telemetry Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">CPU load, memory allocation, and latency</p>
              </div>
              <Button variant="outline" size="sm" className="h-6 text-xs">
                Hourly
              </Button>
            </div>
            <div className="h-64 flex items-center justify-center border border-dashed border-border/60 rounded-md bg-muted/20 text-xs text-muted-foreground">
              [Telemetry Timeseries Chart Slot]
            </div>
          </div>

          {/* Incident / Audit Feed */}
          <div className="rounded-lg border border-border/70 bg-card p-5 shadow-subtle space-y-4">
            <div className="border-b border-border/50 pb-3">
              <h3 className="text-sm font-semibold text-foreground">Operational Events</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Automated remediations and alerts</p>
            </div>
            <div className="divide-y divide-border/50 text-xs">
              <div className="py-2.5">
                <div className="font-medium text-foreground">Automated Disk Cleanup</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">SRV-01 · 12 minutes ago</div>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-foreground">Certificate Auto-Renewed</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">gateway.msp.local · 2 hours ago</div>
              </div>
              <div className="py-2.5">
                <div className="font-medium text-foreground">Scheduled Backup Completed</div>
                <div className="text-muted-foreground text-[11px] mt-0.5">Storage Pool A · 5 hours ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
