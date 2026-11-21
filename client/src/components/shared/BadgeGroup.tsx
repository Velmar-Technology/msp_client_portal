import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment of badges */
  align?: "start" | "center" | "end";
}

/**
 * Standardized badge group container adapted from Cal.com UI components.
 * Clusters category, status, and SLA metadata badges with consistent hairline spacing.
 *
 * @param props - BadgeGroupProps
 * @returns React.ReactElement
 * @see Cal.com Badge.tsx
 */
export function BadgeGroup({
  align = "start",
  className,
  children,
  ...props
}: BadgeGroupProps) {
  const alignClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
  }[align];

  return (
    <div
      data-slot="badge-group"
      className={cn("flex flex-wrap items-center gap-1.5", alignClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}
