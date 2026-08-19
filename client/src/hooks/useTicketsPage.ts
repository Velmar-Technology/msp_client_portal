import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { SortingState } from "@tanstack/react-table";
import { ticketService } from "@/services/ticketService";
import type { Ticket } from "@/services/ticketService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";
import { useUrlState } from "@/hooks/useUrlState";
import { useAuth } from "@/hooks/useAuth";

export function useTicketsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { getParam, getNumberParam, setParam, setParams, removeParam } = useUrlState();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageInternal] = useState(() => getNumberParam("page", 1));
  const [search, setSearchInternal] = useState(() => getParam("search", ""));
  const [statusFilter, setStatusFilterInternal] = useState(() => getParam("status", ""));
  const [categoryFilter, setCategoryFilterInternal] = useState(() => getParam("category", ""));
  const [priorityFilter, setPriorityFilterInternal] = useState(() => getParam("priority", ""));
  const [deviceFilter, setDeviceFilterInternal] = useState(() => getParam("device", ""));
  const [loading, setLoading] = useState(true);

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
      setParams({ search: newSearch || null, page: null });
    },
    [setParams]
  );

  const setStatusFilter = useCallback(
    (newStatus: string) => {
      setStatusFilterInternal(newStatus);
      setParams({ status: newStatus || null, page: null });
    },
    [setParams]
  );

  const setCategoryFilter = useCallback(
    (newCategory: string) => {
      setCategoryFilterInternal(newCategory);
      setParams({ category: newCategory || null, page: null });
    },
    [setParams]
  );

  const setPriorityFilter = useCallback(
    (newPriority: string) => {
      setPriorityFilterInternal(newPriority);
      setParams({ priority: newPriority || null, page: null });
    },
    [setParams]
  );

  const setDeviceFilter = useCallback(
    (newDevice: string) => {
      setDeviceFilterInternal(newDevice);
      setParams({ device: newDevice || null, page: null });
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
        setDevices(result);
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
  }, []);

  // Fetch tickets callback
  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (search) params.search = search;
      if (deviceFilter) params.equipmentId = deviceFilter;

      const activeSort = sorting[0];
      if (activeSort) {
        params.sortBy = activeSort.id;
        params.sortOrder = activeSort.desc ? "desc" : "asc";
      }

      const result = await ticketService.getAll(params);
      setTickets(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, categoryFilter, priorityFilter, search, deviceFilter, sorting]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  const totalPages = useMemo(() => Math.ceil(total / limit), [total, limit]);

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
    setLoading(true);
    try {
      await Promise.all(
        cancelableTickets.map((tick) =>
          ticketService.updateStatus(tick.id, "CANCELLED", "Cancelled by client via bulk action.")
        )
      );
      setSelectedTickets([]);
      loadTickets();
    } catch (err) {
      console.error("Failed bulk cancel", err);
    } finally {
      setLoading(false);
    }
  }, [selectedTickets, loadTickets]);

  // Individual cancel logic
  const confirmCancelIndividual = useCallback(async () => {
    if (!ticketToCancel) return;
    const ticketId = ticketToCancel.id;
    setTicketToCancel(null);
    setLoading(true);
    try {
      await ticketService.updateStatus(ticketId, "CANCELLED", "Cancelled by client.");
      loadTickets();
    } catch (err) {
      console.error("Failed to cancel ticket", err);
    } finally {
      setLoading(false);
    }
  }, [ticketToCancel, loadTickets]);

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

export const useTickets = useTicketsPage;
export default useTicketsPage;
