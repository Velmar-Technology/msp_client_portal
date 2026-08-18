import { useState, useMemo } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { ColumnDef } from "@tanstack/react-table";

import { useUserManagement } from "@/hooks/useUserManagement";
import type { RoleFilter, StatusFilter } from "@/hooks/useUserManagement";
import { useAuth } from "@/hooks/useAuth";
import { UserStatsBar } from "@/components/users/UserStatsBar";

import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { UserActionsMenu } from "@/components/users/UserActionsMenu";
import type { ManagedUser, ClientType, UserRole } from "@/services/userService";

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

  const [bulkRoleModalOpen, setBulkRoleModalOpen] = useState(false);
  const [selectedUsersForBulkRole, setSelectedUsersForBulkRole] = useState<ManagedUser[]>([]);
  const [selectedBulkRole, setSelectedBulkRole] = useState<UserRole>("CLIENT");

  const [bulkClientTypeModalOpen, setBulkClientTypeModalOpen] = useState(false);
  const [selectedUsersForBulkClientType, setSelectedUsersForBulkClientType] = useState<ManagedUser[]>([]);
  const [selectedBulkClientType, setSelectedBulkClientType] = useState<ClientType>("CLIENT");

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
    requestClientTypeChange,
    requestBulkRoleChange,
    requestBulkStatusToggle,
    requestBulkClientTypeChange,
    requestUserDelete,
    requestBulkDelete,
    cancelConfirmation,
    executeConfirmation,
    getRoleLabel,
    getClientTypeLabel,
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
        accessorKey: "client_type",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
            {t("userManagement.colClientType") || "Client Type"}
          </span>
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            {getClientTypeLabel(row.original.client_type)}
          </span>
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
              onClientTypeChange={requestClientTypeChange}
              onDelete={requestUserDelete}
            />
          </div>
        ),
      },
    ],
    [t, getRoleLabel, getClientTypeLabel, formatDate, currentUserId, requestRoleChange, requestStatusToggle, requestClientTypeChange, requestUserDelete]
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
        label: t("userManagement.bulkSetRole") || "Set Role",
        onClick: (selectedRows) => {
          setSelectedUsersForBulkRole(selectedRows);
          setSelectedBulkRole("CLIENT");
          setBulkRoleModalOpen(true);
        },
        variant: "outline",
      },
      {
        label: t("userManagement.bulkSetClientType") || "Set Client Type",
        onClick: (selectedRows) => {
          setSelectedUsersForBulkClientType(selectedRows);
          setSelectedBulkClientType("CLIENT");
          setBulkClientTypeModalOpen(true);
        },
        variant: "outline",
      },
      {
        label: t("userManagement.bulkDelete") || "Delete Selected",
        onClick: (selectedRows) => requestBulkDelete(selectedRows, currentUserId),
        variant: "destructive",
      },
    ],
    [t, currentUserId, requestBulkStatusToggle, requestBulkRoleChange, requestBulkDelete]
  );

  // Confirmation dialog title and description
  const confirmationTitle = confirmation.isBulk
    ? confirmation.type === "role"
      ? t("userManagement.confirmBulkRoleTitle")
      : confirmation.type === "clientType"
        ? t("userManagement.confirmBulkClientTypeTitle") || "Change Client Type for Selected Users"
        : confirmation.type === "delete"
          ? t("userManagement.confirmBulkDeleteTitle") || "Delete Selected Users"
          : t("userManagement.confirmBulkStatusTitle")
    : confirmation.type === "role"
      ? t("userManagement.confirmRoleTitle")
      : confirmation.type === "clientType"
        ? t("userManagement.confirmClientTypeTitle") || "Change User Client Type"
        : confirmation.type === "delete"
          ? t("userManagement.confirmDeleteTitle") || "Delete User"
          : t("userManagement.confirmStatusTitle");

  const confirmationDescription = confirmation.isBulk
    ? confirmation.type === "role"
      ? t("userManagement.confirmBulkRoleChange")
          .replace("{count}", String(confirmation.userCount ?? 0))
          .replace("{role}", getRoleLabel(confirmation.newValue as ManagedUser["role"]))
      : confirmation.type === "clientType"
        ? (t("userManagement.confirmBulkClientTypeChange") || "Are you sure you want to change the client type of {count} selected user(s) to {type}?")
            .replace("{count}", String(confirmation.userCount ?? 0))
            .replace("{type}", getClientTypeLabel(String(confirmation.newValue)))
        : confirmation.type === "delete"
          ? (t("userManagement.confirmBulkDeleteChange") || "Are you sure you want to delete {count} selected user(s)? This action cannot be undone.")
              .replace("{count}", String(confirmation.userCount ?? 0))
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
      : confirmation.type === "clientType"
        ? (t("userManagement.confirmClientTypeChange") || "Are you sure you want to change {name}'s client type to {type}?")
            .replace("{name}", confirmation.userName || "")
            .replace("{type}", getClientTypeLabel(String(confirmation.newValue)))
        : confirmation.type === "delete"
          ? (t("userManagement.confirmDeleteChange") || "Are you sure you want to delete {name}? This action cannot be undone.")
              .replace("{name}", confirmation.userName || "")
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

      {/* Bulk Role Modal */}
      <Dialog open={bulkRoleModalOpen} onOpenChange={setBulkRoleModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">
              {t("userManagement.bulkSetRoleModalTitle") || "Set User Role"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              {(t("userManagement.bulkSetRoleModalDesc") || "Choose a role to apply to the {count} selected user(s).")
                .replace("{count}", String(selectedUsersForBulkRole.length))}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label htmlFor="bulk-role-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              {t("userManagement.selectRole") || "Select Role"}
            </label>
            <select
              id="bulk-role-select"
              value={selectedBulkRole}
              onChange={(e) => setSelectedBulkRole(e.target.value as UserRole)}
              className="w-full h-10 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
            >
              <option value="CLIENT">{t("userManagement.roleClient") || "Client"}</option>
              <option value="TECHNICIAN">{t("userManagement.roleTech") || "Technician"}</option>
              <option value="ADMIN">{t("userManagement.roleAdmin") || "Admin"}</option>
            </select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkRoleModalOpen(false)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {t("userManagement.cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBulkRoleModalOpen(false);
                requestBulkRoleChange(selectedUsersForBulkRole, currentUserId, selectedBulkRole);
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t("userManagement.confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Client Type Modal */}
      <Dialog open={bulkClientTypeModalOpen} onOpenChange={setBulkClientTypeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">
              {t("userManagement.bulkSetClientTypeModalTitle") || "Set Client Type"}
            </DialogTitle>
            <DialogDescription className="text-zinc-500 dark:text-zinc-400">
              {(t("userManagement.bulkSetClientTypeModalDesc") || "Choose a client type to apply to the {count} selected user(s).")
                .replace("{count}", String(selectedUsersForBulkClientType.length))}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <label htmlFor="bulk-client-type-select" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              {t("userManagement.selectClientType") || "Select Client Type"}
            </label>
            <select
              id="bulk-client-type-select"
              value={selectedBulkClientType}
              onChange={(e) => setSelectedBulkClientType(e.target.value as ClientType)}
              className="w-full h-10 px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
            >
              <option value="CLIENT">{t("userManagement.clientTypeCLIENT") || "Standard Client"}</option>
              <option value="ENTERPRISE">{t("userManagement.clientTypeENTERPRISE") || "Enterprise Client"}</option>
              <option value="STUDENT">{t("userManagement.clientTypeSTUDENT") || "Student Starter"}</option>
              <option value="OTHER">{t("userManagement.clientTypeOTHER") || "Other / Custom"}</option>
            </select>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkClientTypeModalOpen(false)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {t("userManagement.cancel") || "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBulkClientTypeModalOpen(false);
                requestBulkClientTypeChange(selectedUsersForBulkClientType, currentUserId, selectedBulkClientType);
              }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {t("userManagement.confirm") || "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                confirmation.type === "delete" || (confirmation.type === "status" && !confirmation.newValue)
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

