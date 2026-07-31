import { useMemo } from "react";
import { Page } from "@/components/Page";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableBulkAction } from "@/components/ui/data-table";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { ColumnDef } from "@tanstack/react-table";

import { useUserManagement } from "@/hooks/useUserManagement";
import type { RoleFilter, StatusFilter } from "@/hooks/useUserManagement";
import { useAuth } from "@/hooks/useAuth";
import { UserStatsBar } from "@/components/users/UserStatsBar";

import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { UserActionsMenu } from "@/components/users/UserActionsMenu";
import type { ManagedUser } from "@/services/userService";

// ---- Status Dot ----

interface StatusDotProps {
  isActive: boolean;
  label: string;
}

function StatusDot({ isActive, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isActive ? "bg-emerald-500" : "bg-red-500"
        }`}
      />
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
    </span>
  );
}

// ---- User Avatar ----

interface UserAvatarCellProps {
  name: string;
  email: string;
  avatarUrl: string | null;
}

function UserAvatarCell({ name, email, avatarUrl }: UserAvatarCellProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {initials}
          </span>
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
          {name}
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate leading-tight">
          {email}
        </span>
      </div>
    </div>
  );
}

// ---- Main Page ----

export function UserManagementPage() {
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";

  const {
    t,
    users,
    stats,
    loading,
    statsLoading,
    actionLoading,
    page,
    totalPages,
    total,
    limit,
    setPage,
    handleLimitChange,
    roleFilter,
    statusFilter,
    searchQuery,
    handleRoleFilterChange,
    handleStatusFilterChange,
    handleSearchChange,
    confirmation,
    requestRoleChange,
    requestStatusToggle,
    requestBulkRoleChange,
    requestBulkStatusToggle,
    cancelConfirmation,
    executeConfirmation,
    getRoleLabel,
    formatDate,
  } = useUserManagement();

  // Column definitions — memoized
  const columns = useMemo<ColumnDef<ManagedUser, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colUser")}
          </span>
        ),
        cell: ({ row }) => (
          <UserAvatarCell
            name={row.original.name}
            email={row.original.email}
            avatarUrl={row.original.avatar_url}
          />
        ),
      },
      {
        accessorKey: "role",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colRole")}
          </span>
        ),
        cell: ({ row }) => (
          <UserRoleBadge
            role={row.original.role}
            label={getRoleLabel(row.original.role)}
          />
        ),
      },
      {
        accessorKey: "is_active",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colStatus")}
          </span>
        ),
        cell: ({ row }) => (
          <StatusDot
            isActive={row.original.is_active}
            label={
              row.original.is_active
                ? t("userManagement.active")
                : t("userManagement.inactive")
            }
          />
        ),
      },
      {
        accessorKey: "last_login_at",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colLastLogin")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 font-mono">
            {formatDate(row.original.last_login_at)}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colCreated")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 font-mono">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider sr-only">
            {t("userManagement.actions")}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <UserActionsMenu
              user={row.original}
              currentUserId={currentUserId}
              onRoleChange={requestRoleChange}
              onStatusToggle={requestStatusToggle}
            />
          </div>
        ),
      },
    ],
    [t, getRoleLabel, formatDate, currentUserId, requestRoleChange, requestStatusToggle]
  );

  // Bulk actions configuration
  const bulkActions = useMemo<DataTableBulkAction<ManagedUser>[]>(
    () => [
      {
        label: t("userManagement.bulkActivate") || "Activate Selected",
        onClick: (selectedRows) => requestBulkStatusToggle(selectedRows, currentUserId, true),
        variant: "outline",
      },
      {
        label: t("userManagement.bulkDeactivate") || "Deactivate Selected",
        onClick: (selectedRows) => requestBulkStatusToggle(selectedRows, currentUserId, false),
        variant: "destructive",
      },
      {
        label: t("userManagement.bulkSetAdmin") || "Set Admin",
        onClick: (selectedRows) => requestBulkRoleChange(selectedRows, currentUserId, "ADMIN"),
        variant: "outline",
      },
      {
        label: t("userManagement.bulkSetTech") || "Set Tech",
        onClick: (selectedRows) => requestBulkRoleChange(selectedRows, currentUserId, "TECHNICIAN"),
        variant: "outline",
      },
      {
        label: t("userManagement.bulkSetClient") || "Set Client",
        onClick: (selectedRows) => requestBulkRoleChange(selectedRows, currentUserId, "CLIENT"),
        variant: "outline",
      },
    ],
    [t, currentUserId, requestBulkStatusToggle, requestBulkRoleChange]
  );

  // Confirmation dialog title and description
  const confirmationTitle = confirmation.isBulk
    ? confirmation.type === "role"
      ? t("userManagement.confirmBulkRoleTitle")
      : t("userManagement.confirmBulkStatusTitle")
    : confirmation.type === "role"
      ? t("userManagement.confirmRoleTitle")
      : t("userManagement.confirmStatusTitle");

  const confirmationDescription = confirmation.isBulk
    ? confirmation.type === "role"
      ? t("userManagement.confirmBulkRoleChange")
          .replace("{count}", String(confirmation.userCount ?? 0))
          .replace("{role}", getRoleLabel(confirmation.newValue as ManagedUser["role"]))
      : t("userManagement.confirmBulkStatusChange")
          .replace("{count}", String(confirmation.userCount ?? 0))
          .replace(
            "{status}",
            confirmation.newValue
              ? t("userManagement.active").toLowerCase()
              : t("userManagement.inactive").toLowerCase()
          )
    : confirmation.type === "role"
      ? t("userManagement.confirmRoleChange")
          .replace("{name}", confirmation.userName || "")
          .replace("{role}", getRoleLabel(confirmation.newValue as ManagedUser["role"]))
      : t("userManagement.confirmStatusChange")
          .replace("{name}", confirmation.userName || "")
          .replace(
            "{status}",
            confirmation.newValue
              ? t("userManagement.active").toLowerCase()
              : t("userManagement.inactive").toLowerCase()
          );

  return (
    <Page
      title={t("userManagement.title")}
      subtitle={t("userManagement.subtitle")}
    >
      {/* Stats */}
      <UserStatsBar stats={stats} loading={statsLoading} />

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        noDataMessage={t("userManagement.noUsers")}
        enableRowSelection={true}
        bulkActions={bulkActions}
        search={{
          value: searchQuery,
          onChange: handleSearchChange,
          placeholder: t("userManagement.searchPlaceholder") || "Search users..."
        }}
        filters={[
          {
            id: "role",
            value: roleFilter,
            onChange: (val) => handleRoleFilterChange(val as RoleFilter),
            options: [
              { value: "ADMIN", label: t("userManagement.roleAdmin") },
              { value: "TECHNICIAN", label: t("userManagement.roleTech") },
              { value: "CLIENT", label: t("userManagement.roleClient") }
            ],
            placeholder: t("userManagement.allRoles") || "All Roles"
          },
          {
            id: "status",
            value: statusFilter,
            onChange: (val) => handleStatusFilterChange(val as StatusFilter),
            options: [
              { value: "active", label: t("userManagement.active") },
              { value: "inactive", label: t("userManagement.inactive") }
            ],
            placeholder: t("userManagement.allStatuses") || "All Statuses"
          }
        ]}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit,
          onPageChange: setPage,
          onLimitChange: handleLimitChange,
        }}
        className="mt-6"
      />

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmation.open}
        onOpenChange={(open) => {
          if (!open) cancelConfirmation();
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">
              {confirmationTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
              {confirmationDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              {t("userManagement.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmation}
              disabled={actionLoading}
              className={
                confirmation.type === "status" && !confirmation.newValue
                  ? "bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              }
            >
              {actionLoading
                ? t("userManagement.processing")
                : t("userManagement.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default UserManagementPage;

