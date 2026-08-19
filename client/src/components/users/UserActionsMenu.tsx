import { useTranslation } from "react-i18next";
import { MoreHorizontal, ShieldCheck, Wrench, User, UserX, UserCheck, Building2, GraduationCap, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ManagedUser, UserRole, ClientType } from "@/services/userService";

interface UserActionsMenuProps {
  user: ManagedUser;
  currentUserId: string;
  onRoleChange: (userId: string, userName: string, newRole: UserRole) => void;
  onStatusToggle: (userId: string, userName: string, newStatus: boolean) => void;
  onClientTypeChange: (userId: string, userName: string, newClientType: ClientType) => void;
  onDelete?: (userId: string, userName: string) => void;
}

const ROLE_OPTIONS: { value: UserRole; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { value: "ADMIN", icon: ShieldCheck, labelKey: "userManagement.roleAdmin" },
  { value: "TECHNICIAN", icon: Wrench, labelKey: "userManagement.roleTech" },
  { value: "CLIENT", icon: User, labelKey: "userManagement.roleClient" },
];

const CLIENT_TYPE_OPTIONS: { value: ClientType; icon: React.ComponentType<{ className?: string }>; labelKey: string }[] = [
  { value: "CLIENT", icon: User, labelKey: "register.clientTypeCLIENT" },
  { value: "ENTERPRISE", icon: Building2, labelKey: "register.clientTypeENTERPRISE" },
  { value: "STUDENT", icon: GraduationCap, labelKey: "register.clientTypeSTUDENT" },
  { value: "OTHER", icon: Tag, labelKey: "register.clientTypeOTHER" },
];

export function UserActionsMenu({
  user,
  currentUserId,
  onRoleChange,
  onStatusToggle,
  onClientTypeChange,
  onDelete,
}: UserActionsMenuProps) {
  const { t } = useTranslation();

  const isSelf = user.id === currentUserId;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">{t("userManagement.actions")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
          {t("userManagement.changeRole")}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {ROLE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <DropdownMenuItem
              key={value}
              disabled={isSelf || user.role === value}
              onClick={() => onRoleChange(user.id, user.name, value)}
              className="text-xs gap-2"
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
              {user.role === value && (
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {t("userManagement.current")}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
          {t("userManagement.changeClientType") || "Client Type"}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {CLIENT_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <DropdownMenuItem
              key={value}
              disabled={user.client_type === value}
              onClick={() => onClientTypeChange(user.id, user.name, value)}
              className="text-xs gap-2"
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
              {user.client_type === value && (
                <span className="ml-auto text-[9px] text-muted-foreground">
                  {t("userManagement.current")}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {user.is_active ? (
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => onStatusToggle(user.id, user.name, false)}
            className="text-xs gap-2 text-secondary focus:text-secondary"
          >
            <UserX className="h-3.5 w-3.5" />
            {t("userManagement.deactivate")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => onStatusToggle(user.id, user.name, true)}
            className="text-xs gap-2 text-primary focus:text-primary"
          >
            <UserCheck className="h-3.5 w-3.5" />
            {t("userManagement.reactivate")}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSelf}
              onClick={() => onDelete(user.id, user.name)}
              className="text-xs gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("userManagement.deleteUser") || "Delete User"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
