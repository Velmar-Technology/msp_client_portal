import React from "react";
import { Users, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PageEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * ElevenLabs-style centered empty state with rounded icon card and primary action.
 *
 * @param props - PageEmptyStateProps
 * @returns JSX.Element
 */
export function PageEmptyState({
  icon: Icon = Users,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: PageEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center min-h-[300px] animate-fade-in ${className}`}
      data-testid="page-empty-state"
    >
      <div className="size-11 rounded-2xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground/80 mb-3 shadow-2xs">
        <Icon className="size-5" />
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h3>

      <p className="text-xs text-muted-foreground max-w-sm leading-relaxed mb-4">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          variant="outline"
          size="xs"
          onClick={onAction}
          className="h-7 rounded-full px-3 text-xs font-medium border-border/80 hover:bg-muted/60 gap-1.5"
        >
          <RotateCcw className="size-3" />
          <span>{actionLabel}</span>
        </Button>
      )}
    </div>
  );
}
