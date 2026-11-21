import * as React from "react";
import { cn } from "@/lib/utils";
import type { PageStatBoxProps, PageStatButtonProps } from "./types";

/**
 * Container for Odoo-style smart stat buttons (`oe_button_box`).
 * Positioned typically in the top-right corner of a Form Header or Sheet.
 *
 * @param props - HTML div props for the button box container.
 * @returns Flex wrapper for stat buttons.
 */
export function PageStatBox({ className, children, ...props }: PageStatBoxProps) {
  return (
    <div
      data-slot="page-stat-box"
      className={cn("flex flex-wrap items-center gap-1.5 justify-end empty:hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Enterprise Odoo-style Smart Stat Button (`oe_stat_button`).
 * Renders an actionable metric tile with an icon, numeric value, and label.
 *
 * @param props - Configuration props for the stat button.
 * @returns An interactive metric button.
 */
export function PageStatButton({
  icon: Icon,
  value,
  label,
  badge,
  active = false,
  className,
  children,
  onClick,
  disabled,
  ...props
}: PageStatButtonProps) {
  const isIconComponent =
    typeof Icon === "function" ||
    (typeof Icon === "object" && Icon !== null && !React.isValidElement(Icon));

  return (
    <button
      type="button"
      data-slot="page-stat-button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-10 min-w-24 px-3 py-1 border rounded-md flex items-center gap-2.5 transition-all text-left select-none",
        "border-border/70 bg-card hover:bg-muted/50 hover:border-primary/40",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        active && "bg-primary/10 border-primary/40 text-primary hover:bg-primary/15",
        disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer",
        className
      )}
      {...props}
    >
      {/* Icon */}
      {Icon && (
        <div className="shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
          {isIconComponent ? (
            React.createElement(Icon as React.ComponentType<{ className?: string }>, {
              className: "size-4 text-primary",
            })
          ) : (
            Icon
          )}
        </div>
      )}

      {/* Value & Label Column */}
      <div className="flex flex-col justify-center min-w-0 flex-1 leading-tight">
        {value !== undefined && (
          <span className="text-xs font-bold text-foreground truncate tracking-tight">
            {value}
          </span>
        )}
        <span className="text-[10px] uppercase font-semibold text-muted-foreground truncate tracking-wider">
          {label}
        </span>
      </div>

      {/* Badge / Secondary Indicator */}
      {badge && <div className="shrink-0">{badge}</div>}

      {children}
    </button>
  );
}
