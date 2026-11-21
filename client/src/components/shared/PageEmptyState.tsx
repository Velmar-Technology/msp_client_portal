import * as React from "react";
import { Users, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageConnectedIcons {
  from: LucideIcon | React.ComponentType<{ className?: string }>;
  to: LucideIcon | React.ComponentType<{ className?: string }>;
  label?: string;
}

export interface PageEmptyStateAction {
  /** Button label */
  label: string;
  /** Click callback */
  onClick?: () => void;
  /** External or route link */
  href?: string;
  /** Leading icon */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
}

export interface PageEmptyStateProps {
  /** Center icon */
  icon?: React.ComponentType<{ className?: string }>;
  /** Connected dual-icon integration flow (e.g. [ Box ] <--> [ Pause ]) */
  connectedIcons?: PageConnectedIcons;
  /** Empty state heading */
  title: string;
  /** Empty state explanatory text */
  description: string;
  /** Primary action shorthand label */
  actionLabel?: string;
  /** Primary action shorthand click handler */
  onAction?: () => void;
  /** Structured primary action */
  primaryAction?: PageEmptyStateAction;
  /** Structured secondary action */
  secondaryAction?: PageEmptyStateAction;
  /** Custom action slot or child elements */
  children?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Centered empty state with rounded icon card and dual/single actions.
 */
export function PageEmptyState({
  icon: Icon = Users,
  connectedIcons,
  title,
  description,
  actionLabel,
  onAction,
  primaryAction,
  secondaryAction,
  children,
  className,
}: PageEmptyStateProps) {
  // Normalize primary action: explicit primaryAction takes precedence over actionLabel/onAction
  const effectivePrimary: PageEmptyStateAction | undefined = primaryAction
    ? primaryAction
    : actionLabel && onAction
    ? { label: actionLabel, onClick: onAction }
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center select-none animate-fade-in",
        className
      )}
      data-slot="page-empty-state"
      data-testid="page-empty-state"
    >
      {/* Visual Icon Badge: Connected flow or Single Halo */}
      {connectedIcons ? (
        <div data-testid="empty-state-connected-icons" className="flex items-center gap-3 mb-5">
          <div className="size-12 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center shadow-xs">
            <connectedIcons.from className="size-6 text-foreground" />
          </div>
          <div className="flex items-center text-muted-foreground/60">
            <ArrowLeftRight className="size-4" />
          </div>
          <div className="size-12 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center shadow-xs">
            <connectedIcons.to className="size-6 text-foreground" />
          </div>
        </div>
      ) : (
        <div className="size-14 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-center mb-5 shadow-xs">
          <Icon className="size-7 text-muted-foreground" />
        </div>
      )}

      {/* Title & Description */}
      <h3 className="text-base font-semibold text-foreground tracking-tight mb-1.5 font-heading">
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* Action Buttons */}
      {(effectivePrimary || secondaryAction || children) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {effectivePrimary && (
            <Button
              size="sm"
              onClick={effectivePrimary.onClick}
              asChild={Boolean(effectivePrimary.href)}
              className="h-8 px-4 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
            >
              {effectivePrimary.href ? (
                <a href={effectivePrimary.href}>
                  {effectivePrimary.icon && (
                    <effectivePrimary.icon className="size-3.5" />
                  )}
                  <span>{effectivePrimary.label}</span>
                </a>
              ) : (
                <>
                  {effectivePrimary.icon && (
                    <effectivePrimary.icon className="size-3.5" />
                  )}
                  <span>{effectivePrimary.label}</span>
                </>
              )}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={secondaryAction.onClick}
              asChild={Boolean(secondaryAction.href)}
              className="h-8 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {secondaryAction.href ? (
                <a href={secondaryAction.href}>
                  {secondaryAction.icon && (
                    <secondaryAction.icon className="size-3.5" />
                  )}
                  <span>{secondaryAction.label}</span>
                </a>
              ) : (
                <>
                  {secondaryAction.icon && (
                    <secondaryAction.icon className="size-3.5" />
                  )}
                  <span>{secondaryAction.label}</span>
                </>
              )}
            </Button>
          )}

          {children}
        </div>
      )}
    </div>
  );
}

export { PageEmptyState as EmptyState };
