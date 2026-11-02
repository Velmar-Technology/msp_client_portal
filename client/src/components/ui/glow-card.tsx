import * as React from "react";
import { cn } from "@/lib/utils";

export type GlowCardVariant = "neon" | "emerald" | "amber" | "rose" | "slate" | "default";

export interface GlowCardProps extends React.ComponentProps<"div"> {
  variant?: GlowCardVariant;
  glowClassName?: string;
  innerClassName?: string;
}

const GLOW_VARIANTS: Record<
  GlowCardVariant,
  {
    borderGradient: string;
    ambientGlow: string;
    lightBorderGradient: string;
  }
> = {
  neon: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(6,182,212,0.95)_0%,rgba(99,102,241,0.85)_30%,rgba(168,85,247,0.75)_60%,rgba(255,255,255,0.06)_100%)]",
    ambientGlow: "from-cyan-500/35 via-indigo-500/25 to-purple-600/30",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(6,182,212,0.7)_0%,rgba(99,102,241,0.6)_35%,rgba(168,85,247,0.5)_65%,rgba(0,0,0,0.06)_100%)]",
  },
  emerald: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(16,185,129,0.95)_0%,rgba(20,184,166,0.85)_40%,rgba(13,148,136,0.6)_70%,rgba(255,255,255,0.06)_100%)]",
    ambientGlow: "from-emerald-500/35 via-teal-500/25 to-emerald-600/30",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(16,185,129,0.7)_0%,rgba(20,184,166,0.6)_40%,rgba(13,148,136,0.5)_70%,rgba(0,0,0,0.06)_100%)]",
  },
  amber: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(245,158,11,0.95)_0%,rgba(249,115,22,0.85)_40%,rgba(217,119,6,0.6)_70%,rgba(255,255,255,0.06)_100%)]",
    ambientGlow: "from-amber-500/35 via-orange-500/25 to-amber-600/30",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(245,158,11,0.7)_0%,rgba(249,115,22,0.6)_40%,rgba(217,119,6,0.5)_70%,rgba(0,0,0,0.06)_100%)]",
  },
  rose: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(244,63,94,0.95)_0%,rgba(239,68,68,0.85)_40%,rgba(225,29,72,0.6)_70%,rgba(255,255,255,0.06)_100%)]",
    ambientGlow: "from-rose-500/35 via-pink-500/25 to-red-600/30",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(244,63,94,0.7)_0%,rgba(239,68,68,0.6)_40%,rgba(225,29,72,0.5)_70%,rgba(0,0,0,0.06)_100%)]",
  },
  slate: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(148,163,184,0.6)_0%,rgba(100,116,139,0.4)_40%,rgba(71,85,105,0.2)_70%,rgba(255,255,255,0.04)_100%)]",
    ambientGlow: "from-slate-400/20 via-zinc-500/15 to-zinc-600/20",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(148,163,184,0.5)_0%,rgba(100,116,139,0.3)_40%,rgba(71,85,105,0.15)_70%,rgba(0,0,0,0.04)_100%)]",
  },
  default: {
    borderGradient:
      "bg-[linear-gradient(135deg,rgba(6,182,212,0.95)_0%,rgba(99,102,241,0.85)_30%,rgba(168,85,247,0.75)_60%,rgba(255,255,255,0.06)_100%)]",
    ambientGlow: "from-cyan-500/35 via-indigo-500/25 to-purple-600/30",
    lightBorderGradient:
      "bg-[linear-gradient(135deg,rgba(6,182,212,0.7)_0%,rgba(99,102,241,0.6)_35%,rgba(168,85,247,0.5)_65%,rgba(0,0,0,0.06)_100%)]",
  },
};

/**
 * GlowCard Component
 * High-tech elevated card featuring a top-left gradient border highlight,
 * an ambient backlight bloom on hover, and theme adaptability.
 */
