import { useMemo, useState, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  User,
  Laptop,
  Eye,
  Ban,
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
import { useMaintenance } from "../hooks/useMaintenance";
import { ScheduleMaintenanceModal } from "../components/ScheduleMaintenanceModal";
import type { DeviceMaintenance, MaintenanceStatus } from "../api/maintenanceService";
import { cn } from "@/lib/utils";
import type { PageCalendarEvent } from "@/components/page/types";

export function MaintenancePage() {
  const { t } = useTranslation();
  const {
    isAdminOrTech,
    currentDate,
    setCurrentDate,
    viewMode,
    setViewMode,
    filteredMaintenances,
    paginatedMaintenances,
    allEquipment,
    loading,
    statusFilter,
    searchQuery,
    handleSearchChange,
    handleStatusFilterChangeForList,
    handleTechFilterChange,
    handleListLimitChange,
    selectedTechFilter,
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
    handleStatusChange,
  } = useMaintenance();

  const [selectedEventDetails, setSelectedEventDetails] = useState<DeviceMaintenance | null>(null);

  // Map maintenances to PageCalendarEvent models
  const calendarEvents: PageCalendarEvent[] = useMemo(() => {
    return filteredMaintenances.map((m) => {
      let variant: PageCalendarEvent["variant"] = "primary";
      if (m.status === "COMPLETED") variant = "success";
      else if (m.status === "IN_PROGRESS") variant = "warning";
      else if (m.status === "OVERDUE") variant = "destructive";
      else if (m.status === "CANCELLED") variant = "default";

      return {
        id: m.id,
        title: `${m.device_name || t("devices.unnamedDevice")} - ${m.title}`,
        date: new Date(m.scheduled_date),
        variant,
        data: m,
      };
    });
  }, [filteredMaintenances, t]);

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

  // Filter options for ElevenLabs PageFilterPill
  const statusOptions = useMemo(
    () => [
      { value: "SCHEDULED", label: t("maintenance.statusScheduled") },
      { value: "IN_PROGRESS", label: t("maintenance.statusInProgress") },
      { value: "COMPLETED", label: t("maintenance.statusCompleted") },
      { value: "OVERDUE", label: t("maintenance.statusOverdue") },
      { value: "CANCELLED", label: t("maintenance.statusCancelled") },
    ],
    [t],
  );

  const techOptions = useMemo(
    () => uniqueTechnicians.map((tech) => ({ value: tech.id, label: tech.name })),
    [uniqueTechnicians],
  );

  const hasActiveFilters = Boolean(
    searchQuery ||
    (statusFilter && statusFilter !== "ALL") ||
    (selectedTechFilter && selectedTechFilter !== "ALL")
  );

  const handleClearAllFilters = useCallback(() => {
    handleSearchChange("");
    handleStatusFilterChangeForList("ALL");
    handleTechFilterChange("ALL");
  }, [handleSearchChange, handleStatusFilterChangeForList, handleTechFilterChange]);

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
              {item.title || item.device_name || t("devices.unnamedDevice")}
            </p>
            {item.title && item.device_name && <p className="text-[11px] text-muted-foreground">{item.device_name}</p>}
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
        <div className="text-right">
          <span className="uppercase text-[10px] font-bold text-muted-foreground tracking-wider">
            {t("common.actions")}
          </span>
        </div>
      ),
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setSelectedEventDetails(item);
              }}
              className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
            >
              <span>{t("maintenance.viewDetails") || "View Details"}</span>
              <ChevronRight className="h-3 w-3" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className="h-7 w-7 cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {t("maintenance.actionsLabel")}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setSelectedEventDetails(item)} className="text-xs cursor-pointer">
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {t("maintenance.viewDetails")}
                </DropdownMenuItem>
                {isAdminOrTech && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "IN_PROGRESS")}
                      className="text-xs text-secondary focus:text-secondary cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {t("maintenance.markInProgress")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "COMPLETED")}
                      className="text-xs text-primary focus:text-primary cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {t("maintenance.markCompleted")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(item.id, "CANCELLED")}
                      className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5 mr-1 text-destructive" />
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
    <Page<"calendar" | "list">
      defaultView="calendar"
      activeView={viewMode.toLowerCase() as "calendar" | "list"}
      onViewChange={(v) => setViewMode(v.toUpperCase() as "CALENDAR" | "LIST")}
      availableViews={[
        {
          value: "calendar",
          icon: LayoutGrid,
          title: t("maintenance.viewCalendar"),
          ariaLabel: t("maintenance.viewCalendar"),
        },
        {
          value: "list",
          icon: ListIcon,
          title: t("maintenance.viewList"),
          ariaLabel: t("maintenance.viewList"),
        },
      ]}
      isLoading={loading}
    >
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title docsUrl="https://help.velmar.com/maintenance">{t("nav.maintenance")}</Page.Title>
            <Page.Description>{t("maintenance.subtitle")}</Page.Description>
          </Page.TitleGroup>
          <Page.Actions maxVisible={3}>
            <Button
              type="button"
              size="sm"
              onClick={() => openScheduleModal()}
              className="h-8 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("maintenance.scheduleBtn")}</span>
            </Button>
          </Page.Actions>
        </Page.HeaderRow>
      </Page.Header>

      <div className="space-y-3 mb-4">
        <Page.SearchInput
          value={searchQuery}
          onChange={(val) => handleSearchChange(val)}
          placeholder={t("maintenance.searchPlaceholder")}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <Page.FilterPill
              label={t("maintenance.tableStatus")}
              value={statusFilter && statusFilter !== "ALL" ? statusFilter : ""}
              options={statusOptions}
              onChange={(val) => handleStatusFilterChangeForList(val)}
              onClear={() => handleStatusFilterChangeForList("ALL")}
            />
            <span className="sr-only">{t("maintenance.filterAllStatuses")}</span>

            {/* Tech Filter (Admin/Tech) */}
            {isAdminOrTech && techOptions.length > 0 && (
              <>
                <Page.FilterPill
                  label={t("maintenance.tableTech")}
                  value={selectedTechFilter && selectedTechFilter !== "ALL" ? selectedTechFilter : ""}
                  options={techOptions}
                  onChange={(val) => handleTechFilterChange(val)}
                  onClear={() => handleTechFilterChange("ALL")}
                />
                <span className="sr-only">{t("maintenance.filterAllTechs")}</span>
              </>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearAllFilters}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
              >
                <X className="size-3 mr-1" />
                {t("common.clearFilters", "Clear all")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Page.ViewSwitcher size="sm" />
          </div>
        </div>
      </div>

      {/* CALENDAR / DATE VIEW */}
      <Page.View type="calendar" className="space-y-4">
        <Page.ContentCard className="p-4 sm:p-6">

        {/* Page.Date / Page.Calendar Component */}
        <Page.Date
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          events={calendarEvents}
          onEventClick={(evt) => setSelectedEventDetails(evt.data as DeviceMaintenance)}
          onDateClick={() => openScheduleModal()}
          renderEvent={(event) => {
            const m = event.data as DeviceMaintenance;
            return (
              <div
                className={cn(
                  "w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded border truncate transition-all flex items-center gap-1 cursor-pointer shadow-2xs",
                  event.variant === "success" && "bg-primary/10 text-primary border-primary/20",
                  event.variant === "warning" && "bg-secondary text-secondary-foreground border-border",
                  event.variant === "destructive" && "bg-destructive/10 text-destructive border-destructive/20",
                  event.variant === "default" && "bg-muted text-muted-foreground border-border",
                  (!event.variant || event.variant === "primary") && "bg-primary/15 text-primary border-primary/30",
                )}
                title={`${m.title} - ${m.device_name || ""}`}
              >
                <Laptop className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{m.device_name || t("devices.unnamedDevice")}</span>
              </div>
            );
          }}
        />
      
        </Page.ContentCard>
      </Page.View>

      {/* LIST VIEW TABLE */}
      <Page.View type="list" className="space-y-4">
        {filteredMaintenances.length === 0 ? (
          <Page.ContentCard className="p-8">
            <Page.EmptyState
              icon={CalendarIcon}
              title={t("maintenance.noMaintenancesFound")}
              description={t(
                "maintenance.noMaintenancesFoundDesc",
                "No maintenance tasks match your filter or schedule criteria."
              )}
              primaryAction={
                hasActiveFilters
                  ? {
                      label: t("common.clearFilters", "Clear all filters"),
                      onClick: handleClearAllFilters,
                    }
                  : {
                      label: t("maintenance.scheduleBtn"),
                      onClick: () => openScheduleModal(),
                    }
              }
            />
          </Page.ContentCard>
        ) : (
          <Page.ContentCard className="p-0 border-border/70 overflow-hidden">
            <DataTable
              columns={listColumns}
              data={paginatedMaintenances}
              noDataMessage={t("maintenance.noMaintenancesFound")}
              loading={loading}
              pagination={{
                page: listPage,
                totalPages: listTotalPages,
                totalItems: filteredMaintenances.length,
                limit: listLimit,
                onPageChange: setListPage,
                onLimitChange: handleListLimitChange,
              }}
            />
          </Page.ContentCard>
        )}
      </Page.View>

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
      <AlertDialog
        open={!!selectedEventDetails}
        onOpenChange={(open) => {
          if (!open) setSelectedEventDetails(null);
        }}
      >
        {selectedEventDetails && (
          <AlertDialogContent className="bg-card border border-border rounded-sm max-w-md w-full p-5 shadow-2xl space-y-4">
            <AlertDialogHeader className="flex flex-row justify-between items-start border-b border-border pb-3 space-y-0 text-left">
              <div>
                <AlertDialogTitle className="text-sm font-bold text-foreground font-heading">
                  {selectedEventDetails.title}
                </AlertDialogTitle>
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
                  <span className="text-muted-foreground font-semibold block mb-0.5">
                    {t("maintenance.labelNotes")}:
                  </span>
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
