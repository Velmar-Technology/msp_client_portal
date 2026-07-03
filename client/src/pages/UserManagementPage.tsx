import { useMemo } from "react";
import { Page } from "@/components/Page";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { useUserManagement } from "../hooks/useUserManagement";
import { useAuth } from "../hooks/useAuth";
import { UserStatsBar } from "@/components/users/UserStatsBar";
import { UserFiltersBar } from "@/components/users/UserFiltersBar";
import { UserRoleBadge } from "@/components/users/UserRoleBadge";
import { UserActionsMenu } from "@/components/users/UserActionsMenu";
import type { ManagedUser } from "../services/userService";

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
          isActive ? "bg-emerald-500" : "bg-red-400"
        }`}
      />
      <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
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
          className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {initials}
          </span>
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
          {name}
        </span>
        <span className="text-[10px] text-zinc-400 truncate leading-tight">
          {email}
        </span>
      </div>
    </div>
  );
}

// ---- Pagination Controls ----

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  t: (key: string) => string;
}

function Pagination({ page, totalPages, onPageChange, t }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-900 mt-1">
      <span className="text-[10px] text-zinc-400 font-mono">
        {t("userManagement.pageOf")
          .replace("{page}", String(page))
          .replace("{total}", String(totalPages))}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
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
    setPage,
    roleFilter,
    statusFilter,
    searchQuery,
    handleRoleFilterChange,
    handleStatusFilterChange,
    handleSearchChange,
    confirmation,
    requestRoleChange,
    requestStatusToggle,
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
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
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
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
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
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
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
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {t("userManagement.colLastLogin")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 font-mono">
            {formatDate(row.original.last_login_at)}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            {t("userManagement.colCreated")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 font-mono">
            {formatDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider sr-only">
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

  // Confirmation dialog description
  const confirmationDescription = confirmation.type === "role"
    ? t("userManagement.confirmRoleChange")
        .replace("{name}", confirmation.userName)
        .replace("{role}", getRoleLabel(confirmation.newValue as ManagedUser["role"]))
    : t("userManagement.confirmStatusChange")
        .replace("{name}", confirmation.userName)
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

      {/* Table Card */}
      <div className="bg-white dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="px-4 pt-3 pb-1">
          <UserFiltersBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            roleFilter={roleFilter}
            onRoleFilterChange={handleRoleFilterChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            total={total}
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          noDataMessage={t("userManagement.noUsers")}
          className="border-none rounded-none"
        />

        {/* Pagination */}
        <div className="px-4 pb-3">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            t={t}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmation.open}
        onOpenChange={(open) => {
          if (!open) cancelConfirmation();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmation.type === "role"
                ? t("userManagement.confirmRoleTitle")
                : t("userManagement.confirmStatusTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
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
                confirmation.type === "status" && !confirmation.newValue
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : ""
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
