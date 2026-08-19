import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ListFilter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  User,
  Laptop,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Page } from "@/components/Page";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMaintenance } from "@/hooks/useMaintenance";
import { ScheduleMaintenanceModal } from "@/components/maintenance/ScheduleMaintenanceModal";
import type { DeviceMaintenance, MaintenanceStatus } from "@/services/maintenanceService";
import { cn } from "@/lib/utils";

export function MaintenancePage() {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language.startsWith("es");

  const {
    t,
    isAdminOrTech,
    currentDate,
    viewMode,
    setViewMode,
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
  } = useMaintenance();

  const [selectedEventDetails, setSelectedEventDetails] = useState<DeviceMaintenance | null>(null);

  // Month Title string
  const monthYearTitle = useMemo(() => {
    return currentDate.toLocaleDateString(isSpanish ? "es-DO" : "en-US", {
      month: "long",
      year: "numeric",
    });
  }, [currentDate, isSpanish]);

  // Calendar Days calculation for Grid View
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Previous month overflow days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Next month overflow days (to fill 35 or 42 grid cells)
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDate]);

  // Status badge styling helper
  const getStatusBadge = (status: MaintenanceStatus | string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <CheckCircle2 className="h-3 w-3" />
            {t("maintenance.statusCompleted")}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <Clock className="h-3 w-3 animate-spin" />
            {t("maintenance.statusInProgress")}
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <AlertTriangle className="h-3 w-3" />
            {t("maintenance.statusOverdue")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <XCircle className="h-3 w-3" />
            {t("maintenance.statusCancelled")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <CalendarIcon className="h-3 w-3" />
            {t("maintenance.statusScheduled")}
          </span>
        );
    }
  };

  // Table Columns for List View
  const listColumns: ColumnDef<DeviceMaintenance>[] = [
    {
      id: "scheduledDate",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {t("maintenance.tableDate")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const d = new Date(item.scheduled_date);
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{d.toLocaleDateString()}</p>
            <p className="text-[10px] text-zinc-400 font-mono">
              {item.maintenance_type === "CUSTOM_DATE"
                ? t("maintenance.typeCustomDate")
                : t("maintenance.typePredefined")}
            </p>
          </div>
        );
      },
    },
    {
      id: "deviceInfo",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {t("maintenance.tableDevice")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              {item.device_name || t("devices.unnamedDevice")}
            </p>
            {item.device_serial && <p className="text-[10px] text-zinc-400 font-mono">{item.device_serial}</p>}
            {item.service_name && <p className="text-[9px] text-zinc-500 italic">{item.service_name}</p>}
          </div>
        );
      },
    },
    {
      id: "clientInfo",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {t("maintenance.tableClient")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{item.client_name || "—"}</p>
            {item.client_email && (
              <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">{item.client_email}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "assignedTech",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {t("maintenance.tableTech")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return item.assigned_tech_name ? (
          <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
            <User className="h-3 w-3 text-zinc-400" />
            {item.assigned_tech_name}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 italic">{t("maintenance.unassignedTech")}</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">
          {t("maintenance.tableStatus")}
        </span>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      id: "actions",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wider text-right">
          {t("common.actions")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 cursor-pointer transition-colors">
                  <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800"
              >
                <DropdownMenuLabel className="text-xs">{t("maintenance.actionsLabel")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedEventDetails(item)} className="cursor-pointer text-xs">
                  {t("maintenance.viewDetails")}
                </DropdownMenuItem>
                {isAdminOrTech && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "IN_PROGRESS")}
                      className="cursor-pointer text-xs text-amber-600 dark:text-amber-400"
                    >
                      {t("maintenance.markInProgress")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "COMPLETED")}
                      className="cursor-pointer text-xs text-emerald-600 dark:text-emerald-400"
                    >
                      {t("maintenance.markCompleted")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "CANCELLED")}
                      className="cursor-pointer text-xs text-red-600 dark:text-red-400"
                    >
                      {t("maintenance.markCancelled")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <Page title={t("nav.maintenance")} subtitle={t("maintenance.subtitle")} isLoading={loading}>
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 rounded-sm shadow-sm">
          {/* Calendar Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-sm overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                title={t("maintenance.prevMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer border-x border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200"
              >
                {t("maintenance.today")}
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-zinc-600 dark:text-zinc-300"
                title={t("maintenance.nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 capitalize">{monthYearTitle}</h2>
          </div>

          {/* Action & View Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode("CALENDAR")}
                title={t("maintenance.viewCalendar")}
                aria-label={t("maintenance.viewCalendar")}
                className={cn(
                  "p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                  viewMode === "CALENDAR"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                title={t("maintenance.viewList")}
                aria-label={t("maintenance.viewList")}
                className={cn(
                  "p-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                  viewMode === "LIST"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200",
                )}
              >
                <ListIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Schedule Maintenance Button */}
            <button
              onClick={() => openScheduleModal()}
              className="h-8 px-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("maintenance.scheduleBtn")}</span>
            </button>
          </div>
        </div>

        {/* Filters Toolbar - Calendar view only */}
        {viewMode === "CALENDAR" && (
          <div className="bg-white dark:bg-zinc-950 p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder={t("maintenance.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 h-8 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{t("maintenance.filterAllStatuses")}</option>
                  <option value="SCHEDULED">{t("maintenance.statusScheduled")}</option>
                  <option value="IN_PROGRESS">{t("maintenance.statusInProgress")}</option>
                  <option value="COMPLETED">{t("maintenance.statusCompleted")}</option>
                  <option value="OVERDUE">{t("maintenance.statusOverdue")}</option>
                  <option value="CANCELLED">{t("maintenance.statusCancelled")}</option>
                </select>
              </div>

              {/* Tech Filter (Admin/Tech) */}
              {isAdminOrTech && uniqueTechnicians.length > 0 && (
                <select
                  value={selectedTechFilter}
                  onChange={(e) => setSelectedTechFilter(e.target.value)}
                  className="h-8 px-2 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">{t("maintenance.filterAllTechs")}</option>
                  {uniqueTechnicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR VIEW GRID */}
        {viewMode === "CALENDAR" && (
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-center font-bold text-[11px] text-zinc-400 py-2">
              <div>{t("calendar.sun")}</div>
              <div>{t("calendar.mon")}</div>
              <div>{t("calendar.tue")}</div>
              <div>{t("calendar.wed")}</div>
              <div>{t("calendar.thu")}</div>
              <div>{t("calendar.fri")}</div>
              <div>{t("calendar.sat")}</div>
            </div>

            {/* Days Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
              {calendarDays.map((dayItem, idx) => {
                const isToday = dayItem.date.toDateString() === new Date().toDateString();
                const dayMaintenances = filteredMaintenances.filter(
                  (m) => new Date(m.scheduled_date).toDateString() === dayItem.date.toDateString(),
                );

                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] p-1.5 flex flex-col justify-start transition-colors ${
                      !dayItem.isCurrentMonth
                        ? "bg-zinc-50/30 dark:bg-zinc-900/10 text-zinc-300 dark:text-zinc-700"
                        : "bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 px-1">
                      <span
                        className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                            : dayItem.isCurrentMonth
                              ? "text-zinc-700 dark:text-zinc-300"
                              : "text-zinc-400 dark:text-zinc-600"
                        }`}
                      >
                        {dayItem.date.getDate()}
                      </span>
                      {dayItem.isCurrentMonth && (
                        <button
                          onClick={() => openScheduleModal()}
                          className="opacity-0 hover:opacity-100 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 p-0.5 rounded cursor-pointer transition-opacity"
                          title={t("maintenance.scheduleBtn")}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Events List for Day */}
                    <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                      {dayMaintenances.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedEventDetails(m)}
                          className={`p-1 rounded border text-[10px] cursor-pointer font-medium leading-tight truncate transition-all hover:scale-[1.02] shadow-xs ${
                            m.status === "COMPLETED"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50"
                              : m.status === "IN_PROGRESS"
                                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50"
                                : m.status === "OVERDUE"
                                  ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50"
                          }`}
                          title={`${m.title} - ${m.device_name || ""}`}
                        >
                          <div className="flex items-center gap-1 font-bold">
                            <Laptop className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{m.device_name || t("devices.unnamedDevice")}</span>
                          </div>
                          {m.client_name && <p className="text-[9px] opacity-75 truncate mt-0.5">{m.client_name}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LIST VIEW TABLE */}
        {viewMode === "LIST" && (
          <div className="overflow-hidden">
            <DataTable
              columns={listColumns}
              data={paginatedMaintenances}
              noDataMessage={t("maintenance.noMaintenancesFound")}
              loading={loading}
              search={{
                value: searchQuery,
                onChange: handleSearchChange,
                placeholder: t("maintenance.searchPlaceholder"),
              }}
              filters={[
                {
                  id: "status",
                  value: statusFilter === "ALL" ? "" : statusFilter,
                  onChange: (val) => handleStatusFilterChangeForList(val || "ALL"),
                  options: [
                    { value: "SCHEDULED", label: t("maintenance.statusScheduled") },
                    { value: "IN_PROGRESS", label: t("maintenance.statusInProgress") },
                    { value: "COMPLETED", label: t("maintenance.statusCompleted") },
                    { value: "OVERDUE", label: t("maintenance.statusOverdue") },
                    { value: "CANCELLED", label: t("maintenance.statusCancelled") },
                  ],
                  placeholder: t("maintenance.filterAllStatuses"),
                },
                ...(isAdminOrTech && uniqueTechnicians.length > 0
                  ? [
                      {
                        id: "tech",
                        value: selectedTechFilter === "ALL" ? "" : selectedTechFilter,
                        onChange: (val: string) => handleTechFilterChange(val || "ALL"),
                        options: uniqueTechnicians.map((tech) => ({ value: tech.id, label: tech.name })),
                        placeholder: t("maintenance.filterAllTechs"),
                      },
                    ]
                  : []),
              ]}
              pagination={{
                page: listPage,
                totalPages: listTotalPages,
                totalItems: filteredMaintenances.length,
                limit: listLimit,
                onPageChange: setListPage,
                onLimitChange: handleListLimitChange,
              }}
            />
          </div>
        )}
      </div>

      {/* Schedule Maintenance Modal */}
      <ScheduleMaintenanceModal
        equipment={selectedEquipForModal}
        allEquipment={allEquipment}
        isOpen={isModalOpen}
        onClose={closeScheduleModal}
        onSuccess={handleScheduleSuccess}
        isAdminOrTech={isAdminOrTech}
        technicians={uniqueTechnicians}
      />

      {/* Event Details Drawer/Modal */}
      <AlertDialog open={!!selectedEventDetails} onOpenChange={(open) => { if (!open) setSelectedEventDetails(null); }}>
        {selectedEventDetails && (
          <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm max-w-md w-full p-5 shadow-2xl space-y-4">
            <AlertDialogHeader className="flex flex-row justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3 space-y-0 text-left">
              <div>
                <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{selectedEventDetails.title}</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-zinc-500 font-mono mt-0.5">
                  {new Date(selectedEventDetails.scheduled_date).toLocaleString()}
                </AlertDialogDescription>
              </div>
              {getStatusBadge(selectedEventDetails.status)}
            </AlertDialogHeader>

            <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">{t("maintenance.tableDevice")}:</span>
                <span className="font-bold">{selectedEventDetails.device_name || t("devices.unnamedDevice")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">{t("devices.wizardStep3SerialNumber")}:</span>
                <span className="font-mono">{selectedEventDetails.device_serial || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">{t("maintenance.tableClient")}:</span>
                <span>{selectedEventDetails.client_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-semibold">{t("maintenance.tableTech")}:</span>
                <span>{selectedEventDetails.assigned_tech_name || t("maintenance.unassignedTech")}</span>
              </div>
              {selectedEventDetails.notes && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 mt-2">
                  <span className="text-zinc-400 font-semibold block mb-0.5">{t("maintenance.labelNotes")}:</span>
                  <p className="text-zinc-600 dark:text-zinc-400 italic bg-white dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                    {selectedEventDetails.notes}
                  </p>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex justify-end gap-2 pt-2">
              <AlertDialogCancel
                onClick={() => setSelectedEventDetails(null)}
                className="h-8 px-4 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 rounded-md transition-opacity cursor-pointer border-0 mt-0"
              >
                {t("common.close")}
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </Page>
  );
}

export default MaintenancePage;
