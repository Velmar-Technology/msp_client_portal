import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface SummaryCardProps {
  /** Main icon displayed in the top-right icon box */
  icon?: React.ReactNode;
  /** Optional badge displayed in the header */
  badge?: React.ReactNode;
  /** Card title / category label */
  title: React.ReactNode;
  /** Primary metric value */
  value: React.ReactNode;
  /** Optional trend percentage or string (e.g. "+12.5%", "-3.2%") or custom node */
  trend?: React.ReactNode;
  /** Flag determining positive (emerald) vs negative (red) trend styling */
  isPositiveTrend?: boolean;
  /** Optional sub-label or comparison text (e.g. "vs last month") */
  subtitle?: React.ReactNode;
  /** Optional footer section displayed below a subtle divider */
  footer?: React.ReactNode;
  /** Loading state indicator showing animated skeleton placeholders */
  isLoading?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Optional click handler making the card interactive */
  onClick?: () => void;
}

export function SummaryCard({
  icon,
  badge,
  title,
  value,
  trend,
  isPositiveTrend,
  subtitle,
  footer,
  isLoading = false,
  className,
  onClick,
}: SummaryCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "group rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 flex flex-col justify-between min-h-[120px]",
          className
        )}
        aria-busy="true"
        aria-live="polite"
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

  return (
    <div
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
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
        "group rounded-lg border border-border bg-card p-3.5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm flex flex-col justify-between min-h-[120px]",
        isInteractive && "cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-ring",
        className
      )}
    >
      <div>
        {/* Top Header Row: Label & (Badge + Icon) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              typeof badge === 'string' || typeof badge === 'number' ? (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium bg-muted text-muted-foreground border border-border">
                  {badge}
                </span>
              ) : (
                badge
              )
            )}
            {icon && (
              <div className="rounded-md bg-muted/60 p-1.5 text-muted-foreground transition-colors group-hover:bg-muted shrink-0">
                {icon}
              </div>
            )}
          </div>
        </div>

        {/* Middle Value Row: Primary Value & Trend Pill */}
        <div className="mt-2.5 flex items-baseline justify-between gap-2">
          <div className="text-xl font-bold tracking-tight text-foreground truncate">
            {value}
          </div>

          {trend !== undefined && trend !== null && (
            typeof trend === 'string' || typeof trend === 'number' ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none shrink-0",
                  isPositiveTrend === true && "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
                  isPositiveTrend === false && "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
                  isPositiveTrend === undefined && "bg-muted text-muted-foreground border border-border"
                )}
              >
                {isPositiveTrend === true && <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />}
                {isPositiveTrend === false && <ArrowDownRight className="h-2.5 w-2.5 shrink-0" />}
                {trend}
              </span>
            ) : (
              trend
            )
          )}
        </div>

        {/* Subtitle / Sub-label */}
        {subtitle && (
          typeof subtitle === 'string' || typeof subtitle === 'number' ? (
            <p className="mt-1 text-[9px] text-muted-foreground truncate">
              {subtitle}
            </p>
          ) : (
            <div className="mt-1 text-[9px] text-muted-foreground">
              {subtitle}
            </div>
          )
        )}
      </div>

      {/* Footer Section */}
      {footer && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="text-[9px] text-muted-foreground font-mono flex items-center justify-between">
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

export default SummaryCard;
