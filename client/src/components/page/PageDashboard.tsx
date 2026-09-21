import { cn } from "@/lib/utils";
import { MetricCard } from "@/components/shared/MetricCard";
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
 * Displays a high-level aggregate value, title, trend badge, and optional subtitle.
 * Delegated to the canonical L2 MetricCard primitive for unified density and design tokens.
 *
 * @param props - Metric card data and callbacks.
 * @returns Metric card element.
 */
export function PageDashboardKpi({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  onClick,
  className,
  children,
  ...props
}: PageDashboardKpiProps) {
  return (
    <MetricCard
      data-slot="page-dashboard-kpi"
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      trend={trend}
      badge={badge}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </MetricCard>
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
