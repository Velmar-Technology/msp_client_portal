import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListGroupProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Whether the list has rounded corners and hairline border */
  bordered?: boolean;
}

/**
 * Enterprise ListGroup container adapted from Cal.com UI components.
 * Enforces hairline 1px dividers, rounded-lg container boundaries,
 * and high-density content rows without outer box shadows.
 *
 * @param props - ListGroupProps
 * @returns React.ReactElement
 * @see Cal.com List.tsx
 */
export function ListGroup({
  bordered = true,
  className,
  children,
  ...props
}: ListGroupProps) {
  return (
    <ul
      data-slot="list-group"
      className={cn(
        "w-full divide-y divide-border/50 bg-card transition-all",
        bordered && "rounded-lg border border-border/70 overflow-hidden shadow-subtle",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export interface ListItemProps extends Omit<React.HTMLAttributes<HTMLLIElement>, "title"> {
  /** Optional navigation URL (renders as router Link) */
  href?: string;
  /** Explicit click handler */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** Leading icon, avatar, or badge slot */
  leading?: React.ReactNode;
  /** Primary title text or element */
  title?: React.ReactNode;
  /** Subtitle or metadata description */
  description?: React.ReactNode;
  /** Trailing content (badges, actions, timestamp) */
  trailing?: React.ReactNode;
  /** Whether to show a trailing chevron arrow */
  showChevron?: boolean;
  /** Whether the item is in an active or selected state */
  active?: boolean;
  /** Whether the item is a destructive/danger action */
  danger?: boolean;
  /** Whether the item is disabled */
  disabled?: boolean;
}

/**
 * High-density ListItem row for Cal-style ListGroup.
 *
 * @param props - ListItemProps
 * @returns React.ReactElement
 * @see Cal.com ListItem.tsx
 */
export function ListItem({
  href,
  onClick,
  leading,
  title,
  description,
  trailing,
  showChevron = false,
  active = false,
  danger = false,
  disabled = false,
  className,
  children,
  ...props
}: ListItemProps) {
  const isInteractive = Boolean(href || onClick) && !disabled;

  const content = children ? (
    children
  ) : (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1 space-y-0.5">
          {title && (
            <div
              className={cn(
                "text-xs sm:text-sm font-medium truncate",
                danger ? "text-destructive font-semibold" : "text-foreground"
              )}
            >
              {title}
            </div>
          )}
          {description && (
            <div className="text-[11px] sm:text-xs text-muted-foreground truncate">
              {description}
            </div>
          )}
        </div>
      </div>

      {(trailing || showChevron) && (
        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          {trailing}
          {showChevron && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      )}
    </>
  );

  const itemClasses = cn(
    "group flex items-center justify-between p-3 sm:px-4 text-xs transition-colors",
    isInteractive && (danger ? "cursor-pointer hover:bg-destructive/5" : "cursor-pointer hover:bg-muted/40"),
    active && "bg-secondary/40 font-semibold",
    danger && !isInteractive && "text-destructive",
    disabled && "opacity-50 pointer-events-none cursor-not-allowed",
    className
  );

  if (href && !disabled) {
    return (
      <li data-slot="list-item" className="list-none">
        <Link to={href} className={itemClasses} onClick={onClick}>
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li
      data-slot="list-item"
      className={itemClasses}
      onClick={isInteractive ? onClick : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      {...props}
    >
      {content}
    </li>
  );
}
