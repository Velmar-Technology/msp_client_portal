import { useTranslation } from "react-i18next";
import { MoreHorizontal, UserX, UserCheck, Trash2 } from "lucide-react";

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

import {
  USER_ROLE_OPTIONS as ROLE_OPTIONS,
  CLIENT_TYPE_OPTIONS,
} from "@/constants/users";


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
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="h-7 w-7 cursor-pointer"
          />
        }
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
        <span className="sr-only">{t("userManagement.actions")}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-card text-foreground border border-border">
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
          {t("userManagement.changeRole")}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {ROLE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <DropdownMenuItem
              key={value}
              disabled={isSelf || user.role === value}
              onClick={() => onRoleChange(user.id, user.name, value)}
              className="text-xs gap-2 cursor-pointer"
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
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">
          {t("userManagement.changeClientType") || "Client Type"}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {CLIENT_TYPE_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
            <DropdownMenuItem
              key={value}
              disabled={user.client_type === value}
              onClick={() => onClientTypeChange(user.id, user.name, value)}
              className="text-xs gap-2 cursor-pointer"
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
        <DropdownMenuSeparator className="bg-border" />
        {user.is_active ? (
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => onStatusToggle(user.id, user.name, false)}
            className="text-xs gap-2 text-secondary focus:text-secondary cursor-pointer"
          >
            <UserX className="h-3.5 w-3.5" />
            {t("userManagement.deactivate")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={isSelf}
            onClick={() => onStatusToggle(user.id, user.name, true)}
            className="text-xs gap-2 text-primary focus:text-primary cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" />
            {t("userManagement.reactivate")}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              disabled={isSelf}
              onClick={() => onDelete(user.id, user.name)}
              className="text-xs gap-2 text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
              {t("userManagement.deleteUser") || "Delete User"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
