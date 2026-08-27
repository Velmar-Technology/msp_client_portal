import { useState, useMemo } from "react";
import { Page } from "@/components/Page";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          isActive ? "bg-primary" : "bg-destructive"
        }`}
      />
      <span className="text-xs font-medium text-foreground">{label}</span>
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
          className="w-7 h-7 rounded-full object-cover shrink-0 border border-border shadow-xs"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border shadow-xs">
          <span className="text-[10px] font-bold text-muted-foreground">
            {initials}
          </span>
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-foreground truncate leading-tight">
          {name}
        </span>
        <span className="text-[10px] text-muted-foreground truncate leading-tight">
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
    sorting,
    handleSortingChange,
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("userManagement.colUser")} />
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("userManagement.colRole")} />
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("userManagement.colClientType") || "Client Type"} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
            {getClientTypeLabel(row.original.client_type)}
          </span>
        ),
      },
      {
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("userManagement.colStatus")} />
        ),
        cell: ({ row }) => (
          <StatusDot
            isActive={row.original.is_active}
            label={
              row.original.is_active
                ? t("userManagement.statusActive")
                : t("userManagement.statusInactive")
            }
          />
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("userManagement.colJoined")} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {t("userManagement.colActions")}
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <UserActionsMenu
            user={row.original}
            currentUserId={currentUserId}
            onRoleChange={requestRoleChange}
            onStatusToggle={requestStatusToggle}
            onClientTypeChange={requestClientTypeChange}
            onDelete={requestUserDelete}
          />
        ),
      },
    ],
    [
      t,
      currentUserId,
      getRoleLabel,
      getClientTypeLabel,
      formatDate,
      requestRoleChange,
      requestStatusToggle,
      requestClientTypeChange,
      requestUserDelete,
    ]
  );

  // Bulk actions definition
  const bulkActions = useMemo<DataTableBulkAction<ManagedUser>[]>(
    () => [
      {
        label: t("userManagement.bulkRoleAction") || "Change Role",
        onClick: (selectedRows) => {
          setSelectedUsersForBulkRole(selectedRows);
          setBulkRoleModalOpen(true);
        },
      },
      {
        label: t("userManagement.bulkClientTypeAction") || "Change Client Type",
        onClick: (selectedRows) => {
          setSelectedUsersForBulkClientType(selectedRows);
          setBulkClientTypeModalOpen(true);
        },
      },
      {
        label: t("userManagement.bulkActivateAction") || "Activate Users",
        onClick: (selectedRows) => {
          requestBulkStatusToggle(selectedRows, currentUserId, true);
        },
      },
      {
        label: t("userManagement.bulkDeactivateAction") || "Deactivate Users",
        variant: "destructive",
        onClick: (selectedRows) => {
          requestBulkStatusToggle(selectedRows, currentUserId, false);
        },
      },
      {
        label: t("userManagement.bulkDeleteAction") || "Delete Users",
        variant: "destructive",
        onClick: (selectedRows) => {
          requestBulkDelete(selectedRows, currentUserId);
        },
      },
    ],
    [t, currentUserId, requestBulkStatusToggle, requestBulkDelete]
  );

  // Confirmation modal title & description
  const confirmationTitle = useMemo(() => {
    if (!confirmation.open) return "";
    if (confirmation.type === "role") return t("userManagement.confirmRoleTitle");
    if (confirmation.type === "clientType") return t("userManagement.confirmClientTypeTitle") || "Update Client Type";
    if (confirmation.type === "bulk_role") return t("userManagement.confirmBulkRoleTitle") || "Update User Roles";
    if (confirmation.type === "bulk_client_type") return t("userManagement.confirmBulkClientTypeTitle") || "Update Client Types";
    if (confirmation.type === "bulk_status") return t("userManagement.confirmBulkStatusTitle") || "Update User Statuses";
    if (confirmation.type === "delete") return t("userManagement.confirmDeleteTitle") || "Delete User Account";
    if (confirmation.type === "bulk_delete") return t("userManagement.confirmBulkDeleteTitle") || "Delete User Accounts";
    return confirmation.newValue
      ? t("userManagement.confirmActivateTitle")
      : t("userManagement.confirmDeactivateTitle");
  }, [confirmation, t]);

  const confirmationDescription = useMemo(() => {
    if (!confirmation.open) return "";
    if (confirmation.type === "role") {
      return t("userManagement.confirmRoleDesc", {
        name: confirmation.userName,
        role: getRoleLabel(confirmation.newValue as UserRole),
      });
    }
    if (confirmation.type === "clientType") {
      return (t("userManagement.confirmClientTypeDesc") || "Are you sure you want to change the client type for {name} to {type}?")
        .replace("{name}", confirmation.userName ?? "")
        .replace("{type}", getClientTypeLabel(confirmation.newValue as ClientType));
    }
    if (confirmation.type === "bulk_role") {
      return (t("userManagement.confirmBulkRoleDesc") || "Are you sure you want to change the role of {count} user(s) to {role}?")
        .replace("{count}", String(confirmation.targetUsers?.length || 0))
        .replace("{role}", getRoleLabel(confirmation.newValue as UserRole));
    }
    if (confirmation.type === "bulk_client_type") {
      return (t("userManagement.confirmBulkClientTypeDesc") || "Are you sure you want to change the client type of {count} user(s) to {type}?")
        .replace("{count}", String(confirmation.targetUsers?.length || 0))
        .replace("{type}", getClientTypeLabel(confirmation.newValue as ClientType));
    }
    if (confirmation.type === "bulk_status") {
      const isActivating = confirmation.newValue as boolean;
      const count = confirmation.targetUsers?.length || 0;
      return isActivating
        ? (t("userManagement.confirmBulkActivateDesc") || "Are you sure you want to activate {count} user(s)?").replace("{count}", String(count))
        : (t("userManagement.confirmBulkDeactivateDesc") || "Are you sure you want to deactivate {count} user(s)?").replace("{count}", String(count));
    }
    if (confirmation.type === "delete") {
      return (t("userManagement.confirmDeleteDesc") || "Are you sure you want to permanently delete the user account for {name}? This action cannot be undone.")
        .replace("{name}", confirmation.userName ?? "")
    }
    if (confirmation.type === "bulk_delete") {
      return (t("userManagement.confirmBulkDeleteDesc") || "Are you sure you want to permanently delete {count} user account(s)? This action cannot be undone.")
        .replace("{count}", String(confirmation.targetUsers?.length || 0));
    }
    return confirmation.newValue
      ? t("userManagement.confirmActivateDesc", { name: confirmation.userName })
      : t("userManagement.confirmDeactivateDesc", { name: confirmation.userName });
  }, [confirmation, t, getRoleLabel, getClientTypeLabel]);

  return (
    <Page
      title={t("userManagement.pageTitle")}
      subtitle={t("userManagement.pageSubtitle")}
    >
      <div className="flex flex-col gap-4">
        {/* Metrics Header Bar */}
        <section aria-label="User Statistics">
          <UserStatsBar stats={stats} loading={statsLoading} />
        </section>

        {/* Main Data Table */}
        <section aria-label="User Accounts Table">
          <DataTable
            columns={columns}
            data={users}
            loading={loading}
            noDataMessage={t("userManagement.noUsersFound")}
            bulkActions={bulkActions}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            enableSorting
            manualSorting
            search={{
              value: searchQuery,
              onChange: handleSearchChange,
              placeholder: t("userManagement.searchPlaceholder"),
            }}
            filters={[
              {
                id: "role",
                value: roleFilter,
                onChange: (val) => handleRoleFilterChange(val as RoleFilter),
                placeholder: t("userManagement.filterAllRoles") || "All Roles",
                options: [
                  { value: "CLIENT", label: t("userManagement.roleClient") || "Client" },
                  { value: "TECHNICIAN", label: t("userManagement.roleTech") || "Technician" },
                  { value: "ADMIN", label: t("userManagement.roleAdmin") || "Admin" },
                ],
              },
              {
                id: "status",
                value: statusFilter === "all" ? "" : statusFilter,
                onChange: (val) => handleStatusFilterChange((val || "all") as StatusFilter),
                placeholder: t("userManagement.filterAllStatuses") || "All Statuses",
                options: [
                  { value: "active", label: t("userManagement.statusActive") || "Active" },
                  { value: "inactive", label: t("userManagement.statusInactive") || "Inactive" },
                ],
              },
            ]}
            pagination={{
              page,
              totalPages,
              totalItems: total,
              limit,
              onPageChange: setPage,
              onLimitChange: handleLimitChange,
            }}
          />
        </section>
      </div>

      <AlertDialog open={bulkRoleModalOpen} onOpenChange={setBulkRoleModalOpen}>
        <AlertDialogContent className="sm:max-w-md bg-card border border-border rounded-xl text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {t("userManagement.bulkSetRoleModalTitle") || "Set User Role"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {(t("userManagement.bulkSetRoleModalDesc") || "Choose a role to apply to the {count} selected user(s).")
                .replace("{count}", String(selectedUsersForBulkRole.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <label htmlFor="bulk-role-select" className="block text-xs font-bold text-foreground uppercase tracking-wider">
              {t("userManagement.selectRole") || "Select Role"}
            </label>
            <Select
              value={selectedBulkRole}
              onValueChange={(val) => setSelectedBulkRole(val as UserRole)}
            >
              <SelectTrigger id="bulk-role-select" size="lg" className="w-full text-xs">
                <SelectValue placeholder={t("userManagement.selectRole") || "Select Role"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">{t("userManagement.roleClient") || "Client"}</SelectItem>
                <SelectItem value="TECHNICIAN">{t("userManagement.roleTech") || "Technician"}</SelectItem>
                <SelectItem value="ADMIN">{t("userManagement.roleAdmin") || "Admin"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => setBulkRoleModalOpen(false)}
              className="mt-0"
            >
              {t("userManagement.cancel") || "Cancel"}
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                setBulkRoleModalOpen(false);
                requestBulkRoleChange(selectedUsersForBulkRole, currentUserId, selectedBulkRole);
              }}
            >
              {t("userManagement.confirm") || "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkClientTypeModalOpen} onOpenChange={setBulkClientTypeModalOpen}>
        <AlertDialogContent className="sm:max-w-md bg-card border border-border rounded-xl text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {t("userManagement.bulkSetClientTypeModalTitle") || "Set Client Type"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {(t("userManagement.bulkSetClientTypeModalDesc") || "Choose a client type to apply to the {count} selected user(s).")
                .replace("{count}", String(selectedUsersForBulkClientType.length))}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <label htmlFor="bulk-client-type-select" className="block text-xs font-bold text-foreground uppercase tracking-wider">
              {t("userManagement.selectClientType") || "Select Client Type"}
            </label>
            <Select
              value={selectedBulkClientType}
              onValueChange={(val) => setSelectedBulkClientType(val as ClientType)}
            >
              <SelectTrigger id="bulk-client-type-select" size="lg" className="w-full text-xs">
                <SelectValue placeholder={t("userManagement.selectClientType") || "Select Client Type"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLIENT">{t("userManagement.clientTypeCLIENT") || "Standard Client"}</SelectItem>
                <SelectItem value="ENTERPRISE">{t("userManagement.clientTypeENTERPRISE") || "Enterprise Client"}</SelectItem>
                <SelectItem value="STUDENT">{t("userManagement.clientTypeSTUDENT") || "Student Starter"}</SelectItem>
                <SelectItem value="OTHER">{t("userManagement.clientTypeOTHER") || "Other / Custom"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              onClick={() => setBulkClientTypeModalOpen(false)}
              className="mt-0"
            >
              {t("userManagement.cancel") || "Cancel"}
            </AlertDialogCancel>
            <Button
              type="button"
              onClick={() => {
                setBulkClientTypeModalOpen(false);
                requestBulkClientTypeChange(selectedUsersForBulkClientType, currentUserId, selectedBulkClientType);
              }}
            >
              {t("userManagement.confirm") || "Confirm"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmation.open}
        onOpenChange={(open) => {
          if (!open) cancelConfirmation();
        }}
      >
        <AlertDialogContent className="bg-card border border-border rounded-xl text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-heading">
              {confirmationTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {confirmationDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              {t("userManagement.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmation}
              disabled={actionLoading}
              className={
                confirmation.type === "delete" || (confirmation.type === "status" && !confirmation.newValue)
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {confirmation.type === "delete" || (confirmation.type === "status" && !confirmation.newValue)
                ? t("userManagement.confirmDeleteBtn") || "Delete"
                : t("userManagement.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default UserManagementPage;
