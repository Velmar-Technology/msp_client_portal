import type { UserRole } from "../api/userService";

interface UserRoleBadgeProps {
  role: UserRole;
  label: string;
}

import { USER_ROLE_CONFIG as ROLE_CONFIG } from "@/constants/users";


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
