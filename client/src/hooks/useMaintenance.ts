import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { maintenanceService, type DeviceMaintenance, type MaintenanceStatus } from "@/services/maintenanceService";
import { equipmentService, type SubscriptionEquipment } from "@/services/equipmentService";

export function useMaintenance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isTech = user?.role === "TECHNICIAN";
  const isAdminOrTech = isAdmin || isTech;

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"CALENDAR" | "LIST">("CALENDAR");
  const [maintenances, setMaintenances] = useState<DeviceMaintenance[]>([]);
  const [allEquipment, setAllEquipment] = useState<Partial<SubscriptionEquipment>[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTechFilter, setSelectedTechFilter] = useState<string>("ALL");

  // Pagination (LIST view)
  const [listPage, setListPage] = useState<number>(1);
  const [listLimit, setListLimit] = useState<number>(10);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedEquipForModal, setSelectedEquipForModal] = useState<Partial<SubscriptionEquipment> | null>(null);



  // Fetch maintenances
  const fetchMaintenances = useCallback(async () => {
    try {
      // Calculate start and end of calendar view grid (including padding days)
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString();
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString();

      const items = await maintenanceService.getMaintenances({
        startDate,
        endDate,
      });
      setMaintenances(items);
    } catch (err) {
      console.error("Failed to fetch maintenances", err);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  // Fetch equipment list for modal selection and filter context
  const fetchEquipment = useCallback(async () => {
    try {
      if (isAdminOrTech) {
        const devices = await equipmentService.getAllDevicesForAdmin();
        setAllEquipment(devices);
      } else {
        const myDevices = await equipmentService.getMyDevices();
        setAllEquipment(myDevices);
      }
    } catch (err) {
      console.error("Failed to fetch equipment for maintenance hook", err);
    }
  }, [isAdminOrTech]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMaintenances();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMaintenances]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEquipment();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEquipment]);

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Filtered maintenance list
  const filteredMaintenances = useMemo(() => {
    return maintenances.filter((m) => {
      // Status filter
      if (statusFilter !== "ALL" && m.status !== statusFilter) {
        return false;
      }
      // Tech filter
      if (selectedTechFilter !== "ALL" && m.assigned_tech_id !== selectedTechFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDevice = (m.device_name || "").toLowerCase().includes(q);
        const matchClient = (m.client_name || "").toLowerCase().includes(q);
        const matchTech = (m.assigned_tech_name || "").toLowerCase().includes(q);
        return matchTitle || matchDevice || matchClient || matchTech;
      }
      return true;
    });
  }, [maintenances, statusFilter, selectedTechFilter, searchQuery]);

  // LIST view pagination
  const listTotalPages = Math.ceil(filteredMaintenances.length / listLimit);
  const paginatedMaintenances = useMemo(() => {
    const start = (listPage - 1) * listLimit;
    return filteredMaintenances.slice(start, start + listLimit);
  }, [filteredMaintenances, listPage, listLimit]);

  // Reset page when filters change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setListPage(1);
  }, []);

  const handleStatusFilterChangeForList = useCallback((value: string) => {
    setStatusFilter(value);
    setListPage(1);
  }, []);

  const handleTechFilterChange = useCallback((value: string) => {
    setSelectedTechFilter(value);
    setListPage(1);
  }, []);

  const handleListLimitChange = useCallback((value: number) => {
    setListLimit(value);
    setListPage(1);
  }, []);

  // Unique Technicians for Filter Dropdown
  const uniqueTechnicians = useMemo(() => {
    const techMap = new Map<string, string>();
    maintenances.forEach((m) => {
      if (m.assigned_tech_id && m.assigned_tech_name) {
        techMap.set(m.assigned_tech_id, m.assigned_tech_name);
      }
    });
    return Array.from(techMap.entries()).map(([id, name]) => ({ id, name }));
  }, [maintenances]);

  // Open modal for a specific equipment slot or general open
  const openScheduleModal = useCallback((equip?: Partial<SubscriptionEquipment>) => {
    setSelectedEquipForModal(equip || null);
    setIsModalOpen(true);
  }, []);

  const closeScheduleModal = useCallback(() => {
    setSelectedEquipForModal(null);
    setIsModalOpen(false);
  }, []);

  const handleScheduleSuccess = useCallback(() => {
    fetchMaintenances();
  }, [fetchMaintenances]);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: MaintenanceStatus) => {
      try {
        await maintenanceService.updateMaintenance(id, { status: newStatus });
        fetchMaintenances();
      } catch (err) {
        console.error("Failed to update status", err);
      }
    },
    [fetchMaintenances]
  );

  return {
    t,
    user,
    isAdmin,
    isTech,
    isAdminOrTech,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    maintenances,
    filteredMaintenances,
    paginatedMaintenances,
    allEquipment,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    handleSearchChange,
    handleStatusFilterChangeForList,
    handleTechFilterChange,
    handleListLimitChange,
    selectedTechFilter,
    setSelectedTechFilter,
    uniqueTechnicians,
    listPage,
    setListPage,
    listLimit,
    listTotalPages,
    isModalOpen,
    selectedEquipForModal,
    openScheduleModal,
    closeScheduleModal,
    handleScheduleSuccess,
    handlePrevMonth,
    handleNextMonth,
    handleToday,
    handleStatusChange,
    fetchMaintenances,
  };
}
