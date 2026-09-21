import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trend metadata for MetricCard.
 */
export interface MetricCardTrend {
  /** Metric delta or percentage representation (e.g. "+12%", "-3.4%") */
  value: React.ReactNode;
  /** Direction indicator */
  direction?: "up" | "down" | "neutral";
  /** Flag determining positive (emerald) vs negative (rose) trend styling */
  isPositive?: boolean;
}

/**
 * Props for the unified Level 2 MetricCard primitive.
 */
export interface MetricCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Card title / metric category label */
  title?: React.ReactNode;
  /** Primary metric value display */
  value?: React.ReactNode;
  /** Icon element or Lucide icon component displayed in the top-right header */
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  /** Optional badge displayed alongside the header icon */
  badge?: React.ReactNode;
  /** Trend information object, custom ReactNode, or primitive value */
  trend?: MetricCardTrend | React.ReactNode;
  /** Fallback flag determining trend sentiment when trend is a raw ReactNode */
  isPositiveTrend?: boolean;
  /** Optional subtitle or comparison description (e.g. "vs last month") */
  subtitle?: React.ReactNode;
  /** Optional description alias for subtitle */
  description?: React.ReactNode;
  /** Optional footer section placed beneath a subtle divider */
  footer?: React.ReactNode;
  /** Loading state indicator rendering animated skeleton placeholders */
  isLoading?: boolean;
  /** Optional click handler enabling interactive elevation and keyboard navigation */
  onClick?: () => void;
  /** Additional CSS class overrides */
  className?: string;
  /** Custom children for compound layout composition */
  children?: React.ReactNode;
}

/**
 * Helper to normalize and render icon elements or component types.
 */
function renderIconNode(icon: React.ReactNode | React.ComponentType<{ className?: string }>) {
  if (!icon) return null;
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null && !React.isValidElement(icon))) {
    const IconComp = icon as React.ComponentType<{ className?: string }>;
    return <IconComp className="size-4 text-primary" />;
  }
  return icon;
}

/**
 * Canonical Level 2 MetricCard primitive.
 * Unifies StatCard, SummaryCard, and PageDashboardKpi into a single hybrid design token standard.
 *
 * @param props - Card configuration props or compound children.
 * @returns Metric card component.
 */
