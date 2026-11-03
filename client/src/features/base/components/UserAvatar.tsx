import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showPresence?: boolean;
  isOnline?: boolean;
}

/**
 * Reusable user avatar with initials fallback and presence indicator (ADR-018).
 * Inherited across CRM, Helpdesk, Billing, and System domains.
 *
 * @see ADR-018
 */
export function UserAvatar({
  name,
  email,
  size = "md",
  className,
  showPresence = false,
  isOnline = false,
}: UserAvatarProps) {
  const getInitials = (): string => {
    if (name?.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email?.trim()) {
      return email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-7 w-7 text-xs",
    md: "h-8 w-8 text-xs",
    lg: "h-10 w-10 text-sm font-semibold",
  };

  const presenceDotSizes = {
    xs: "h-1.5 w-1.5 bottom-0 right-0",
    sm: "h-2 w-2 bottom-0 right-0",
    md: "h-2.5 w-2.5 bottom-0 right-0",
    lg: "h-3 w-3 bottom-0.5 right-0.5",
  };

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium border border-primary/20",
          sizeClasses[size]
        )}
      >
        {getInitials()}
      </div>
      {showPresence && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-background",
            isOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
            presenceDotSizes[size]
          )}
        />
      )}
    </div>
  );
}
