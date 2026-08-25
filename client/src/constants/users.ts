import type React from "react";
import { ShieldCheck, Wrench, User, Building2, GraduationCap, Tag } from "lucide-react";
import type { UserRole, ClientType } from "@/services/userService";

export const USER_ROLE_CONFIG: Record<UserRole, { badge: string; dot: string }> = {
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

export interface RoleOption {
  value: UserRole;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

export const USER_ROLE_OPTIONS: RoleOption[] = [
  { value: "ADMIN", icon: ShieldCheck, labelKey: "userManagement.roleAdmin" },
  { value: "TECHNICIAN", icon: Wrench, labelKey: "userManagement.roleTech" },
  { value: "CLIENT", icon: User, labelKey: "userManagement.roleClient" },
];

export interface ClientTypeOption {
  value: ClientType;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}

export const CLIENT_TYPE_OPTIONS: ClientTypeOption[] = [
  { value: "CLIENT", icon: User, labelKey: "register.clientTypeCLIENT" },
  { value: "ENTERPRISE", icon: Building2, labelKey: "register.clientTypeENTERPRISE" },
  { value: "STUDENT", icon: GraduationCap, labelKey: "register.clientTypeSTUDENT" },
  { value: "OTHER", icon: Tag, labelKey: "register.clientTypeOTHER" },
];
