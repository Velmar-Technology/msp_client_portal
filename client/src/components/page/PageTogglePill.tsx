import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageTogglePillProps {
  /** Label for the toggle pill */
  label: React.ReactNode;
  /** Whether the pill is currently active */
  active: boolean;
  /** Callback when toggle state changes */
  onToggle: (nextActive: boolean) => void;
  /** Optional leading icon */
  icon?: LucideIcon | React.ComponentType<{ className?: string }>;
  /** Disabled state */
  disabled?: boolean;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional test id */
  "data-testid"?: string;
}

/**
 * ElevenLabs-style toggle pill button with leading icon and active tag state.
 * Unlike PageFilterPill, this toggles boolean state directly on click without a dropdown.
 *
 * @param props PageTogglePillProps
 * @returns JSX.Element
 */
export function PageTogglePill({
  label,
  active,
  onToggle,
  icon: Icon,
  disabled = false,
  className,
  "data-testid": testId,
}: PageTogglePillProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) {
      onToggle(!active);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={handleClick}
      data-slot="page-toggle-pill"
      data-testid={testId || `toggle-pill-${typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : "item"}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors select-none shadow-2xs cursor-pointer",
        active
          ? "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
          : "border border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" />}
      <span>{label}</span>
    </button>
  );
}
