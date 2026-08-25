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
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <CheckCircle2 className="h-3 w-3" />
            {t("maintenance.statusCompleted")}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground border border-border px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <Clock className="h-3 w-3 animate-spin" />
            {t("maintenance.statusInProgress")}
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <AlertTriangle className="h-3 w-3" />
            {t("maintenance.statusOverdue")}
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
            <XCircle className="h-3 w-3" />
            {t("maintenance.statusCancelled")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">
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
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
          {t("maintenance.tableDate")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const d = new Date(item.scheduled_date);
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-foreground">{d.toLocaleDateString()}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
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
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
          {t("maintenance.tableDevice")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">
              {item.device_name || t("devices.unnamedDevice")}
            </p>
            {item.device_serial && <p className="text-[10px] text-muted-foreground font-mono">{item.device_serial}</p>}
            {item.service_name && <p className="text-[9px] text-muted-foreground italic">{item.service_name}</p>}
          </div>
        );
      },
    },
    {
      id: "clientInfo",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
          {t("maintenance.tableClient")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">{item.client_name || "—"}</p>
            {item.client_email && (
              <p className="text-[10px] text-muted-foreground truncate max-w-37.5">{item.client_email}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "assignedTech",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
          {t("maintenance.tableTech")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return item.assigned_tech_name ? (
          <span className="text-xs font-medium text-foreground flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            {item.assigned_tech_name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">{t("maintenance.unassignedTech")}</span>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
          {t("maintenance.tableStatus")}
        </span>
      ),
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      id: "actions",
      header: () => (
        <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider text-right">
          {t("common.actions")}
        </span>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-card border border-border"
              >
                <DropdownMenuLabel className="text-xs text-foreground font-heading">{t("maintenance.actionsLabel")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedEventDetails(item)} className="cursor-pointer text-xs text-foreground">
                  {t("maintenance.viewDetails")}
                </DropdownMenuItem>
                {isAdminOrTech && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "IN_PROGRESS")}
                      className="cursor-pointer text-xs text-secondary focus:text-secondary"
                    >
                      {t("maintenance.markInProgress")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "COMPLETED")}
                      className="cursor-pointer text-xs text-primary focus:text-primary"
                    >
                      {t("maintenance.markCompleted")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "CANCELLED")}
                      className="cursor-pointer text-xs text-destructive focus:text-destructive"
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-zinc-950 p-3.5 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xs">
          {/* Calendar Month Navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePrevMonth}
                className="h-7 w-7 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                title={t("maintenance.prevMonth")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-7 px-3 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer border-x border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              >
                {t("maintenance.today")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-7 w-7 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                title={t("maintenance.nextMonth")}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 capitalize font-heading">{monthYearTitle}</h2>
          </div>

          {/* Action & View Controls */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <Button
                type="button"
                size="icon"
                variant={viewMode === "CALENDAR" ? "secondary" : "ghost"}
                onClick={() => setViewMode("CALENDAR")}
                title={t("maintenance.viewCalendar")}
                aria-label={t("maintenance.viewCalendar")}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={viewMode === "LIST" ? "secondary" : "ghost"}
                onClick={() => setViewMode("LIST")}
                title={t("maintenance.viewList")}
                aria-label={t("maintenance.viewList")}
                className="h-7 w-7 p-0 cursor-pointer"
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Schedule Maintenance Button */}
            <Button
              type="button"
              size="sm"
              onClick={() => openScheduleModal()}
              className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("maintenance.scheduleBtn")}</span>
            </Button>
          </div>
        </div>

        {/* Filters Toolbar - Calendar view only */}
        {viewMode === "CALENDAR" && (
          <div className="bg-card p-3 border border-border rounded-xl shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <InputGroup size="sm" className="w-full md:max-w-xs bg-muted/40">
              <InputGroupInput
                placeholder={t("maintenance.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
            </InputGroup>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val)}
                >
                  <SelectTrigger className="w-36 h-7 text-xs font-medium bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("maintenance.filterAllStatuses")}</SelectItem>
                    <SelectItem value="SCHEDULED">{t("maintenance.statusScheduled")}</SelectItem>
                    <SelectItem value="IN_PROGRESS">{t("maintenance.statusInProgress")}</SelectItem>
                    <SelectItem value="COMPLETED">{t("maintenance.statusCompleted")}</SelectItem>
                    <SelectItem value="OVERDUE">{t("maintenance.statusOverdue")}</SelectItem>
                    <SelectItem value="CANCELLED">{t("maintenance.statusCancelled")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tech Filter (Admin/Tech) */}
              {isAdminOrTech && uniqueTechnicians.length > 0 && (
                <Select
                  value={selectedTechFilter}
                  onValueChange={(val) => setSelectedTechFilter(val)}
                >
                  <SelectTrigger className="w-36 h-7 text-xs font-medium bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t("maintenance.filterAllTechs")}</SelectItem>
                    {uniqueTechnicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        {/* CALENDAR VIEW GRID */}
        {viewMode === "CALENDAR" && (
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center font-bold text-[11px] text-muted-foreground py-2 font-heading">
              <div>{t("calendar.sun")}</div>
              <div>{t("calendar.mon")}</div>
              <div>{t("calendar.tue")}</div>
              <div>{t("calendar.wed")}</div>
              <div>{t("calendar.thu")}</div>
              <div>{t("calendar.fri")}</div>
              <div>{t("calendar.sat")}</div>
            </div>

            {/* Days Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border">
              {calendarDays.map((dayItem, idx) => {
                const isToday = dayItem.date.toDateString() === new Date().toDateString();
                const dayMaintenances = filteredMaintenances.filter(
                  (m) => new Date(m.scheduled_date).toDateString() === dayItem.date.toDateString(),
                );

                return (
                  <div
                    key={idx}
                    className={`min-h-27.5 p-1.5 flex flex-col justify-start transition-colors ${
                      !dayItem.isCurrentMonth
                        ? "bg-muted/10 text-muted-foreground/40"
                        : "bg-card text-foreground"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 px-1">
                      <span
                        className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                          isToday
                            ? "bg-primary text-primary-foreground font-heading"
                            : dayItem.isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }`}
                      >
                        {dayItem.date.getDate()}
                      </span>
                      {dayItem.isCurrentMonth && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => openScheduleModal()}
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0 cursor-pointer transition-opacity"
                          title={t("maintenance.scheduleBtn")}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Events List for Day */}
                    <div className="space-y-1 overflow-y-auto max-h-21.25 pr-0.5">
                      {dayMaintenances.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedEventDetails(m)}
                          className={`p-1 rounded border text-[10px] cursor-pointer font-medium leading-tight truncate transition-all hover:scale-[1.02] shadow-xs ${
                            m.status === "COMPLETED"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : m.status === "IN_PROGRESS"
                                ? "bg-secondary text-secondary-foreground border-border"
                                : m.status === "OVERDUE"
                                  ? "bg-destructive/10 text-destructive border-destructive/20"
                                  : "bg-primary/10 text-primary border-primary/20"
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
          <AlertDialogContent className="bg-card border border-border rounded-sm max-w-md w-full p-5 shadow-2xl space-y-4">
            <AlertDialogHeader className="flex flex-row justify-between items-start border-b border-border pb-3 space-y-0 text-left">
              <div>
                <AlertDialogTitle className="text-sm font-bold text-foreground font-heading">{selectedEventDetails.title}</AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground font-mono mt-0.5">
                  {new Date(selectedEventDetails.scheduled_date).toLocaleString()}
                </AlertDialogDescription>
              </div>
              {getStatusBadge(selectedEventDetails.status)}
            </AlertDialogHeader>

            <div className="space-y-2 text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">{t("maintenance.tableDevice")}:</span>
                <span className="font-bold">{selectedEventDetails.device_name || t("devices.unnamedDevice")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">{t("devices.wizardStep3SerialNumber")}:</span>
                <span className="font-mono">{selectedEventDetails.device_serial || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">{t("maintenance.tableClient")}:</span>
                <span>{selectedEventDetails.client_name || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-semibold">{t("maintenance.tableTech")}:</span>
                <span>{selectedEventDetails.assigned_tech_name || t("maintenance.unassignedTech")}</span>
              </div>
              {selectedEventDetails.notes && (
                <div className="border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground font-semibold block mb-0.5">{t("maintenance.labelNotes")}:</span>
                  <p className="text-foreground italic bg-card p-2 rounded border border-border">
                    {selectedEventDetails.notes}
                  </p>
                </div>
              )}
            </div>

            <AlertDialogFooter className="flex justify-end gap-2 pt-2">
              <AlertDialogCancel
                onClick={() => setSelectedEventDetails(null)}
                className="h-8 px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-opacity cursor-pointer border-0 mt-0"
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
