import { useState, useMemo } from "react";
import { Plus, Eye, MoreHorizontal, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page } from "@/components/Page";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useTickets } from "@/hooks/useTicketsPage";
import type { Ticket, TicketResponse } from "@/services/ticketService";
import { ticketService } from "@/services/ticketService";
import { useTranslation } from "react-i18next";
import { NewTicketModal } from "@/components/new-ticket-modal";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusColor: Record<string, string> = {
  OPEN: "bg-primary/10 text-primary border-primary/20",
  IN_PROGRESS: "bg-secondary text-secondary-foreground border-border",
  AWAITING_PAYMENT: "bg-secondary text-secondary-foreground border-border animate-pulse",
  RESOLVED: "bg-primary/10 text-primary border-primary/20",
  RESOLVED_AUTOMATED: "bg-primary/10 text-primary border-primary/20",
  CLOSED: "bg-muted text-muted-foreground border-border",
  CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColor: Record<string, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-foreground font-medium",
  HIGH: "text-destructive font-semibold",
  CRITICAL: "text-destructive font-bold",
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
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
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
        <span className="text-xs font-semibold text-foreground truncate max-w-xs block cursor-pointer hover:underline">
          {ticket.title}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 bg-card border border-border p-3 shadow-md rounded-md">
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("ticketDetail.responsesTitle") || "Last Response"}
          </h4>
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : lastResponse ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] text-muted-foreground font-medium">
                <span className="truncate max-w-37.5">
                  {lastResponse.user_name} ({lastResponse.user_role})
                </span>
                <span>{new Date(lastResponse.created_at).toLocaleDateString()}</span>
              </div>
              <ScrollArea className="h-16 bg-muted/40 p-1.5 rounded border border-border">
                <p className="text-[10px] leading-relaxed text-foreground text-left font-normal whitespace-pre-wrap">
                  {lastResponse.message}
                </p>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              {t("ticketDetail.noResponses") || "No responses yet."}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// 2. Main Tickets Page Component
