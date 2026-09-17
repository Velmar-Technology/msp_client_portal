import * as React from "react";
import { BarChart2, TrendingUp, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageGraphProps, PageGraphType, PageGraphDataPoint } from "./types";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
];

/**
 * Enterprise Graph / Chart view for visual record analytics.
 * Supports interactive switching between Bar, Line, and Donut SVG charts.
 *
 * @param props - Graph configuration, data, and visual options.
 * @returns Responsive chart component.
 */
export function PageGraph({
  data = [],
  type: controlledType,
  defaultType = "bar",
  onTypeChange,
  title,
  subtitle,
  valuePrefix = "",
  valueSuffix = "",
  height = 300,
  allowTypeChange = true,
  actions,
  className,
  ...props
}: PageGraphProps) {
  const [internalType, setInternalType] = React.useState<PageGraphType>(defaultType);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const isControlled = controlledType !== undefined;
  const activeType = isControlled ? controlledType : internalType;

  const handleTypeSelect = (newType: PageGraphType) => {
    if (!isControlled) {
      setInternalType(newType);
    }
    onTypeChange?.(newType);
  };

  const maxValue = React.useMemo(() => {
    if (!data.length) return 100;
    const max = Math.max(...data.map((d) => d.value));
    return max <= 0 ? 100 : max * 1.15;
  }, [data]);

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  return (
    <div
      data-slot="page-graph"
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-5",
        className
      )}
      {...props}
    >
      {/* Header: Title, Controls, and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="space-y-0.5 min-w-0">
          {title && (
            <h2 className="text-base font-bold text-foreground font-heading tracking-tight truncate">
              {title}
            </h2>
          )}
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {actions}

          {/* Chart Type Selector */}
          {allowTypeChange && (
            <div className="flex items-center rounded-sm border border-border p-0.5 bg-muted/40">
              <Button
                type="button"
                variant={activeType === "bar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleTypeSelect("bar")}
                aria-label="Bar chart view"
                className={cn(
                  "h-6 px-2 text-xs font-semibold gap-1 rounded-xs cursor-pointer",
                  activeType === "bar" && "shadow-2xs bg-background text-foreground"
                )}
              >
                <BarChart2 className="size-3 text-primary" />
                <span className="hidden md:inline">Bar</span>
              </Button>
              <Button
                type="button"
                variant={activeType === "line" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleTypeSelect("line")}
                aria-label="Line chart view"
                className={cn(
                  "h-6 px-2 text-xs font-semibold gap-1 rounded-xs cursor-pointer",
                  activeType === "line" && "shadow-2xs bg-background text-foreground"
                )}
              >
                <TrendingUp className="size-3 text-primary" />
                <span className="hidden md:inline">Line</span>
              </Button>
              <Button
                type="button"
                variant={activeType === "donut" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleTypeSelect("donut")}
                aria-label="Donut chart view"
                className={cn(
                  "h-6 px-2 text-xs font-semibold gap-1 rounded-xs cursor-pointer",
                  activeType === "donut" && "shadow-2xs bg-background text-foreground"
                )}
              >
                <PieChart className="size-3 text-primary" />
                <span className="hidden md:inline">Donut</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      {!data.length ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          No data available to display in graph.
        </div>
      ) : activeType === "bar" ? (
        <BarChartRenderer
          data={data}
          maxValue={maxValue}
          height={height}
          valuePrefix={valuePrefix}
          valueSuffix={valueSuffix}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
        />
      ) : activeType === "line" ? (
        <LineChartRenderer
          data={data}
          maxValue={maxValue}
          height={height}
          valuePrefix={valuePrefix}
          valueSuffix={valueSuffix}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
        />
      ) : (
        <DonutChartRenderer
          data={data}
          totalValue={totalValue}
          height={height}
          valuePrefix={valuePrefix}
          valueSuffix={valueSuffix}
          hoveredIndex={hoveredIndex}
          setHoveredIndex={setHoveredIndex}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// SVG Chart Sub-Renderers
// ----------------------------------------------------------------------

interface RendererProps {
  data: PageGraphDataPoint[];
  height: number;
  valuePrefix: string;
  valueSuffix: string;
  hoveredIndex: number | null;
  setHoveredIndex: (idx: number | null) => void;
}

function BarChartRenderer({
  data,
  maxValue,
  height,
  valuePrefix,
  valueSuffix,
  hoveredIndex,
  setHoveredIndex,
}: RendererProps & { maxValue: number }) {
  const chartHeight = Math.max(160, height - 60);

  return (
    <div className="w-full space-y-2">
      <div
        className="w-full flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2"
        style={{ height: chartHeight }}
      >
        {data.map((item, idx) => {
          const heightPercent = Math.max(4, Math.round((item.value / maxValue) * 100));
          const isHovered = hoveredIndex === idx;
          const barColor = item.color || CHART_COLORS[idx % CHART_COLORS.length];

          return (
            <div
              key={item.label}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
            >
              {/* Tooltip on hover */}
              {isHovered && (
                <div className="absolute -top-7 px-2 py-1 bg-popover text-popover-foreground border border-border rounded shadow-md text-[11px] font-mono font-bold whitespace-nowrap z-10 pointer-events-none animate-in fade-in zoom-in-95">
                  {valuePrefix}
                  {item.value.toLocaleString()}
                  {valueSuffix}
                </div>
              )}

              {/* Bar bar element */}
              <div
                className={cn(
                  "w-full rounded-t-sm transition-all duration-200",
                  isHovered ? "brightness-110 opacity-100" : "opacity-85 hover:opacity-100"
                )}
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between gap-2 sm:gap-4 px-2 pt-1 border-t border-border/60">
        {data.map((item, idx) => (
          <div
            key={item.label}
            className={cn(
              "flex-1 text-center text-[10px] font-medium truncate transition-colors",
              hoveredIndex === idx ? "text-primary font-bold" : "text-muted-foreground"
            )}
            title={item.label}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChartRenderer({
  data,
  maxValue,
  height,
  valuePrefix,
  valueSuffix,
  hoveredIndex,
  setHoveredIndex,
}: RendererProps & { maxValue: number }) {
  const chartHeight = Math.max(160, height - 60);
  const paddingX = 30;
  const paddingY = 20;

  const points = React.useMemo(() => {
    if (data.length <= 1) return [];
    const stepX = (1000 - paddingX * 2) / (data.length - 1);

    return data.map((item, idx) => {
      const x = paddingX + idx * stepX;
      const y = paddingY + (1 - item.value / maxValue) * (chartHeight - paddingY * 2);
      return { x, y, item, idx };
    });
  }, [data, maxValue, chartHeight]);

  const pathD = React.useMemo(() => {
    if (!points.length) return "";
    return points.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
      ""
    );
  }, [points]);

  const areaD = React.useMemo(() => {
    if (!points.length) return "";
    const first = points[0];
    const last = points[points.length - 1];
    return `${pathD} L ${last.x},${chartHeight} L ${first.x},${chartHeight} Z`;
  }, [points, pathD, chartHeight]);

  return (
    <div className="w-full space-y-2">
      <div className="w-full relative" style={{ height: chartHeight }}>
        <svg
          viewBox={`0 0 1000 ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="pageGraphAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {areaD && <path d={areaD} fill="url(#pageGraphAreaGrad)" />}

          {/* Stroke path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point circles */}
          {points.map((pt) => {
            const isHovered = hoveredIndex === pt.idx;
            return (
              <g
                key={pt.item.label}
                onMouseEnter={() => setHoveredIndex(pt.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  className={cn(
                    "transition-all",
                    isHovered
                      ? "fill-primary stroke-background stroke-2"
                      : "fill-background stroke-primary stroke-2"
                  )}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover label */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-popover text-popover-foreground border border-border rounded shadow-md text-xs font-mono font-bold whitespace-nowrap pointer-events-none">
            {data[hoveredIndex].label}: {valuePrefix}
            {data[hoveredIndex].value.toLocaleString()}
            {valueSuffix}
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-2 pt-1 border-t border-border/60">
        {data.map((item, idx) => (
          <div
            key={item.label}
            className={cn(
              "text-[10px] font-medium truncate transition-colors",
              hoveredIndex === idx ? "text-primary font-bold" : "text-muted-foreground"
            )}
            title={item.label}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChartRenderer({
  data,
  totalValue,
  height,
  valuePrefix,
  valueSuffix,
  hoveredIndex,
  setHoveredIndex,
}: RendererProps & { totalValue: number }) {
  const chartHeight = Math.max(180, height - 40);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 70;
  const innerRadius = 45;

  // Compute SVG arcs
  let accumulatedAngle = 0;
  const segments = data.map((item, idx) => {
    const ratio = totalValue > 0 ? item.value / totalValue : 0;
    const sweepAngle = ratio * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += sweepAngle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + sweepAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const x3 = cx + innerRadius * Math.cos(endRad);
    const y3 = cy + innerRadius * Math.sin(endRad);
    const x4 = cx + innerRadius * Math.cos(startRad);
    const y4 = cy + innerRadius * Math.sin(startRad);

    const largeArc = sweepAngle > 180 ? 1 : 0;

    const pathData =
      sweepAngle >= 359.9
        ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} M ${cx} ${cy - innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy + innerRadius} A ${innerRadius} ${innerRadius} 0 1 0 ${cx} ${cy - innerRadius} Z`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    const color = item.color || CHART_COLORS[idx % CHART_COLORS.length];

    return {
      pathData,
      item,
      color,
      idx,
      percent: Math.round(ratio * 100),
    };
  });

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2"
      style={{ minHeight: chartHeight }}
    >
      {/* SVG Donut */}
      <div className="relative size-44 shrink-0">
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full">
          {segments.map((seg) => {
            const isHovered = hoveredIndex === seg.idx;
            return (
              <path
                key={seg.item.label}
                d={seg.pathData}
                fill={seg.color}
                onMouseEnter={() => setHoveredIndex(seg.idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "transition-all duration-200 cursor-pointer",
                  isHovered ? "opacity-100 brightness-110" : "opacity-85 hover:opacity-100"
                )}
              />
            );
          })}
        </svg>

        {/* Center Total / Hover Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex].label : "Total"}
          </span>
          <span className="text-base font-bold font-mono text-foreground leading-tight">
            {valuePrefix}
            {hoveredIndex !== null && data[hoveredIndex]
              ? data[hoveredIndex].value.toLocaleString()
              : totalValue.toLocaleString()}
            {valueSuffix}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 max-w-md w-full">
        {segments.map((seg) => {
          const isHovered = hoveredIndex === seg.idx;
          return (
            <div
              key={seg.item.label}
              onMouseEnter={() => setHoveredIndex(seg.idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={cn(
                "flex items-center justify-between gap-2 p-1.5 rounded-sm transition-colors cursor-pointer select-none",
                isHovered && "bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-xs font-medium text-foreground truncate">
                  {seg.item.label}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                <span className="font-bold text-foreground">
                  {valuePrefix}
                  {seg.item.value.toLocaleString()}
                  {valueSuffix}
                </span>
                <span className="text-[10px] text-muted-foreground">({seg.percent}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
