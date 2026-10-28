import React, { useState, useMemo, useRef, useCallback } from "react";
import { ArrowUpRight, ArrowDownRight, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChartDataPoint {
  label: string;
  value: number;
  tooltipValue?: string;
}

export interface TelemetryMetricTab {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
    isPositive?: boolean;
  };
  chartData: ChartDataPoint[];
  unit?: string;
}

export interface ElevenCategoryTab {
  id: string;
  label: string;
  targetId?: string;
}

export interface ElevenDashboardHeroProps {
  workspaceName?: string;
  userName?: string;
  statusText?: string;
  statusType?: "operational" | "warning" | "error";
  categories?: ElevenCategoryTab[];
  activeCategoryId?: string;
  onCategoryChange?: (categoryId: string) => void;
  actions?: React.ReactNode;
  metricTabs: TelemetryMetricTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  defaultPeriod?: "7d" | "30d" | "90d";
  className?: string;
}

/**
 * Returns dynamic salutation based on user's current local hour.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Generates smooth SVG cubic bezier path string from an array of 2D coordinates.
 */
function generateSmoothCurve(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
}

export function ElevenDashboardHero({
  workspaceName = "Estiven's Workspace",
  userName = "Estiven",
  statusText = "All systems operational",
  statusType = "operational",
  categories = [
    { id: "overview", label: "Overview", targetId: "section-overview" },
    { id: "tickets", label: "Support & Tickets", targetId: "section-tickets" },
    { id: "infrastructure", label: "Infrastructure", targetId: "section-infrastructure" },
    { id: "billing", label: "Billing & Invoices", targetId: "section-billing" },
  ],
  activeCategoryId,
  onCategoryChange,
  actions,
  metricTabs,
  activeTabId,
  onTabChange,
  defaultPeriod = "7d",
  className,
}: ElevenDashboardHeroProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    activeCategoryId || (categories[0]?.id ?? "overview")
  );
  const [selectedTabId, setSelectedTabId] = useState<string>(
    activeTabId || (metricTabs[0]?.id ?? "")
  );
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">(defaultPeriod);
  const [granularity, setGranularity] = useState<"hourly" | "daily">("daily");
  const [scale, setScale] = useState<"linear" | "log">("linear");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const currentTabId = activeTabId !== undefined ? activeTabId : selectedTabId;
  const currentTab = useMemo(() => {
    return metricTabs.find((t) => t.id === currentTabId) || metricTabs[0];
  }, [metricTabs, currentTabId]);

  const handleTabClick = (id: string) => {
    setSelectedTabId(id);
    onTabChange?.(id);
  };

  const handleCategoryClick = (cat: ElevenCategoryTab) => {
    setSelectedCategory(cat.id);
    onCategoryChange?.(cat.id);
    if (cat.targetId) {
      const element = document.getElementById(cat.targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // SVG Chart Dimensions
  const chartWidth = 800;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartData = currentTab?.chartData || [];

  const { points, areaPath, linePath } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { points: [], areaPath: "", linePath: "" };
    }

    const rawValues = chartData.map((d) => (scale === "log" ? Math.log10(Math.max(1, d.value)) : d.value));
    const rawMax = Math.max(...rawValues);
    const rawMin = Math.min(...rawValues);
    const max = rawMax === rawMin ? rawMax + 10 : rawMax * 1.15;
    const min = Math.max(0, rawMin === rawMax ? 0 : rawMin * 0.85);

    const availableWidth = chartWidth - paddingX * 2;
    const availableHeight = chartHeight - paddingTop - paddingBottom;

    const computedPoints = chartData.map((d, i) => {
      const val = scale === "log" ? Math.log10(Math.max(1, d.value)) : d.value;
      const x = paddingX + (i / Math.max(1, chartData.length - 1)) * availableWidth;
      const normalizedY = (val - min) / (max - min || 1);
      const y = paddingTop + availableHeight - normalizedY * availableHeight;
      return { x, y, data: d };
    });

    const curve = generateSmoothCurve(computedPoints);
    const lastPoint = computedPoints[computedPoints.length - 1];
    const firstPoint = computedPoints[0];

    const bottomY = chartHeight - paddingBottom;
    const area = `${curve} L ${lastPoint?.x ?? 0} ${bottomY} L ${firstPoint?.x ?? 0} ${bottomY} Z`;

    return {
      points: computedPoints,
      areaPath: area,
      linePath: curve,
    };
  }, [chartData, scale]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const svgX = (clientX / rect.width) * chartWidth;

      let closestIdx = 0;
      let minDistance = Infinity;

      points.forEach((pt, i) => {
        const dist = Math.abs(pt.x - svgX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      });

      setHoverIndex(closestIdx);
    },
    [points]
  );

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className={cn("space-y-6 w-full", className)}>
      {/* 1. Hero Salutation & Live Status Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div>
          {/* Live Pulse Pill */}
          <div
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 backdrop-blur-md px-3 py-1 text-xs font-medium text-foreground shadow-xs mb-2.5 transition-colors"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  statusType === "operational" && "bg-emerald-400",
                  statusType === "warning" && "bg-amber-400",
                  statusType === "error" && "bg-rose-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  statusType === "operational" && "bg-emerald-500",
                  statusType === "warning" && "bg-amber-500",
                  statusType === "error" && "bg-rose-500"
                )}
              />
            </span>
            <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {statusText}
            </span>
          </div>

          {/* Workspace subtle label */}
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            {workspaceName}
          </p>

          {/* Greeting Heading */}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {userName}
          </h1>
        </div>

        {/* Action Controls */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      {/* 2. Horizontal Category Navigation Tabs */}
      {categories.length > 0 && (
        <div
          role="tablist"
          aria-label="Dashboard Categories"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/40 scrollbar-none"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                  isSelected
                    ? "bg-foreground text-background shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. ElevenLabs Segmented Telemetry Hero Card */}
      <div
        className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-eleven)] overflow-hidden"
        data-slot="eleven-telemetry-card"
      >
        {/* Flush Segmented Tabs Header */}
        <div
          role="tablist"
          aria-label="Telemetry Metrics"
          className="-m-5 mb-5 rounded-t-2xl border-b border-border/60 bg-muted/15 flex overflow-x-auto divide-x divide-border/40 scrollbar-none"
        >
          {metricTabs.map((tab) => {
            const isActive = tab.id === currentTab?.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => handleTabClick(tab.id)}
                className={cn(
                  "flex-1 min-w-[170px] p-4 text-left transition-all duration-150 relative cursor-pointer group select-none",
                  isActive
                    ? "bg-card text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary shadow-xs"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                    {tab.label}
                  </span>
                  {tab.badge && <div className="shrink-0">{tab.badge}</div>}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-mono">
                    {tab.value}
                  </span>

                  {tab.trend && (
                    <span
                      className={cn(
                        "inline-flex items-center text-[10px] font-semibold font-mono",
                        tab.trend.isPositive !== false && tab.trend.direction === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : tab.trend.direction === "down"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                      )}
                    >
                      {tab.trend.direction === "up" ? (
                        <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                      ) : tab.trend.direction === "down" ? (
                        <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                      ) : (
                        <Minus className="h-3 w-3 inline mr-0.5" />
                      )}
                      {tab.trend.value}
                    </span>
                  )}
                </div>

                {tab.subtext && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {tab.subtext}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Telemetry Chart Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pt-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {currentTab?.label} · Telemetry Trend
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Toggles (7d, 30d, 90d) */}
            <div className="flex items-center rounded-lg border border-border/80 bg-background/50 p-0.5 text-[11px] font-medium">
              {(["7d", "30d", "90d"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                    period === p
                      ? "bg-foreground text-background font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Granularity Toggle */}
            <div className="flex items-center rounded-lg border border-border/80 bg-background/50 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setGranularity("hourly")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-colors cursor-pointer capitalize",
                  granularity === "hourly"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={() => setGranularity("daily")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-colors cursor-pointer capitalize",
                  granularity === "daily"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Daily
              </button>
            </div>

            {/* Scale Toggle */}
            <div className="flex items-center rounded-lg border border-border/80 bg-background/50 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setScale("linear")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                  scale === "linear"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Linear
              </button>
              <button
                type="button"
                onClick={() => setScale("log")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-colors cursor-pointer",
                  scale === "log"
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Log
              </button>
            </div>
          </div>
        </div>

        {/* SVG Time-Series Chart */}
        <div className="relative w-full overflow-hidden select-none" style={{ minHeight: `${chartHeight}px` }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full h-56 cursor-crosshair overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            aria-label="Telemetry Chart"
          >
            <defs>
              <linearGradient id="elevenChartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary, #3b82f6)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary, #3b82f6)" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Subtle horizontal grid lines */}
            {[0.2, 0.5, 0.8].map((ratio) => {
              const y = paddingTop + (chartHeight - paddingTop - paddingBottom) * ratio;
              return (
                <line
                  key={ratio}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Area Fill */}
            {areaPath && (
              <path d={areaPath} fill="url(#elevenChartGradient)" className="transition-all duration-300" />
            )}

            {/* Smooth Bezier Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--primary, #3b82f6)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300 drop-shadow-xs"
              />
            )}

            {/* Bottom X-axis Date Labels */}
            {points.map((pt, idx) => (
              <text
                key={idx}
                x={pt.x}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="10"
                className="fill-muted-foreground font-mono text-[10px]"
              >
                {pt.data.label}
              </text>
            ))}

            {/* Hover Crosshair & Indicator Point */}
            {hoveredPoint && (
              <g>
                {/* Vertical Cursor Line */}
                <line
                  x1={hoveredPoint.x}
                  y1={paddingTop}
                  x2={hoveredPoint.x}
                  y2={chartHeight - paddingBottom}
                  stroke="currentColor"
                  strokeOpacity="0.2"
                  strokeDasharray="2 2"
                />
                {/* Data Point Glow Ring */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="6"
                  className="fill-primary/20 animate-pulse"
                />
                {/* Data Point Inner Dot */}
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="3.5"
                  className="fill-primary stroke-background stroke-2 shadow-xs"
                />
              </g>
            )}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none rounded-lg border border-border/90 bg-background/95 backdrop-blur-md px-2.5 py-1.5 shadow-lg text-xs z-20 -translate-x-1/2 -translate-y-full transition-all duration-75"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.y / chartHeight) * 100}%`,
                marginTop: "-12px",
              }}
            >
              <div className="font-semibold text-foreground font-mono">
                {hoveredPoint.data.tooltipValue || `${hoveredPoint.data.value} ${currentTab?.unit || ""}`}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {hoveredPoint.data.label}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
