import type { UserRole } from "@/services/userService";

interface UserRoleBadgeProps {
  role: UserRole;
  label: string;
}

const ROLE_CONFIG: Record<UserRole, { badge: string; dot: string }> = {
  ADMIN: {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-500/20",
    dot: "bg-blue-500",
  },
  TECHNICIAN: {
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-500/20",
    dot: "bg-amber-500",
  },
  CLIENT: {
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
    dot: "bg-zinc-400",
  },
};

export function UserRoleBadge({ role, label }: UserRoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? ROLE_CONFIG.CLIENT;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium ${config.badge}`}
    >
      <span className={`mr-1 h-1 w-1 rounded-full ${config.dot}`} />
      {label}
    </span>
  );
}
