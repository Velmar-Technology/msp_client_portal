import * as React from "react";
import { Users, RotateCcw, ArrowLeftRight } from "lucide-react";
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
 * ElevenLabs-style centered empty state with rounded icon card and dual/single actions.
 *
 * @param props - PageEmptyStateProps
 * @returns JSX.Element
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
  className = "",
}: PageEmptyStateProps) {
  // Normalize primary action from props
  const resolvedPrimary: PageEmptyStateAction | undefined = primaryAction ?? (
    actionLabel && onAction
      ? { label: actionLabel, onClick: onAction, icon: RotateCcw }
      : undefined
  );

  const hasActions = Boolean(resolvedPrimary || secondaryAction || children);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px] animate-fade-in",
        className
      )}
      data-testid="page-empty-state"
      data-slot="page-empty-state"
    >
      {connectedIcons ? (
        <div
          className="flex items-center justify-center gap-3 mb-4"
          data-testid="empty-state-connected-icons"
        >
          <div className="size-11 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground/80 shadow-2xs">
            <connectedIcons.from className="size-5" />
          </div>
          <div className="flex items-center text-muted-foreground/60">
            <ArrowLeftRight className="size-4" />
          </div>
          <div className="size-11 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground/80 shadow-2xs">
            <connectedIcons.to className="size-5" />
          </div>
        </div>
      ) : (
        <div className="size-11 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground/80 mb-3 shadow-2xs">
          <Icon className="size-5" />
        </div>
      )}

      <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-5">
        {description}
      </p>

      {hasActions && (
        <div className="flex items-center gap-2.5 flex-wrap justify-center">
          {resolvedPrimary && (
            <Button
              variant="default"
              size="xs"
              onClick={resolvedPrimary.onClick}
              className="h-8 rounded-full px-4 text-xs font-semibold shadow-2xs gap-1.5 cursor-pointer"
            >
              {resolvedPrimary.icon && (
                <resolvedPrimary.icon className="size-3.5" />
              )}
              <span>{resolvedPrimary.label}</span>
            </Button>
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Button
                asChild
                variant="outline"
                size="xs"
                className="h-8 rounded-full px-3.5 text-xs font-medium border-border/80 hover:bg-muted/60 gap-1.5 cursor-pointer"
              >
                <a
                  href={secondaryAction.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {secondaryAction.icon && (
                    <secondaryAction.icon className="size-3.5" />
                  )}
                  <span>{secondaryAction.label}</span>
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={secondaryAction.onClick}
                className="h-8 rounded-full px-3.5 text-xs font-medium border-border/80 hover:bg-muted/60 gap-1.5 cursor-pointer"
              >
                {secondaryAction.icon && (
                  <secondaryAction.icon className="size-3.5" />
                )}
                <span>{secondaryAction.label}</span>
              </Button>
            )
          )}

          {children}
        </div>
      )}
    </div>
  );
}
