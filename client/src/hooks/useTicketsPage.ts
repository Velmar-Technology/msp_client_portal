import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ticketService } from "@/services/ticketService";
import type { Ticket } from "@/services/ticketService";
import { equipmentService } from "@/services/equipmentService";
import type { SubscriptionEquipment } from "@/services/equipmentService";

export function useTicketsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [ticketToCancel, setTicketToCancel] = useState<Ticket | null>(null);
  const [showBulkCancelAlert, setShowBulkCancelAlert] = useState(false);
  const [alertWarningMessage, setAlertWarningMessage] = useState<string | null>(null);
  const [deviceFilter, setDeviceFilter] = useState("");
  const [devices, setDevices] = useState<SubscriptionEquipment[]>([]);

  const limit = 10;

  // Handle modal trigger from location state
  useEffect(() => {
    if (location.state?.openCreateModal) {
      const timer = setTimeout(() => {
        setShowNewTicket(true);
        window.history.replaceState({}, document.title);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

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
      if (search) params.search = search;
      if (deviceFilter) params.equipmentId = deviceFilter;
      const result = await ticketService.getAll(params);
      setTickets(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search, deviceFilter]);

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
  }, [loadTickets]);

  return {
    t,
    i18n,
    navigate,
    tickets,
    total,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
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
    loadTickets,
    handleBulkCancelClick,
    confirmBulkCancel,
    confirmCancelIndividual,
    handleTicketCreated,
  };
}
