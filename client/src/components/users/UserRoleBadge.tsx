import type { UserRole } from "@/services/userService";

interface UserRoleBadgeProps {
  role: UserRole;
  label: string;
}

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/20",
  TECHNICIAN: "bg-secondary text-secondary-foreground border-border",
  CLIENT: "bg-muted text-muted-foreground border-border",
};

export function UserRoleBadge({ role, label }: UserRoleBadgeProps) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.CLIENT;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${style}`}
    >
      {label}
    </span>
  );
}
