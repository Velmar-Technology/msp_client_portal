import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface TenantBadgeProps {
  name: string;
  subdomain?: string | null;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Reusable tenant context indicator badge (ADR-018).
 * Displays current workspace identity and subdomain context.
 *
 * @see ADR-018
 */
export function TenantBadge({ name, subdomain, className, size = "default" }: TenantBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 font-normal select-none transition-colors",
        size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
    >
      <Building2 className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3", "text-muted-foreground")} />
      <span className="font-medium text-foreground">{name}</span>
      {subdomain && <span className="text-muted-foreground/70">({subdomain})</span>}
    </Badge>
  );
}
