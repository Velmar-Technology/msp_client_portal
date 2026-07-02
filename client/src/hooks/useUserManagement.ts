import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { userService } from "../services/userService";
import type {
  ManagedUser,
  UserRole,
  UserStats,
} from "../services/userService";

// ---- Types ----

export type RoleFilter = UserRole | "";
export type StatusFilter = "all" | "active" | "inactive";

export interface ConfirmationState {
  open: boolean;
  type: "role" | "status";
  userId: string;
  userName: string;
  newValue: string | boolean;
}

const INITIAL_CONFIRMATION: ConfirmationState = {
  open: false,
  type: "role",
  userId: "",
  userName: "",
  newValue: "",
};

const PAGE_SIZE = 20;

// ---- Hook ----

export function useUserManagement() {
  const { t, i18n } = useTranslation();

  // Data state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Confirmation dialog
  const [confirmation, setConfirmation] = useState<ConfirmationState>(INITIAL_CONFIRMATION);

  // Debounce search input
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const isActiveParam =
        statusFilter === "active" ? "true" : statusFilter === "inactive" ? "false" : undefined;

      const result = await userService.getAllUsers({
        page,
        limit: PAGE_SIZE,
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
  }, [page, roleFilter, statusFilter, debouncedSearch]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
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
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Filter handlers (reset page on filter change)
  const handleRoleFilterChange = useCallback((value: RoleFilter) => {
    setRoleFilter(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: StatusFilter) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  // Confirmation dialog handlers
  const requestRoleChange = useCallback(
    (userId: string, userName: string, newRole: UserRole) => {
      setConfirmation({
        open: true,
        type: "role",
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
        userId,
        userName,
        newValue: newStatus,
      });
    },
    []
  );

  const cancelConfirmation = useCallback(() => {
    setConfirmation(INITIAL_CONFIRMATION);
  }, []);

  const executeConfirmation = useCallback(async () => {
    if (!confirmation.userId) return;

    setActionLoading(true);
    try {
      if (confirmation.type === "role") {
        await userService.updateUserRole(
          confirmation.userId,
          confirmation.newValue as UserRole
        );
      } else {
        await userService.toggleUserStatus(
          confirmation.userId,
          confirmation.newValue as boolean
        );
      }

      // Refresh data
      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      console.error("Failed to update user:", err);
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
    setPage,
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
    cancelConfirmation,
    executeConfirmation,
    // Utilities
    getRoleLabel,
    formatDate,
  };
}
