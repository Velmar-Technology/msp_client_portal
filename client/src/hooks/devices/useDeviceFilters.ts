import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUrlState } from "@/hooks/useUrlState";
import type { SortingState } from "@tanstack/react-table";
import type { SubscriptionEquipment } from "@/services/equipmentService";

/**
 * URL-synced filter, sort, pagination, and tab state for the Devices page.
 * All filter state is derived from URL search params during render (React 19 compiler-friendly).
 * No useEffect sync — URL is the single source of truth.
 */
export function useDeviceFilters() {
  const { t } = useTranslation();
  const { getParam, getNumberParam, setParam, setParams } = useUrlState();

  // --- Tab ---
  const activeTabParam = getParam("tab", "devices");
  const activeTab: "devices" | "rmm" = activeTabParam === "rmm" ? "rmm" : "devices";
  const setActiveTab = useCallback(
    (tab: "devices" | "rmm") => setParam("tab", tab === "devices" ? null : tab),
    [setParam],
  );

  // --- Search ---
  const searchTerm = getParam("search", "");
  const setSearchTerm = useCallback((v: string) => setParam("search", v || null), [setParam]);

  // --- Admin Filters ---
  const selectedClient = getParam("client", "");
  const setSelectedClient = useCallback((v: string) => setParam("client", v || null), [setParam]);
  const selectedPlan = getParam("plan", "");
  const setSelectedPlan = useCallback((v: string) => setParam("plan", v || null), [setParam]);
  const selectedStatus = getParam("status", "");
  const setSelectedStatus = useCallback((v: string) => setParam("status", v || null), [setParam]);

  // --- Subscription Selector (client view) ---
  const selectedSubscriptionId = getParam("sub", "");
  const setSelectedSubscriptionId = useCallback((v: string) => setParam("sub", v || null), [setParam]);

  // --- Pagination ---
  const page = getNumberParam("page", 1);
  const limit = getNumberParam("limit", 10);
  const setPage = useCallback((v: number) => setParam("page", v <= 1 ? null : v), [setParam]);
  const setLimit = useCallback((v: number) => setParams({ limit: v, page: null }), [setParams]);

  // --- Sorting (not URL-synced, ephemeral per session) ---
  const [sorting, setSorting] = useState<SortingState>([]);

  // --- Row Selection ---
  const [selectedDevices, setSelectedDevices] = useState<Partial<SubscriptionEquipment>[]>([]);

  // --- Bulk Deactivation Confirm ---
  const [showBulkDeactivateAlert, setShowBulkDeactivateAlert] = useState(false);
  const [bulkDeactivateTargets, setBulkDeactivateTargets] = useState<Partial<SubscriptionEquipment>[]>([]);

  return {
    t,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedClient,
    setSelectedClient,
    selectedPlan,
    setSelectedPlan,
    selectedStatus,
    setSelectedStatus,
    selectedSubscriptionId,
    setSelectedSubscriptionId,
    page,
    setPage,
    limit,
    setLimit,
    sorting,
    setSorting,
    selectedDevices,
    setSelectedDevices,
    showBulkDeactivateAlert,
    setShowBulkDeactivateAlert,
    bulkDeactivateTargets,
    setBulkDeactivateTargets,
  };
}

// --- Filter option derivation (pure functions, no hooks) ---

export function deriveAdminFilterOptions(adminDevices: SubscriptionEquipment[], t: (key: string) => string) {
  const clientsMap = new Map<string, string>();
  const plansSet = new Set<string>();

  for (const d of adminDevices) {
    if (d.tenant_id && d.tenant_name) clientsMap.set(d.tenant_id, d.tenant_name);
    if (d.plan) plansSet.add(d.plan);
  }

  const clientFilterOptions = Array.from(clientsMap.entries()).map(([id, name]) => ({ value: id, label: name }));
  const planFilterOptions = Array.from(plansSet).map((p) => ({ value: p, label: p }));
  const statusFilterOptions = [
    { value: "ACTIVE", label: t("devices.statusActive") },
    { value: "PENDING_ACTIVATION", label: t("devices.statusPending") },
  ];

  return { clientFilterOptions, planFilterOptions, statusFilterOptions };
}