export function TicketsPage() {
  const {
    t,
    i18n,
    user,
    tickets,
    loading,
    total,
    page,
    totalPages,
    limit,
    setPage,
    handleLimitChange,
    sorting,
    handleSortingChange,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priorityFilter,
    setPriorityFilter,
    showNewTicket,
    setShowNewTicket,
    ticketToCancel,
    setTicketToCancel,
    showBulkCancelAlert,
    setShowBulkCancelAlert,
    alertWarningMessage,
    setAlertWarningMessage,
    navigate,
    canCreateTicket,
    handleBulkCancelClick,
    confirmCancelIndividual,
    confirmBulkCancel,
    handleTicketCreated,
    handleTicketAction,
  } = useTickets();

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colTitle")} />
        ),
        cell: ({ row }) => <TicketTitleWithHoverCard ticket={row.original} />,
      },
      ...(user?.role === "ADMIN" || user?.role === "TECHNICIAN"
        ? [
            {
              accessorKey: "client_name",
              header: ({ column }: { column: any }) => (
                <DataTableColumnHeader column={column} title={t("tickets.colClient")} />
              ),
              cell: ({ row }: { row: { original: Ticket } }) => (
                <span className="text-xs font-medium text-foreground">{row.original.client_name || "-"}</span>
              ),
            },
          ]
        : []),
      {
        accessorKey: "category",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colCategory")} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">{t(`tickets.categories.${row.original.category}`)}</span>
        ),
      },
      {
        accessorKey: "priority",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colPriority")} />
        ),
        cell: ({ row }) => (
          <span className={`text-xs font-semibold ${priorityColor[row.original.priority] || "text-foreground"}`}>
            {t(`tickets.priorities.${row.original.priority}`)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colStatus")} />
        ),
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusColor[row.original.status] || "bg-muted text-muted-foreground border-border"}`}
          >
            {t(`tickets.statuses.${row.original.status}`)}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colCreated")} />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(row.original.created_at).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {t("tickets.colActions")}
          </span>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const tItem = row.original;
          return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-muted rounded-md cursor-pointer transition-colors border border-transparent hover:border-border">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-card border border-border">
                  <DropdownMenuItem
                    onClick={() => navigate(`/tickets/${tItem.id}`)}
                    className="flex items-center gap-2 text-xs cursor-pointer text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("tickets.viewDetails")}
                  </DropdownMenuItem>
                  {tItem.status !== "CLOSED" && tItem.status !== "CANCELLED" && tItem.status !== "RESOLVED" && (
                    <DropdownMenuItem
                      onClick={() => handleTicketAction("cancel", tItem)}
                      className="flex items-center gap-2 text-xs text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {t("tickets.cancelTicket")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, i18n.language, user, navigate, handleTicketAction],
  );

  return (
    <Page
      title={t("tickets.title")}
      subtitle={t("tickets.subtitle")}
      actions={
        canCreateTicket ? (
          <Button
            onClick={() => setShowNewTicket(true)}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4" />
            {t("tickets.newTicket")}
          </Button>
        ) : undefined
      }
    >
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        noDataMessage={t("tickets.noTicketsFound")}
        onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        enableSorting
        manualSorting
        search={{
          value: searchQuery,
          onChange: setSearchQuery,
          placeholder: t("tickets.searchPlaceholder"),
        }}
        filters={[
          {
            id: "status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "OPEN", label: t("tickets.filterOpen") },
              { value: "IN_PROGRESS", label: t("tickets.filterInProgress") },
              { value: "RESOLVED", label: t("tickets.filterResolved") },
              { value: "CLOSED", label: t("tickets.filterClosed") },
              { value: "CANCELLED", label: t("tickets.filterCancelled") },
            ],
            placeholder: t("tickets.filterAllStatuses"),
          },
          {
            id: "category",
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: "REPAIR", label: t("tickets.categories.REPAIR") },
              { value: "WARRANTY", label: t("tickets.categories.WARRANTY") },
              { value: "SERVICE_OUTAGE", label: t("tickets.categories.SERVICE_OUTAGE") },
              {
                value: "PREVENTATIVE_MAINTENANCE",
                label: t("tickets.categories.PREVENTATIVE_MAINTENANCE") || "Maintenance",
              },
            ],
            placeholder: t("tickets.filterAllCategories"),
          },
          {
            id: "priority",
            value: priorityFilter,
            onChange: setPriorityFilter,
            options: [
              { value: "LOW", label: t("tickets.priorities.LOW") },
              { value: "MEDIUM", label: t("tickets.priorities.MEDIUM") },
              { value: "HIGH", label: t("tickets.priorities.HIGH") },
              { value: "CRITICAL", label: t("tickets.priorities.CRITICAL") },
            ],
            placeholder: t("tickets.filterAllPriorities"),
          },
        ]}
        bulkActions={[
          {
            label: t("tickets.bulkCancel"),
            onClick: handleBulkCancelClick,
            variant: "destructive",
          },
        ]}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit,
          onPageChange: setPage,
          onLimitChange: handleLimitChange,
        }}
      />

      {/* New Ticket Modal */}
      {showNewTicket && <NewTicketModal onClose={() => setShowNewTicket(false)} onCreated={handleTicketCreated} />}

      {/* Individual Cancel Alert */}
      <AlertDialog open={!!ticketToCancel} onOpenChange={(open) => !open && setTicketToCancel(null)}>
        <AlertDialogContent className="bg-card border border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading">{t("tickets.cancelTicket")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("tickets.confirmCancel")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer">
              {t("tickets.modalCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
              onClick={confirmCancelIndividual}
            >
              {t("tickets.cancelTicket")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cancel Alert */}
      <AlertDialog open={showBulkCancelAlert} onOpenChange={setShowBulkCancelAlert}>
        <AlertDialogContent className="bg-card border border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading">{t("tickets.bulkCancel")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {t("tickets.confirmBulkCancel")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 flex justify-end">
            <AlertDialogCancel className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer">
              {t("tickets.modalCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
              onClick={confirmBulkCancel}
            >
              {t("tickets.bulkCancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Info Alert */}
      <AlertDialog open={!!alertWarningMessage} onOpenChange={(open) => !open && setAlertWarningMessage(null)}>
        <AlertDialogContent className="bg-card border border-border text-foreground max-w-sm rounded-lg p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold font-heading">
              {t("dashboard.technicalSupport") || "Warning"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              {alertWarningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex justify-end">
            <AlertDialogAction
              className="h-8 px-3 rounded-md text-xs font-semibold cursor-pointer"
              onClick={() => setAlertWarningMessage(null)}
            >
              {t("common.close") || "OK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

export default TicketsPage;
