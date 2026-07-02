import type { UserRole } from "../../services/userService";

interface UserRoleBadgeProps {
  role: UserRole;
  label: string;
}

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/20 dark:text-violet-400 dark:border-violet-900/50",
  TECHNICIAN:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
  CLIENT:
    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700",
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
