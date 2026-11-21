import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional header title for the card */
  title?: React.ReactNode;
  /** Optional subtitle or description */
  description?: React.ReactNode;
  /** Right-aligned header action slot */
  headerActions?: React.ReactNode;
  /** Card footer action slot */
  footer?: React.ReactNode;
}

/**
 * Cal.com inspired FormCard container.
 * Encapsulates grouped settings and forms within a single hairline-bordered container
 * with interior divider rows, eliminating nested card sprawl.
 *
 * @param props - FormCardProps
 * @returns React.ReactElement
 */
export function FormCard({
  title,
  description,
  headerActions,
  footer,
  children,
  className,
  ...props
}: FormCardProps) {
  const hasHeader = title || description || headerActions;

  return (
    <div
      data-slot="form-card"
      className={cn(
        "w-full rounded-xl border border-border/70 bg-card text-card-foreground shadow-subtle overflow-hidden transition-all",
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 px-4 py-3.5 bg-card">
          <div className="space-y-0.5 min-w-0 flex-1">
            {title && (
              <h4 className="text-sm font-semibold tracking-tight text-foreground font-heading truncate">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>
      )}

      <div className="divide-y divide-border/50 px-4 py-1">{children}</div>

      {footer && (
        <div className="border-t border-border/50 bg-muted/20 px-4 py-2.5 flex items-center justify-between gap-3">
          {footer}
        </div>
      )}
    </div>
  );
}

export interface FormCardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * FormCardBody sub-component for freeform or un-divided form content.
 *
 * @param props - FormCardBodyProps
 * @returns React.ReactElement
 */
export function FormCardBody({ children, className, ...props }: FormCardBodyProps) {
  return (
    <div className={cn("px-4 py-4 space-y-4", className)} {...props}>
      {children}
    </div>
  );
}
