import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface RoleBadgeProps {
  role?: string | null;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Reusable Dynamic RBAC role pill component (ADR-018).
 * Provides role-specific visual accents for ADMIN, TECHNICIAN, CLIENT, and GUEST.
 *
 * @see ADR-014
 * @see ADR-017
 * @see ADR-018
 */
export function RoleBadge({ role, className, size = "default" }: RoleBadgeProps) {
  const normalized = (role ?? "CLIENT").toUpperCase();

  const roleStyles: Record<string, string> = {
    ADMIN: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 hover:bg-purple-500/20",
    TECHNICIAN: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
    CLIENT: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
    GUEST: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
  };

  const currentStyle = roleStyles[normalized] ?? "bg-muted text-muted-foreground border-border";

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium tracking-tight uppercase select-none transition-colors",
        size === "sm" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-xs",
        currentStyle,
        className
      )}
    >
      {normalized}
    </Badge>
  );
}