export function GlowCard({
  variant = "neon",
  className,
  glowClassName,
  innerClassName,
  children,
  ...props
}: GlowCardProps) {
  const selected = GLOW_VARIANTS[variant] || GLOW_VARIANTS.default;

  return (
    <div
      data-slot="glow-card"
      data-variant={variant}
      className={cn(
        "group relative rounded-2xl p-[1.25px] transition-all duration-300",
        className
      )}
      {...props}
    >
      {/* Ambient Backlight Glow Layer (intensifies on hover) */}
      <div
        data-slot="glow-card-ambient"
        aria-hidden="true"
        className={cn(
          "absolute -inset-px rounded-2xl bg-gradient-to-br opacity-20 sm:opacity-30 blur-[8px] sm:blur-[10px] transition-all duration-500 pointer-events-none group-hover:opacity-70 group-hover:blur-[14px]",
          selected.ambientGlow,
          glowClassName
        )}
      />

      {/* Top-Left Gradient Border Outline Layer */}
      <div
        data-slot="glow-card-border"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none",
          "dark:block hidden",
          selected.borderGradient
        )}
      />
      <div
        data-slot="glow-card-border-light"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none",
          "dark:hidden block",
          selected.lightBorderGradient
        )}
      />

      {/* Inner Card Surface */}
      <div
        data-slot="glow-card-inner"
        className={cn(
          "relative h-full w-full rounded-[calc(1rem-1.25px)] bg-card dark:bg-zinc-950/92 backdrop-blur-xs p-4 sm:p-5 flex flex-col justify-between text-card-foreground shadow-[var(--shadow-eleven)] transition-colors",
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Top header row containing icon, title block, and top-right action menu
 */
export function GlowCardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-header"
      className={cn("flex items-start justify-between gap-3 w-full", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Rounded icon container
 */
export function GlowCardIcon({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-icon"
      className={cn(
        "w-11 h-11 rounded-xl bg-muted/80 dark:bg-zinc-900 border border-border/80 dark:border-zinc-800 flex items-center justify-center shrink-0 text-foreground shadow-xs transition-transform duration-200 group-hover:scale-105",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Title and status container
 */
export function GlowCardTitleGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-title-group"
      className={cn("min-w-0 flex-1 flex flex-col justify-center", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card heading title
 */
export function GlowCardTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="glow-card-title"
      className={cn(
        "text-sm sm:text-base font-semibold tracking-tight text-foreground truncate font-heading",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * Secondary status metadata row
 */
export function GlowCardStatus({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-status"
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Status dot with optional pulse
 */
export function GlowCardStatusDot({
  color = "emerald",
  pulse = true,
  className,
}: {
  color?: "emerald" | "amber" | "rose" | "cyan" | "muted";
  pulse?: boolean;
  className?: string;
}) {
  const dotColorClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    cyan: "bg-cyan-400",
    muted: "bg-muted-foreground",
  }[color];

  return (
    <span
      data-slot="glow-card-status-dot"
      className={cn(
        "relative flex h-2 w-2 shrink-0 items-center justify-center",
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            dotColorClass
          )}
        />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotColorClass)} />
    </span>
  );
}

/**
 * Top-right action slot (typically for kebab menu or action trigger)
 */
export function GlowCardAction({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-action"
      className={cn("shrink-0 flex items-center self-start", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Middle descriptive or metadata content area
 */
export function GlowCardContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-content"
      className={cn(
        "my-3 text-xs sm:text-sm text-muted-foreground leading-relaxed flex-1 space-y-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Horizontal subtle divider
 */
export function GlowCardDivider({
  className,
  ...props
}: React.ComponentProps<"hr">) {
  return (
    <hr
      data-slot="glow-card-divider"
      className={cn("h-px w-full border-none bg-border/50 my-2", className)}
      {...props}
    />
  );
}

/**
 * Bottom footer row with left badge and right metadata
 */
export function GlowCardFooter({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glow-card-footer"
      className={cn(
        "flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground mt-auto w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Pill-style badge for footer or tags
 */
export function GlowCardBadge({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="glow-card-badge"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted/70 dark:bg-zinc-900/90 border border-border/60 dark:border-zinc-800 text-foreground transition-colors",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
