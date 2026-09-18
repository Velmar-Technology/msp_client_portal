import * as React from "react";
import { cn } from "@/lib/utils";
import type { PageFieldGroupProps, PageFieldProps } from "./types";

const colsClasses: Record<1 | 2 | 3 | 4, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

/**
 * Enterprise Odoo-inspired Field Group (`<group>`).
 * Provides a responsive multi-column grid layout for form fields and record attributes.
 *
 * @param props - Configuration and children for the field group.
 * @returns Grid layout container for fields.
 */
export function PageFieldGroup({
  title,
  cols = 2,
  children,
  className,
  ...props
}: PageFieldGroupProps) {
  return (
    <div data-slot="page-field-group" className={cn("space-y-2.5", className)} {...props}>
      {title && (
        <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground border-b border-border/40 pb-1 mb-2">
          {title}
        </h3>
      )}
      <div className={cn("grid gap-x-6 gap-y-3.5 items-start", colsClasses[cols])}>
        {children}
      </div>
    </div>
  );
}

/**
 * Enterprise Odoo-inspired Field (`<field>`).
 * Displays a single labeled data field or input with label, icon, and value.
 *
 * @param props - Configuration and children for the field item.
 * @returns Field element.
 */
export function PageField({
  label,
  icon: Icon,
  help,
  orientation = "vertical",
  children,
  className,
  ...props
}: PageFieldProps) {
  const isIconComponent =
    typeof Icon === "function" ||
    (typeof Icon === "object" && Icon !== null && !React.isValidElement(Icon));

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      data-slot="page-field"
      className={cn(
        isHorizontal
          ? "flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 py-1"
          : "space-y-1 py-0.5",
        className
      )}
      {...props}
    >
      {label && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
          {Icon && (
            <span className="shrink-0 text-muted-foreground">
              {isIconComponent ? (
                React.createElement(Icon as React.ComponentType<{ className?: string }>, {
                  className: "size-3.5",
                })
              ) : (
                Icon
              )}
            </span>
          )}
          <span>{label}</span>
          {help && <span className="text-[11px] text-muted-foreground/70">({help})</span>}
        </div>
      )}

      <div className="text-xs text-foreground font-normal min-w-0">{children}</div>
    </div>
  );
}