export function deriveUniqueClients(adminDevices: SubscriptionEquipment[]) {
  const map = new Map<string, string>();
  for (const d of adminDevices) {
    if (d.tenant_id && d.tenant_name) map.set(d.tenant_id, d.tenant_name);
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Filters equipment list based on search term, status, and (admin-only) client/plan filters.
 */
export function filterEquipment(
  equipment: SubscriptionEquipment[],
  opts: { search: string; selectedStatus: string; selectedClient: string; isAdmin: boolean },
): SubscriptionEquipment[] {
  const search = opts.search.toLowerCase().trim();
  const hasSearch = search.length > 0;
  const hasStatusFilter = Boolean(opts.selectedStatus && opts.selectedStatus !== "all");
  const hasClientFilter = opts.isAdmin && Boolean(opts.selectedClient && opts.selectedClient !== "all");

  if (!hasSearch && !hasStatusFilter && !hasClientFilter) return equipment;

  return equipment.filter((device) => {
    if (hasClientFilter && device.tenant_id !== opts.selectedClient) return false;

    if (hasStatusFilter) {
      const isPending = device.status === "PENDING_ACTIVATION" || !device.status || device.status !== "ACTIVE";
      if (opts.selectedStatus === "ACTIVE" && device.status !== "ACTIVE") return false;
      if (opts.selectedStatus === "PENDING_ACTIVATION" && !isPending) return false;
      if (opts.selectedStatus !== "ACTIVE" && opts.selectedStatus !== "PENDING_ACTIVATION" && device.status !== opts.selectedStatus) return false;
    }

    if (hasSearch) {
      const matchSearch =
        (device.id && device.id.toLowerCase().includes(search)) ||
        (device.device_name && device.device_name.toLowerCase().includes(search)) ||
        (device.device_serial && device.device_serial.toLowerCase().includes(search)) ||
        (device.nextcloud_username && device.nextcloud_username.toLowerCase().includes(search)) ||
        (device.client_name && device.client_name.toLowerCase().includes(search)) ||
        (device.client_email && device.client_email.toLowerCase().includes(search));
      if (!matchSearch) return false;
    }

    return true;
  });
}

/**
 * Sorts equipment according to TanStack Table sorting state.
 * Default order: ACTIVE first, then by slot index.
 */
export function sortEquipment(equipment: SubscriptionEquipment[], sorting: SortingState): SubscriptionEquipment[] {
  if (sorting.length === 0) {
    return [...equipment].sort((a, b) => {
      const aActive = a.status === "ACTIVE" ? 1 : 0;
      const bActive = b.status === "ACTIVE" ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      const slotA = a.slot_index ?? 9999;
      const slotB = b.slot_index ?? 9999;
      return slotA - slotB;
    });
  }

  const result = [...equipment];
  const { id, desc } = sorting[0];

  result.sort((a, b) => {
    let valA: string | number = "";
    let valB: string | number = "";

    if (id === "clientInfo") {
      valA = a.client_name || a.tenant_name || "";
      valB = b.client_name || b.tenant_name || "";
    } else if (id === "slotNumber") {
      valA = a.slot_index !== undefined ? a.slot_index + 1 : 0;
      valB = b.slot_index !== undefined ? b.slot_index + 1 : 0;
    } else if (id === "planInfo") {
      valA = a.plan || "";
      valB = b.plan || "";
    } else if (id === "status") {
      const aActive = a.status === "ACTIVE" ? 1 : 0;
      const bActive = b.status === "ACTIVE" ? 1 : 0;
      return desc ? aActive - bActive : bActive - aActive;
    } else if (id === "deviceDetails") {
      valA = a.device_name || a.otp || "";
      valB = b.device_name || b.otp || "";
    } else if (id === "backupAccount") {
      valA = a.status === "ACTIVE" && a.nextcloud_username ? 1 : 0;
      valB = b.status === "ACTIVE" && b.nextcloud_username ? 1 : 0;
    }

    if (typeof valA === "number" && typeof valB === "number") {
      return desc ? valB - valA : valA - valB;
    }
    const comp = String(valA).localeCompare(String(valB));
    return desc ? -comp : comp;
  });

  return result;
}
