import * as React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PageStatusBarProps } from "./types";

/**
 * Odoo-style Status Bar / Stage Pipeline for detail and form pages.
 * Displays action buttons on the left and sequential workflow stages on the right.
 */
export function PageStatusBar({
  stages = [],
  currentStageId,
  onStageSelect,
  actions,
  className,
  ...props
}: PageStatusBarProps) {
  if (!stages.length && !actions) {
    return null;
  }

  const currentIndex = stages.findIndex((s) => s.id === currentStageId || s.isCurrent);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 p-2 mb-4 rounded-md border border-border bg-card/60 backdrop-blur-xs",
        className
      )}
      {...props}
    >
      {/* Action buttons (Left) */}
      <div className="flex items-center gap-1.5 shrink-0 empty:hidden">
        {actions}
      </div>

      {/* Sequential Stages (Right) */}
      {stages.length > 0 && (
        <div className="flex items-center overflow-x-auto scrollbar-none py-0.5 ml-auto">
          <ol className="flex items-center rounded-sm bg-muted/40 p-0.5 border border-border/60">
            {stages.map((stage, index) => {
              const isCurrent = stage.id === currentStageId || stage.isCurrent || index === currentIndex;
              const isCompleted = stage.isCompleted || (currentIndex !== -1 && index < currentIndex);
              const isClickable = Boolean(onStageSelect || stage.onClick) && !stage.disabled;

              return (
                <React.Fragment key={stage.id}>
                  <li>
                    <button
                      type="button"
                      disabled={stage.disabled || !isClickable}
                      onClick={() => {
                        stage.onClick?.();
                        onStageSelect?.(stage.id);
                      }}
                      className={cn(
                        "h-6 px-2.5 flex items-center gap-1 text-xs font-medium rounded-xs transition-colors select-none",
                        isClickable ? "cursor-pointer" : "cursor-default",
                        isCurrent && "bg-primary text-primary-foreground font-semibold shadow-xs",
                        isCompleted && !isCurrent && "text-foreground hover:bg-muted/80",
                        !isCurrent && !isCompleted && "text-muted-foreground hover:bg-muted/50",
                        stage.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCompleted && !isCurrent && <Check className="size-3 text-primary shrink-0" />}
                      <span>{stage.label}</span>
                    </button>
                  </li>
                  {index < stages.length - 1 && (
                    <ChevronRight className="size-3 text-muted-foreground/40 shrink-0 mx-0.5" />
                  )}
                </React.Fragment>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
