import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PageDashboardProps,
  PageDashboardKpiProps,
  PageDashboardSectionProps,
} from "./types";

const colsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  auto: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
};

const gapClasses = {
  sm: "gap-3",
  default: "gap-4 sm:gap-6",
  lg: "gap-6 sm:gap-8",
};

/**
 * Enterprise Dashboard grid container for analytical record metrics.
 *
 * @param props - Configuration and children for the dashboard grid.
 * @returns Responsive grid container.
 */
export function PageDashboard({
  cols = "auto",
  gap = "default",
  className,
  children,
  ...props
}: PageDashboardProps) {
  return (
    <div
      data-slot="page-dashboard"
      className={cn("grid w-full items-start", colsClasses[cols], gapClasses[gap], className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Enterprise Dashboard KPI metric tile.
 * Displays a high-level aggregate value, title, trend badge, and optional subtitle.
 *
 * @param props - Metric card data and callbacks.
 * @returns Metric card element.
 */
export function PageDashboardKpi({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
  onClick,
  className,
  children,
  ...props
}: PageDashboardKpiProps) {
  const isIconComponent =
    typeof Icon === "function" ||
    (typeof Icon === "object" && Icon !== null && !React.isValidElement(Icon));

  const isClickable = Boolean(onClick);

  // Determine trend badge appearance
  const isPositive = trend?.isPositive ?? (trend?.direction === "up");
  const isNegative = trend ? !isPositive && trend.direction !== "neutral" : false;

  return (
    <div
      data-slot="page-dashboard-kpi"
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (isClickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-lg p-4 sm:p-5 shadow-2xs transition-all flex flex-col justify-between select-none min-w-0",
        isClickable &&
          "cursor-pointer hover:border-primary/50 hover:shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {/* Top row: Title and Icon/Badge */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
          {title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && <div>{badge}</div>}
          {Icon && (
            <div className="text-muted-foreground/80">
              {isIconComponent ? (
                React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                  className: "size-4 text-primary",
                })
              ) : (
                Icon
              )}
            </div>
          )}
        </div>
      </div>

      {/* Middle row: Big Metric Value */}
      <div className="py-1">
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading truncate">
          {value}
        </div>
      </div>

      {/* Bottom row: Trend badge & subtitle */}
      {(trend || subtitle) && (
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground flex-wrap">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[11px] font-semibold font-mono tracking-tight shrink-0",
                isPositive &&
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                isNegative &&
                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                trend.direction === "neutral" &&
                  "bg-muted text-muted-foreground border border-border/60"
              )}
            >
              {isPositive && <TrendingUp className="size-3" />}
              {isNegative && <TrendingDown className="size-3" />}
              {trend.direction === "neutral" && <Minus className="size-3" />}
              <span>{trend.value}</span>
            </span>
          )}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>
      )}

      {children}
    </div>
  );
}

/**
 * Enterprise Dashboard Section container grouping charts or complex widgets.
 *
 * @param props - Section container configuration.
 * @returns Grouped card container.
 */
export function PageDashboardSection({
  title,
  subtitle,
  actions,
  className,
  children,
  ...props
}: PageDashboardSectionProps) {
  return (
    <section
      data-slot="page-dashboard-section"
      className={cn(
        "bg-card text-card-foreground border border-border/80 rounded-lg p-5 sm:p-6 shadow-2xs space-y-4",
        className
      )}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="space-y-0.5 min-w-0">
            {title && (
              <h2 className="text-sm sm:text-base font-bold text-foreground font-heading tracking-tight truncate">
                {title}
              </h2>
            )}
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
