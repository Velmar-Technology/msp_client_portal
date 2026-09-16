import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { MonthlyData } from "../hooks/useFinancialDashboard";

interface RevenueChartProps {
  data: MonthlyData[];
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}

// Calculate a clean "nice" scale maximum and step for Y-axis
function calculateNiceScale(maxVal: number, targetTicks = 4): { yMax: number; step: number } {
  if (maxVal <= 0) return { yMax: 1000, step: 250 };

  const rawMax = maxVal * 1.15; // 15% head-room
  const rawStep = rawMax / (targetTicks - 1);

  // Magnitude power of 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const yMax = niceStep * (targetTicks - 1);
  return { yMax, step: niceStep };
}

function formatScaleLabel(val: number): string {
  const rounded = Math.round(val);
  if (rounded === 0) return "0";
  if (rounded >= 1_000_000) {
    const inM = rounded / 1_000_000;
    return Number.isInteger(inM) ? `${inM}M` : `${inM.toFixed(1)}M`;
  }
  if (rounded >= 1_000) {
    const inK = rounded / 1_000;
    return Number.isInteger(inK) ? `${inK}k` : `${inK.toFixed(1)}k`;
  }
  return `${rounded}`;
}

export function RevenueChart({ data, hoveredIndex, setHoveredIndex }: RevenueChartProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive SVG viewBox state
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: 260,
        });
      }
    };

    // Initial size
    handleResize();

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const { width, height } = dimensions;

  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = Math.max(0, width - paddingLeft - paddingRight);
  const chartHeight = Math.max(0, height - paddingTop - paddingBottom);

  // Maximum value for scaling with nice integer steps
  const maxVal = Math.max(0, ...data.map((d) => Math.max(d.revenue, d.expenses)));
  const gridCount = 4;
  const { yMax, step } = calculateNiceScale(maxVal, gridCount);

  // Coordinate helpers
  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingBottom - (val / yMax) * chartHeight;
  };

  // Build SVG Path strings for Area and Line
  const revenuePoints = data.map((d, i) => `${getX(i)},${getY(d.revenue)}`);
  const expensePoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`);

  const revenueLinePath = revenuePoints.length > 0 ? `M ${revenuePoints.join(" L ")}` : "";
  const revenueAreaPath =
    revenuePoints.length > 0
      ? `${revenueLinePath} L ${getX(data.length - 1)},${height - paddingBottom} L ${getX(0)},${height - paddingBottom} Z`
      : "";

  const expenseLinePath = expensePoints.length > 0 ? `M ${expensePoints.join(" L ")}` : "";

  // Mouse movement tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - paddingLeft;

    if (x < -10 || x > chartWidth + 10) {
      setHoveredIndex(null);
      return;
    }

    const relativePct = x / chartWidth;
    const index = Math.min(data.length - 1, Math.max(0, Math.round(relativePct * (data.length - 1))));
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // Generate grid values (always cleanly rounded intervals)
  const gridLines = Array.from({ length: gridCount }).map((_, i) => {
    const val = step * i;
    return {
      value: val,
      y: getY(val),
      label: formatScaleLabel(val),
    };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;
  const tooltipX = hoveredIndex !== null ? getX(hoveredIndex) : 0;

  return (
    <div className="h-full flex flex-col justify-between rounded-lg border border-border bg-card p-3.5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div>
          <h3 className="text-xs font-semibold text-foreground">{t("financial.revenueVsExpenses")}</h3>
          <p className="text-[10px] text-muted-foreground">{t("financial.analysisPeriodDesc")}</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-medium">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">{t("financial.revenue")}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="text-muted-foreground">{t("financial.expenses")}</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="relative mt-3 flex-1 min-h-65 w-full select-none flex items-center">
        <svg
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible cursor-crosshair"
        >
          <defs>
            {/* Elegant Area Gradient */}
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {gridLines.map((line, i) => (
            <g key={i} className="opacity-40 dark:opacity-20">
              <line
                x1={paddingLeft}
                y1={line.y}
                x2={width - paddingRight}
                y2={line.y}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="4 4"
                className="text-zinc-300 dark:text-zinc-700"
              />
              <text
                x={paddingLeft - 8}
                y={line.y + 3}
                textAnchor="end"
                className="fill-zinc-400 text-[9px] font-mono dark:fill-zinc-500"
              >
                {line.label}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {data.map((item, i) => (
            <text
              key={i}
              x={getX(i)}
              y={height - 6}
              textAnchor="middle"
              className="fill-zinc-400 text-[9px] font-medium dark:fill-zinc-500"
            >
              {item.month}
            </text>
          ))}

          {/* Revenue Fill Area */}
          {revenueAreaPath && (
            <path d={revenueAreaPath} fill="url(#revenueGrad)" className="transition-all duration-300" />
          )}

          {/* Revenue Line */}
          {revenueLinePath && (
            <path
              d={revenueLinePath}
              fill="none"
              stroke="#10b981" // emerald-500
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Expenses Line */}
          {expenseLinePath && (
            <path
              d={expenseLinePath}
              fill="none"
              stroke="#ef4444" // red-500
              strokeWidth={1.5}
              strokeDasharray="1 1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Active Hover Guide and Dots */}
          {hoveredIndex !== null && activeItem && (
            <g>
              {/* Vertical guideline */}
              <line
                x1={tooltipX}
                y1={paddingTop}
                x2={tooltipX}
                y2={height - paddingBottom}
                stroke="currentColor"
                strokeWidth={1.2}
                className="text-zinc-300 dark:text-zinc-800"
              />

              {/* Revenue dot */}
              <circle
                cx={tooltipX}
                cy={getY(activeItem.revenue)}
                r={4}
                fill="#10b981"
                stroke="white"
                strokeWidth={1.5}
                className="shadow-sm dark:stroke-zinc-950"
              />

              {/* Expenses dot */}
              <circle
                cx={tooltipX}
                cy={getY(activeItem.expenses)}
                r={4}
                fill="#ef4444"
                stroke="white"
                strokeWidth={1.5}
                className="shadow-sm dark:stroke-zinc-950"
              />
            </g>
          )}
        </svg>

        {/* Float html Tooltip */}
        {hoveredIndex !== null && activeItem && (
          <div
            className="pointer-events-none absolute z-20 flex flex-col gap-1 rounded-md border border-border bg-popover/95 p-2 text-[10px] shadow-md backdrop-blur-xs transition-all duration-75 text-popover-foreground"
            style={{
              left: `${Math.min(width - 130, Math.max(paddingLeft + 10, tooltipX - 60))}px`,
              top: `${paddingTop + 10}px`,
              width: "120px",
            }}
          >
            <div className="font-semibold text-foreground">{activeItem.month} 2026</div>
            <div className="flex justify-between border-t border-border pt-1 mt-0.5">
              <span className="text-muted-foreground">{t("financial.revTooltip")}:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ${activeItem.revenue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("financial.expTooltip")}:</span>
              <span className="font-mono font-bold text-destructive">
                ${activeItem.expenses.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t border-dashed border-border pt-1 mt-0.5">
              <span className="text-zinc-400">{t("financial.profitTooltip")}:</span>
              <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">
                ${(activeItem.revenue - activeItem.expenses).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