export function MetricCardRoot({
  title,
  value,
  icon,
  badge,
  trend,
  isPositiveTrend,
  subtitle,
  description,
  footer,
  isLoading = false,
  onClick,
  className,
  children,
  ...props
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div
        data-slot="metric-card"
        aria-busy="true"
        aria-live="polite"
        className={cn(
          "group rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 flex flex-col justify-between min-h-30 select-none",
          className,
        )}
        {...props}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <Skeleton className="h-3.5 w-24 rounded-xs" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            <Skeleton className="h-6 w-20 rounded-xs" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-16 mt-2 rounded-xs" />
        </div>
        {footer && (
          <div className="mt-3 pt-2 border-t border-border">
            <Skeleton className="h-3 w-28 rounded-xs" />
          </div>
        )}
      </div>
    );
  }

  const isInteractive = Boolean(onClick);

  // If children are provided without flat props, act purely as a compound container
  if (children && !title && value === undefined) {
    return (
      <div
        data-slot="metric-card"
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={cn(
          "group rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 min-h-30 flex flex-col justify-between",
          isInteractive &&
            "cursor-pointer hover:border-primary/40 hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring select-none",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Parse trend object vs primitive/ReactNode
  let trendContent: React.ReactNode = null;
  let isPositive: boolean | undefined = isPositiveTrend;
  let isNegative = false;
  let isNeutral = false;

  if (trend !== undefined && trend !== null) {
    if (typeof trend === "object" && !React.isValidElement(trend) && "value" in (trend as object)) {
      const trendObj = trend as MetricCardTrend;
      trendContent = trendObj.value;
      if (trendObj.direction === "neutral") {
        isNeutral = true;
      } else if (trendObj.isPositive !== undefined) {
        isPositive = trendObj.isPositive;
        isNegative = !trendObj.isPositive;
      } else if (trendObj.direction === "up") {
        isPositive = true;
      } else if (trendObj.direction === "down") {
        isNegative = true;
      }
    } else {
      trendContent = trend as React.ReactNode;
      if (isPositiveTrend === true) {
        isPositive = true;
      } else if (isPositiveTrend === false) {
        isNegative = true;
      } else {
        isNeutral = true;
      }
    }
  }

  return (
    <div
      data-slot="metric-card"
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "group rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 min-h-30 flex flex-col justify-between",
        isInteractive &&
          "cursor-pointer hover:border-primary/40 hover:shadow-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring select-none",
        className,
      )}
      {...props}
    >
      <div>
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          {title && (
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {badge &&
              (typeof badge === "string" || typeof badge === "number" ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground border border-border">
                  {badge}
                </span>
              ) : (
                badge
              ))}
            {icon && (
              <div className="rounded-md bg-muted/60 p-1.5 text-muted-foreground transition-colors group-hover:bg-muted shrink-0">
                {renderIconNode(icon)}
              </div>
            )}
          </div>
        </div>

        {/* Middle Value & Trend Row */}
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          {value !== undefined && (
            <div className="text-xl font-bold tracking-tight text-foreground font-heading truncate">{value}</div>
          )}

          {trendContent !== null &&
            (typeof trendContent === "string" || typeof trendContent === "number" ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none shrink-0 font-mono",
                  isPositive && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                  isNegative && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                  isNeutral && "bg-muted text-muted-foreground border border-border/60",
                )}
              >
                {isPositive && <ArrowUpRight className="size-2.5 shrink-0" />}
                {isNegative && <ArrowDownRight className="size-2.5 shrink-0" />}
                {isNeutral && <Minus className="size-2.5 shrink-0" />}
                {trendContent}
              </span>
            ) : (
              trendContent
            ))}
        </div>

        {/* Subtitle / Description */}
        {(subtitle || description) &&
          (typeof (subtitle ?? description) === "string" || typeof (subtitle ?? description) === "number" ? (
            <p className="mt-1 text-[9px] text-muted-foreground truncate">{subtitle ?? description}</p>
          ) : (
            <div className="mt-1 text-[9px] text-muted-foreground">{subtitle ?? description}</div>
          ))}

        {/* Optional Inner Child Content */}
        {children && <div className="mt-2">{children}</div>}
      </div>

      {/* Footer Section */}
      {footer && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[9px] text-muted-foreground font-mono flex items-center justify-between">{footer}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compound Subcomponents
// ---------------------------------------------------------------------------

export function MetricCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div data-slot="metric-card-header" className={cn("flex items-center justify-between gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export function MetricCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="metric-card-title"
      className={cn("text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate", className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function MetricCardIcon({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="metric-card-icon"
      className={cn(
        "rounded-md bg-muted/60 p-1.5 text-muted-foreground transition-colors group-hover:bg-muted shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCardBadge({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="metric-card-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground border border-border",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function MetricCardValue({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="metric-card-value"
      className={cn("text-xl font-bold tracking-tight text-foreground font-heading truncate mt-2.5", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function MetricCardSubtitle({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="metric-card-subtitle"
      className={cn("mt-1 text-[9px] text-muted-foreground truncate", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function MetricCardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="metric-card-footer"
      className={cn(
        "mt-3 pt-2 border-t border-border text-[9px] text-muted-foreground font-mono flex items-center justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Assemble Compound Component
export const MetricCard = Object.assign(MetricCardRoot, {
  Header: MetricCardHeader,
  Title: MetricCardTitle,
  Icon: MetricCardIcon,
  Badge: MetricCardBadge,
  Value: MetricCardValue,
  Subtitle: MetricCardSubtitle,
  Footer: MetricCardFooter,
});

export default MetricCard;
