import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { userService } from "@/services/userService";
import type {
  ManagedUser,
  UserRole,
  ClientType,
  UserStats,
} from "../services/userService";
import { useUrlState } from "@/hooks/useUrlState";

// ---- Types ----

export type RoleFilter = UserRole | "";
export type StatusFilter = "all" | "active" | "inactive";

export interface ConfirmationState {
  open: boolean;
  type: "role" | "status" | "clientType" | "delete";
  isBulk?: boolean;
  userId?: string;
  userName?: string;
  userIds?: string[];
  userCount?: number;
  newValue: string | boolean;
}

const INITIAL_CONFIRMATION: ConfirmationState = {
  open: false,
  type: "role",
  isBulk: false,
  userId: "",
  userName: "",
  userIds: [],
  userCount: 0,
  newValue: "",
};

const DEFAULT_PAGE_SIZE = 20;

// ---- Hook ----

export function useUserManagement() {
  const { t, i18n } = useTranslation();
  const { getParam, getNumberParam, setParam, setParams } = useUrlState();

  // Data state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [page, setPageInternal] = useState(() => getNumberParam("page", 1));
  const [limit, setLimitInternal] = useState(() => getNumberParam("limit", DEFAULT_PAGE_SIZE));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [roleFilter, setRoleFilterInternal] = useState<RoleFilter>(() => getParam("role", "") as RoleFilter);
  const [statusFilter, setStatusFilterInternal] = useState<StatusFilter>(() => getParam("status", "all") as StatusFilter);
  const [searchQuery, setSearchQuery] = useState(() => getParam("search", ""));
  const [debouncedSearch, setDebouncedSearch] = useState(() => getParam("search", ""));

  // Confirmation dialog
  const [confirmation, setConfirmation] = useState<ConfirmationState>(INITIAL_CONFIRMATION);

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setPage = useCallback(
    (newPage: number) => {
      setPageInternal(newPage);
      setParam("page", newPage === 1 ? null : newPage);
    },
    [setParam]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPageInternal(1);
      setParams({ search: value || null, page: null });
    }, 300);
  }, [setParams]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const isActiveParam =
        statusFilter === "active" ? "true" : statusFilter === "inactive" ? "false" : undefined;

      const result = await userService.getAllUsers({
        page,
        limit,
        role: roleFilter || undefined,
        isActive: isActiveParam,
        search: debouncedSearch || undefined,
      });

      setUsers(result.users);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, roleFilter, statusFilter, debouncedSearch]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await userService.getUserStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to load user stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Initial load + reload on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchStats]);

  // Filter handlers (reset page on filter change)
  const handleRoleFilterChange = useCallback((value: RoleFilter) => {
    setRoleFilterInternal(value);
    setPageInternal(1);
    setParams({ role: value || null, page: null });
  }, [setParams]);

  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilterInternal(value);
    setPageInternal(1);
    setParams({ status: value === "all" ? null : value, page: null });
  }, [setParams]);

  const handleLimitChange = useCallback((value: number) => {
    setLimitInternal(value);
    setPageInternal(1);
    setParams({ limit: value === DEFAULT_PAGE_SIZE ? null : value, page: null });
  }, [setParams]);

  // Confirmation dialog handlers
  const requestRoleChange = useCallback(
    (userId: string, userName: string, newRole: UserRole) => {
      setConfirmation({
        open: true,
        type: "role",
        isBulk: false,
        userId,
        userName,
        newValue: newRole,
      });
    },
    []
  );

  const requestStatusToggle = useCallback(
    (userId: string, userName: string, newStatus: boolean) => {
      setConfirmation({
        open: true,
        type: "status",
        isBulk: false,
        userId,
        userName,
        newValue: newStatus,
      });
    },
    []
  );

  const requestClientTypeChange = useCallback(
    (userId: string, userName: string, newClientType: ClientType) => {
      setConfirmation({
        open: true,
        type: "clientType",
        isBulk: false,
        userId,
        userName,
        newValue: newClientType,
      });
    },
    []
  );

  const requestBulkClientTypeChange = useCallback(
    (selectedUsers: ManagedUser[], currentUserId: string, newClientType: ClientType) => {
      const validUserIds = selectedUsers
        .map((u) => u.id)
        .filter((id) => id !== currentUserId);

      if (validUserIds.length === 0) return;

      setConfirmation({
        open: true,
        type: "clientType",
        isBulk: true,
        userIds: validUserIds,
        userCount: validUserIds.length,
        newValue: newClientType,
      });
    },
    []
  );

  const requestBulkRoleChange = useCallback(
    (selectedUsers: ManagedUser[], currentUserId: string, newRole: UserRole) => {
      const validUserIds = selectedUsers
        .map((u) => u.id)
        .filter((id) => id !== currentUserId);

      if (validUserIds.length === 0) return;

      setConfirmation({
        open: true,
        type: "role",
        isBulk: true,
        userIds: validUserIds,
        userCount: validUserIds.length,
        newValue: newRole,
      });
    },
    []
  );

  const requestBulkStatusToggle = useCallback(
    (selectedUsers: ManagedUser[], currentUserId: string, newStatus: boolean) => {
      const validUserIds = selectedUsers
        .map((u) => u.id)
        .filter((id) => id !== currentUserId);

      if (validUserIds.length === 0) return;

      setConfirmation({
        open: true,
        type: "status",
        isBulk: true,
        userIds: validUserIds,
        userCount: validUserIds.length,
        newValue: newStatus,
      });
    },
    []
  );

  const requestUserDelete = useCallback(
    (userId: string, userName: string) => {
      setConfirmation({
        open: true,
        type: "delete",
        isBulk: false,
        userId,
        userName,
        newValue: "",
      });
    },
    []
  );

  const requestBulkDelete = useCallback(
    (selectedUsers: ManagedUser[], currentUserId: string) => {
      const validUserIds = selectedUsers
        .map((u) => u.id)
        .filter((id) => id !== currentUserId);

      if (validUserIds.length === 0) return;

      setConfirmation({
        open: true,
        type: "delete",
        isBulk: true,
        userIds: validUserIds,
        userCount: validUserIds.length,
        newValue: "",
      });
    },
    []
  );

  const cancelConfirmation = useCallback(() => {
    setConfirmation(INITIAL_CONFIRMATION);
  }, []);

  const executeConfirmation = useCallback(async () => {
    if (!confirmation.isBulk && !confirmation.userId) return;
    if (confirmation.isBulk && (!confirmation.userIds || confirmation.userIds.length === 0)) return;

    setActionLoading(true);
    try {
      if (confirmation.isBulk) {
        if (confirmation.type === "role") {
          await userService.bulkUpdateRole(
            confirmation.userIds!,
            confirmation.newValue as UserRole
          );
        } else if (confirmation.type === "clientType") {
          await userService.bulkUpdateClientType(
            confirmation.userIds!,
            confirmation.newValue as ClientType
          );
        } else if (confirmation.type === "delete") {
          await userService.bulkDeleteUsers(confirmation.userIds!);
        } else {
          await userService.bulkUpdateStatus(
            confirmation.userIds!,
            confirmation.newValue as boolean
          );
        }
      } else {
        if (confirmation.type === "role") {
          await userService.updateUserRole(
            confirmation.userId!,
            confirmation.newValue as UserRole
          );
        } else if (confirmation.type === "clientType") {
          await userService.updateUserClientType(
            confirmation.userId!,
            confirmation.newValue as ClientType
          );
        } else if (confirmation.type === "delete") {
          await userService.deleteUser(confirmation.userId!);
        } else {
          await userService.toggleUserStatus(
            confirmation.userId!,
            confirmation.newValue as boolean
          );
        }
      }

      // Refresh data
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      console.error("Failed to update user(s):", err);
    } finally {
      setActionLoading(false);
      setConfirmation(INITIAL_CONFIRMATION);
    }
  }, [confirmation, fetchUsers, fetchStats]);

  // Utility: format role label
  const getRoleLabel = useCallback(
    (role: UserRole): string => {
      const labels: Record<UserRole, string> = {
        ADMIN: t("userManagement.roleAdmin"),
        TECHNICIAN: t("userManagement.roleTech"),
        CLIENT: t("userManagement.roleClient"),
      };
      return labels[role] || role;
    },
    [t]
  );

  // Utility: format client type label
  const getClientTypeLabel = useCallback(
    (clientType: string): string => {
      const labels: Record<string, string> = {
        CLIENT: t("userManagement.clientTypeCLIENT") || t("register.clientTypeCLIENT") || "Standard Client",
        ENTERPRISE: t("userManagement.clientTypeENTERPRISE") || t("register.clientTypeENTERPRISE") || "Enterprise Client",
        STUDENT: t("userManagement.clientTypeSTUDENT") || t("register.clientTypeSTUDENT") || "Student Starter",
        OTHER: t("userManagement.clientTypeOTHER") || t("register.clientTypeOTHER") || "Other / Custom",
      };
      return labels[clientType] || clientType;
    },
    [t]
  );

  // Utility: format date
  const formatDate = useCallback(
    (dateStr: string | null): string => {
      if (!dateStr) return "—";
      const locale = i18n.language === "es_DO" ? "es-DO" : "en-US";
      return new Date(dateStr).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
    [i18n.language]
  );

  return {
    // i18n
    t,
    i18n,
    // Data
    users,
    stats,
    loading,
    statsLoading,
    actionLoading,
    // Pagination
    page,
    totalPages,
    total,
    limit,
    setPage,
    handleLimitChange,
    // Filters
    roleFilter,
    statusFilter,
    searchQuery,
    handleRoleFilterChange,
    handleStatusFilterChange,
    handleSearchChange,
    // Confirmation
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
    // Utilities
    getRoleLabel,
    getClientTypeLabel,
    formatDate,
  };
}


