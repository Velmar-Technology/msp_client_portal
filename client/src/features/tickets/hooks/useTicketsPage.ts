import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SortingState } from "@tanstack/react-table";
import type { TicketItem as Ticket } from '../api/ticketService';
import { equipmentService } from "@/features/equipment";
import type { SubscriptionEquipment } from "@shared/contracts";
import { useUrlState } from "@/hooks/useUrlState";
import { useAuth } from "@/hooks/useAuth";
import { useTickets as useTicketsQuery, useUpdateTicketStatus } from "../api/useTicketQueries";

/**
 * Custom hook managing the Tickets listing page.
 * Coordinates ticket query filters, pagination, TanStack Table sorting, URL state synchronization, and ticket creation modals.
 *
 * @see BL-102 (Round-Robin Dispatch)
 * @see BL-201 (Feature Quota)
 * @returns State and event handlers for ticket data grid, filters, sorting, and modal actions.
 */
export function useTicketsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { searchParams, getParam, getNumberParam, setParam, setParams, removeParam } = useUrlState();

  const [page, setPageInternal] = useState(() => getNumberParam("page", 1));
  const [search, setSearchInternal] = useState(() => getParam("search", ""));
  const [statusFilter, setStatusFilterInternal] = useState(() => getParam("status", ""));
  const [categoryFilter, setCategoryFilterInternal] = useState(() => getParam("category", ""));
  const [priorityFilter, setPriorityFilterInternal] = useState(() => getParam("priority", ""));
  const [deviceFilter, setDeviceFilterInternal] = useState(() => getParam("device", ""));
  const [dateRangeFilter, setDateRangeFilterInternal] = useState(() => getParam("dateRange", "all"));
  const [actionLoading, setActionLoading] = useState(false);

  // Sorting
  const initialSortBy = getParam("sortBy", "");
  const initialSortOrder = getParam("sortOrder", "desc") as "asc" | "desc";
  const [sorting, setSorting] = useState<SortingState>(
    initialSortBy ? [{ id: initialSortBy, desc: initialSortOrder === "desc" }] : []
  );
  const [showNewTicket, setShowNewTicketInternal] = useState(() => getParam("openModal") === "create-ticket");
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [ticketToCancel, setTicketToCancel] = useState<Ticket | null>(null);
  const [showBulkCancelAlert, setShowBulkCancelAlert] = useState(false);
  const [alertWarningMessage, setAlertWarningMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<SubscriptionEquipment[]>([]);
  const [limit, setLimitInternal] = useState(() => getNumberParam("limit", 10));

  // Two-way synchronization with URL search parameters (browser back/forward & direct navigation)
  useEffect(() => {
    const urlPage = getNumberParam("page", 1);
    const urlLimit = getNumberParam("limit", 10);
    const urlSearch = getParam("search", "");
    const urlStatus = getParam("status", "");
    const urlCategory = getParam("category", "");
    const urlPriority = getParam("priority", "");
    const urlDevice = getParam("device", "");
    const urlDateRange = getParam("dateRange", "all");

    setPageInternal((prev) => (prev !== urlPage ? urlPage : prev));
    setLimitInternal((prev) => (prev !== urlLimit ? urlLimit : prev));
    setSearchInternal((prev) => (prev !== urlSearch ? urlSearch : prev));
    setStatusFilterInternal((prev) => (prev !== urlStatus ? urlStatus : prev));
    setCategoryFilterInternal((prev) => (prev !== urlCategory ? urlCategory : prev));
    setPriorityFilterInternal((prev) => (prev !== urlPriority ? urlPriority : prev));
    setDeviceFilterInternal((prev) => (prev !== urlDevice ? urlDevice : prev));
    setDateRangeFilterInternal((prev) => (prev !== urlDateRange ? urlDateRange : prev));
  }, [searchParams, getParam, getNumberParam]);

  const setPage = useCallback(
    (newPage: number) => {
      setPageInternal(newPage);
      setParam("page", newPage === 1 ? null : newPage);
    },
    [setParam]
  );

  const setSearch = useCallback(
    (newSearch: string) => {
      setSearchInternal(newSearch);
      setPageInternal(1);
      setParams({ search: newSearch || null, page: null });
    },
    [setParams]
  );

  const setStatusFilter = useCallback(
    (newStatus: string) => {
      setStatusFilterInternal(newStatus);
      setPageInternal(1);
      setParams({ status: newStatus || null, page: null });
    },
    [setParams]
  );

  const setCategoryFilter = useCallback(
    (newCategory: string) => {
      setCategoryFilterInternal(newCategory);
      setPageInternal(1);
      setParams({ category: newCategory || null, page: null });
    },
    [setParams]
  );

  const setPriorityFilter = useCallback(
    (newPriority: string) => {
      setPriorityFilterInternal(newPriority);
      setPageInternal(1);
      setParams({ priority: newPriority || null, page: null });
    },
    [setParams]
  );

  const setDeviceFilter = useCallback(
    (newDevice: string) => {
      setDeviceFilterInternal(newDevice);
      setPageInternal(1);
      setParams({ device: newDevice || null, page: null });
    },
    [setParams]
  );

  const setDateRangeFilter = useCallback(
    (newDateRange: string) => {
      setDateRangeFilterInternal(newDateRange);
      setPageInternal(1);
      setParams({ dateRange: newDateRange === "all" ? null : newDateRange || null, page: null });
    },
    [setParams]
  );

  const handleLimitChange = useCallback(
    (value: number) => {
      setLimitInternal(value);
      setPageInternal(1);
      setParams({ limit: value === 10 ? null : value, page: null });
    },
    [setParams]
  );

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting);
      const active = newSorting[0];
      setParams({
        sortBy: active?.id || null,
        sortOrder: active ? (active.desc ? "desc" : "asc") : null,
        page: null,
      });
      setPageInternal(1);
    },
    [setParams]
  );

  const setShowNewTicket = useCallback(
    (open: boolean) => {
      setShowNewTicketInternal(open);
      if (open) {
        setParam("openModal", "create-ticket");
      } else {
        removeParam("openModal");
      }
    },
    [setParam, removeParam]
  );

  // Handle modal trigger from location state or openModal param
  useEffect(() => {
    const openModalParam = getParam("openModal");
    if (location.state?.openCreateModal || openModalParam === "create-ticket") {
      setShowNewTicketInternal(true);
      if (location.state?.openCreateModal) {
        setParam("openModal", "create-ticket");
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, getParam, setParam]);

  // Load active devices
  useEffect(() => {
    async function loadDevices() {
      try {
        const result = await equipmentService.getMyDevices();
        const provisioned = (result || []).filter((d) => d.status === "ACTIVE");
        setDevices(provisioned);
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
  }, []);

  const updateStatusMutation = useUpdateTicketStatus();

  // Query filters derived for TanStack Query
  const activeSort = sorting[0];
  const queryFilters = useMemo(() => {
    const params: Record<string, string | number> = { page, limit };
    if (statusFilter) params.status = statusFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (search) params.search = search;
    if (deviceFilter) params.equipmentId = deviceFilter;
    if (dateRangeFilter && dateRangeFilter !== "all") params.dateRange = dateRangeFilter;
    if (activeSort) {
      params.sortBy = activeSort.id;
      params.sortOrder = activeSort.desc ? "desc" : "asc";
    }
    return params;
  }, [page, limit, statusFilter, categoryFilter, priorityFilter, search, deviceFilter, dateRangeFilter, activeSort]);

  const {
    data: ticketData,
    isLoading: queryLoading,
    refetch: loadTickets,
  } = useTicketsQuery(queryFilters as any);

  const tickets = (ticketData?.tickets as Ticket[]) || [];
  const total = ticketData?.total ?? 0;
  const loading = queryLoading || actionLoading;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // If current page exceeds totalPages (e.g. after filtering), reset back to totalPages
  useEffect(() => {
    if (total > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [total, page, totalPages, setPage]);

  // Bulk cancel logic
  const handleBulkCancelClick = useCallback(() => {
    const cancelableTickets = selectedTickets.filter((tick) =>
      ["OPEN", "IN_PROGRESS", "AWAITING_PAYMENT"].includes(tick.status)
    );
    if (cancelableTickets.length === 0) {
      setAlertWarningMessage(t("tickets.noCancelableTickets") || "None of the selected tickets can be cancelled.");
      return;
    }
    setShowBulkCancelAlert(true);
  }, [selectedTickets, t]);

  const confirmBulkCancel = useCallback(async () => {
    const cancelableTickets = selectedTickets.filter((tick) =>
      ["OPEN", "IN_PROGRESS", "AWAITING_PAYMENT"].includes(tick.status)
    );
    setShowBulkCancelAlert(false);
    setActionLoading(true);
    try {
      await Promise.all(
        cancelableTickets.map((tick) =>
          updateStatusMutation.mutateAsync({
            id: tick.id,
            data: { status: "CANCELLED" as any, notes: "Cancelled by client via bulk action." },
          })
        )
      );
      setSelectedTickets([]);
    } catch (err) {
      console.error("Failed bulk cancel", err);
    } finally {
      setActionLoading(false);
    }
  }, [selectedTickets, updateStatusMutation]);

  // Individual cancel logic
  const confirmCancelIndividual = useCallback(async () => {
    if (!ticketToCancel) return;
    const ticketId = ticketToCancel.id;
    setTicketToCancel(null);
    setActionLoading(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: ticketId,
        data: { status: "CANCELLED" as any, notes: "Cancelled by client." },
      });
    } catch (err) {
      console.error("Failed to cancel ticket", err);
    } finally {
      setActionLoading(false);
    }
  }, [ticketToCancel, updateStatusMutation]);

  const handleTicketCreated = useCallback(() => {
    setShowNewTicket(false);
    setPage(1);
    loadTickets();
  }, [setShowNewTicket, setPage, loadTickets]);

  const handleTicketAction = useCallback((action: string, ticket: Ticket) => {
    if (action === "view") {
      navigate(`/tickets/${ticket.id}`);
    } else if (action === "cancel") {
      setTicketToCancel(ticket);
    }
  }, [navigate]);

  const canCreateTicket = true;

  return {
    t,
    i18n,
    user,
    navigate,
    tickets,
    total,
    page,
    setPage,
    search,
    setSearch,
    searchQuery: search,
    setSearchQuery: setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    deviceFilter,
    setDeviceFilter,
    dateRangeFilter,
    setDateRangeFilter,
    devices,
    loading,
    showNewTicket,
    setShowNewTicket,
    selectedTickets,
    setSelectedTickets,
    ticketToCancel,
    setTicketToCancel,
    showBulkCancelAlert,
    setShowBulkCancelAlert,
    alertWarningMessage,
    setAlertWarningMessage,
    totalPages,
    limit,
    handleLimitChange,
    sorting,
    handleSortingChange,
    loadTickets,
    canCreateTicket,
    handleBulkCancelClick,
    confirmBulkCancel,
    confirmCancelIndividual,
    handleTicketCreated,
    handleTicketAction,
  };
}

export default useTicketsPage;
