import React, { useState, useMemo, useCallback } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTicketsPage } from "@/hooks/useTicketsPage";
import { ticketService } from "@/services/ticketService";
import type { Ticket, TicketResponse } from "@/services/ticketService";
import { Page } from "@/components/Page";
import { NewTicketModal } from "@/components/NewTicketModal";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusColor: Record<string, string> = {
  OPEN: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50",
  AWAITING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse",
  RESOLVED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50",
  CLOSED: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
  CANCELLED: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50",
};

const priorityColor: Record<string, string> = {
  LOW: "text-zinc-500",
  MEDIUM: "text-amber-600 dark:text-amber-400",
  HIGH: "text-red-500",
  CRITICAL: "text-red-600 dark:text-red-400 font-bold",
};

// 1. Decoupled Hover Card Title Sub-component
export function TicketTitleWithHoverCard({ ticket }: { ticket: Ticket }) {
  const { t } = useTranslation();
  const [lastResponse, setLastResponse] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleOpenChange = async (open: boolean) => {
    if (open && !hasLoaded && !loading) {
      setLoading(true);
      try {
        const responses = await ticketService.getResponses(ticket.id);
        if (responses.length > 0) {
          const sorted = [...responses].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLastResponse(sorted[0]);
        }
        setHasLoaded(true);
      } catch (err) {
        console.error("Failed to load last response", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <HoverCard onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-xs block cursor-pointer hover:underline">
          {ticket.title}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-3 shadow-md rounded-md">
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            {t("ticketDetail.responsesTitle") || "Last Response"}
          </h4>
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-3.5 h-3.5 border-2 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
            </div>
          ) : lastResponse ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-zinc-500 font-medium">
                <span className="truncate max-w-[150px]">
                  {lastResponse.user_name} ({lastResponse.user_role})
                </span>
                <span>{new Date(lastResponse.created_at).toLocaleDateString()}</span>
              </div>
              <ScrollArea className="h-16 bg-zinc-50 dark:bg-zinc-900/30 p-1.5 rounded border border-zinc-100 dark:border-zinc-900">
                <p className="text-[10px] leading-relaxed text-zinc-700 dark:text-zinc-300 text-left font-normal whitespace-pre-wrap">
                  {lastResponse.message}
                </p>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400 italic">
              {t("ticketDetail.noResponses") || "No responses yet."}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}



// 5. Parent Dashboard Page
export function TicketsPage() {
  const {
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
    setSelectedTickets,
    ticketToCancel,
    setTicketToCancel,
    showBulkCancelAlert,
    setShowBulkCancelAlert,
    alertWarningMessage,
    setAlertWarningMessage,
    totalPages,
    limit,

    handleBulkCancelClick,
    confirmBulkCancel,
    confirmCancelIndividual,
    handleTicketCreated,
  } = useTicketsPage();

  const getCategoryLabel = useCallback(
    (cat: string) => {
      const map: Record<string, string> = {
        REPAIR: t("tickets.categories.REPAIR"),
        WARRANTY: t("tickets.categories.WARRANTY"),
        SERVICE_OUTAGE: t("tickets.categories.SERVICE_OUTAGE"),
      };
      return map[cat] || cat;
    },
    [t]
  );

  const getPriorityLabel = useCallback(
    (pri: string) => {
      const map: Record<string, string> = {
        LOW: t("tickets.priorities.LOW"),
        MEDIUM: t("tickets.priorities.MEDIUM"),
        HIGH: t("tickets.priorities.HIGH"),
        CRITICAL: t("tickets.priorities.CRITICAL"),
      };
      return map[pri] || pri;
    },
    [t]
  );

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        OPEN: t("tickets.filterOpen"),
        IN_PROGRESS: t("tickets.filterInProgress"),
        AWAITING_PAYMENT: t("tickets.filterAwaitingPayment"),
        RESOLVED: t("tickets.filterResolved"),
        CLOSED: t("tickets.filterClosed"),
        CANCELLED: t("tickets.filterCancelled"),
      };
      return map[status] || status;
    },
    [t]
  );

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "title",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("tickets.tableTitle")}</span>
        ),
        cell: ({ row }) => <TicketTitleWithHoverCard ticket={row.original} />,
      },
      {
        accessorKey: "category",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
            {t("tickets.tableCategory")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{getCategoryLabel(row.original.category)}</span>
        ),
      },
      {
        accessorKey: "priority",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">
            {t("tickets.tablePriority")}
          </span>
        ),
        cell: ({ row }) => (
          <span className={`text-[11px] font-medium ${priorityColor[row.original.priority]}`}>
            {getPriorityLabel(row.original.priority)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("tickets.tableStatus")}</span>
        ),
        cell: ({ row }) => (
          <span className={`px-1.5 py-0.5 rounded text-[10px] border font-semibold ${statusColor[row.original.status]}`}>
            {getStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        accessorKey: "assigned_to",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("tickets.assignedTo")}</span>
        ),
        cell: ({ row }) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.assigned_tech_name || t("tickets.unassigned")}</span>,
      },
      {
        accessorKey: "device_name",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("tickets.tableDevice")}</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{row.original.device_name || t("tickets.noDevice")}</span>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider">{t("tickets.tableCreated")}</span>
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(row.original.created_at).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="uppercase text-[10px] text-zinc-400 font-bold tracking-wider block text-right">
            {t("techDashboard.tableStatus") === "Estado" ? "Acciones" : "Actions"}
          </span>
        ),
        cell: ({ row }) => {
          const ticket = row.original;
          const canCancel = ["OPEN", "IN_PROGRESS", "AWAITING_PAYMENT"].includes(ticket.status);

          const handleCancelClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            setTicketToCancel(ticket);
          };

          const handleCopyId = (e: React.MouseEvent) => {
            e.stopPropagation();
            navigator.clipboard.writeText(ticket.id);
          };

          return (
            <div className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md cursor-pointer transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                    <MoreHorizontal className="h-3.5 w-3.5 text-zinc-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                  <DropdownMenuLabel className="text-xs">{t("tickets.actionsLabel") || "Actions"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    {t("dashboard.viewDetails") || "View Details"}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs" onClick={handleCopyId}>{t("tickets.copyId") || "Copy Ticket ID"}</DropdownMenuItem>
                  {canCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={handleCancelClick}>
                        {t("tickets.cancelTicket") || "Cancel Ticket"}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, i18n.language, navigate, getCategoryLabel, getPriorityLabel, getStatusLabel, setTicketToCancel]
  );

  return (
    <Page
      title={t("tickets.title")}
      subtitle={t("tickets.subtitle")}
      isLoading={loading}
      actions={
        <button
          onClick={() => setShowNewTicket(true)}
          className="bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 px-3 h-8 rounded-md flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("tickets.newTicket")}
        </button>
      }
    >
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        noDataMessage={t("tickets.noTicketsFound")}
        onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
        enableRowSelection={true}
        onSelectedRowsChange={setSelectedTickets}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: t("tickets.searchPlaceholder")
        }}
        filters={[
          {
            id: "status",
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: "OPEN", label: t("tickets.filterOpen") },
              { value: "IN_PROGRESS", label: t("tickets.filterInProgress") },
              { value: "AWAITING_PAYMENT", label: t("tickets.filterAwaitingPayment") },
              { value: "RESOLVED", label: t("tickets.filterResolved") },
              { value: "CLOSED", label: t("tickets.filterClosed") },
              { value: "CANCELLED", label: t("tickets.filterCancelled") },
            ],
            placeholder: t("tickets.filterAllStatuses")
          },
          ...(devices.length > 0 ? [{
            id: "device",
            value: deviceFilter,
            onChange: (val) => {
              setDeviceFilter(val);
              setPage(1);
            },
            options: devices.map((device) => ({
              value: device.id,
              label: device.device_name || `Device ${device.slot_index + 1}`
            })),
            placeholder: t("tickets.filterAllDevices")
          }] : [])
        ]}
        bulkActions={[
          {
            label: t("tickets.bulkCancel") || "Bulk Cancel",
            onClick: handleBulkCancelClick,
            variant: "destructive"
          }
        ]}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit,
          onPageChange: setPage
        }}
      />

      {/* New Ticket Modal */}
      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} onCreated={handleTicketCreated} />}

      {/* Individual Cancel Alert */}
      <AlertDialog open={!!ticketToCancel} onOpenChange={(open) => !open && setTicketToCancel(null)}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">{t("tickets.cancelTicket")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("tickets.confirmCancel")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">{t("tickets.modalCancel")}</AlertDialogCancel>
            <AlertDialogAction className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0" onClick={confirmCancelIndividual}>
              {t("tickets.cancelTicket")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cancel Alert */}
      <AlertDialog open={showBulkCancelAlert} onOpenChange={setShowBulkCancelAlert}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">{t("tickets.bulkCancel")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">
              {t("tickets.confirmBulkCancel")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900">{t("tickets.modalCancel")}</AlertDialogCancel>
            <AlertDialogAction className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-red-600 hover:bg-red-700 text-white border-0" onClick={confirmBulkCancel}>
              {t("tickets.bulkCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Info Alert */}
      <AlertDialog open={!!alertWarningMessage} onOpenChange={(open) => !open && setAlertWarningMessage(null)}>
        <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold">
              {t("dashboard.technicalSupport") || "Warning"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-zinc-500 leading-relaxed mt-1">{alertWarningMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex justify-end">
            <AlertDialogAction className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" onClick={() => setAlertWarningMessage(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
