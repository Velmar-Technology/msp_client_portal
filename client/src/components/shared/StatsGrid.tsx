import React from "react";
import { cn } from "@/lib/utils";

export interface StatsGridProps {
  children: React.ReactNode;
  props?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

export function StatsGrid({ children, className, ...props }: StatsGridProps) {
  return (
    <div {...props}       className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3", className)}>
      {children}
    </div>
  );
}

export default StatsGrid;
