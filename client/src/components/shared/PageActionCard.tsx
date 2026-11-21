import * as React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageActionGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * Grid container for quick action cards.
 * Positions action cards horizontally with responsive wrapping.
 *
 * @param props HTMLDivElement props
 */
export function PageActionGrid({
  children,
  className,
  ...props
}: PageActionGridProps) {
  return (
    <div
      data-slot="page-action-grid"
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface PageActionCardProps {
  /** Main title / label for the action */
  title: React.ReactNode;
  /** Optional secondary subtitle or explanation */
  description?: React.ReactNode;
  /** Leading icon for the action */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Click handler if used as a trigger button */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Route path if used as a router navigation link */
  to?: string;
  /** External URL if used as an anchor */
  href?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Optional trailing element or badge */
  badge?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

/**
 * Interactive card representing a primary action or creation shortcut.
 * Matches ElevenLabs minimalist card pattern with icon and title.
 *
 * @param props PageActionCardProps
 */
export function PageActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  to,
  href,
  disabled = false,
  badge,
  className,
}: PageActionCardProps) {
  const commonClasses = cn(
    "relative flex flex-col justify-between items-start text-left p-4 rounded-xl border border-border/80 bg-card/60 transition-all duration-200 select-none group",
    !disabled && "hover:bg-muted/40 hover:border-foreground/20 hover:shadow-2xs cursor-pointer active:scale-[0.99]",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
    className
  );

  const innerContent = (
    <>
      <div className="flex items-center justify-between w-full mb-3">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground group-hover:bg-accent transition-colors">
            <Icon className="h-4 w-4" />
          </div>
        )}
        {badge && <div>{badge}</div>}
      </div>
      <div className="w-full">
        <span className="block text-sm font-medium text-foreground tracking-tight group-hover:text-foreground">
          {title}
        </span>
        {description && (
          <span className="block text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </span>
        )}
      </div>
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} data-slot="page-action-card" className={commonClasses}>
        {innerContent}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-slot="page-action-card"
        className={commonClasses}
      >
        {innerContent}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-slot="page-action-card"
      className={commonClasses}
    >
      {innerContent}
    </button>
  );
}
