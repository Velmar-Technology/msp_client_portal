import React from "react";
import { cn } from "@/lib/utils";

export interface PageContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

/**
 * High-density ElevenLabs-style rounded content container.
 * Wraps data tables, empty states, and list views.
 *
 * @param props - PageContentCardProps
 * @returns JSX.Element
 */
export function PageContentCard({ children, className, ...props }: PageContentCardProps) {
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/70 bg-card/40 backdrop-blur-xs shadow-xs overflow-hidden transition-all",
        className
      )}
      data-slot="page-content-card"
      {...props}
    >
      {children}
    </div>
  );
}
