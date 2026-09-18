import { useState, useMemo, useCallback } from "react";
import { Plus, Eye, MoreHorizontal, Ban, ChevronRight, List, LayoutGrid, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Page } from "@/components/Page";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef, Column } from "@tanstack/react-table";
import { useUrlState } from "@/hooks/useUrlState";
import { useTicketsPage } from "../hooks/useTicketsPage";
import type { TicketItem as Ticket, TicketResponseItem as TicketResponse } from "../api/ticketService";
import { ticketService } from "../api/ticketService";
import { useTranslation } from "react-i18next";
import { NewTicketModal, TicketKanbanBoard } from "../components";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { priorityColor } from "@/constants/tickets";
import { cn } from "@/lib/utils";
import { useTicketReadStore } from "@/store/useTicketReadStore";

// 1. Decoupled Hover Card Title Sub-component with Read/Unread Indicator
export function TicketTitleWithHoverCard({ ticket, userId }: { ticket: Ticket; userId?: string }) {
  const { t } = useTranslation();
  const [lastResponse, setLastResponse] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isRead = useTicketReadStore((state) => state.isTicketRead(ticket.id, userId));
  const markAsRead = useTicketReadStore((state) => state.markAsRead);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      markAsRead(ticket.id, userId);
      if (!hasLoaded && !loading) {
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
    }
  };

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {!isRead && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 inline-block animate-pulse"
          title={t("tickets.unread", "Unread")}
          aria-label={t("tickets.unread", "Unread")}
        />
      )}
      <HoverCard onOpenChange={handleOpenChange}>
        <HoverCardTrigger asChild>
          <span
            className={cn(
              "text-xs truncate max-w-xs block cursor-pointer hover:underline",
              isRead ? "font-normal text-muted-foreground hover:text-foreground" : "font-semibold text-foreground"
            )}
          >
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
    </div>
  );
}

// 2. Main Tickets Page Component
export function TicketsPage() {
  const {
    t,
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
    dateRangeFilter,
    setDateRangeFilter,
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
    setSelectedTickets,
  } = useTicketsPage();

  const { getParam, setParam } = useUrlState();
  const viewParam = getParam("view", "list") as "list" | "kanban";
  const [viewMode, setViewMode] = useState<"list" | "kanban">(viewParam === "kanban" ? "kanban" : "list");

  const handleViewChange = useCallback(
    (mode: "list" | "kanban") => {
      setViewMode(mode);
      setParam("view", mode === "list" ? null : mode);
    },
    [setParam],
  );

  const markTicketAsRead = useTicketReadStore((state) => state.markAsRead);

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("tickets.colTitle")} />
        ),
        cell: ({ row }) => <TicketTitleWithHoverCard ticket={row.original} userId={user?.id} />,
      },
      ...(user?.role === "ADMIN" || user?.role === "TECHNICIAN"
        ? [
            {
              accessorKey: "client_name",
              header: ({ column }: { column: Column<Ticket, unknown> }) => (
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
        cell: ({ row }) => {
          const status = row.original.status;
          const isResolved = status === "RESOLVED" || status === "RESOLVED_AUTOMATED";
          const isPendingOrProgress = status === "IN_PROGRESS" || status === "AWAITING_PAYMENT";
          const isCancelled = status === "CANCELLED";
          const isOpen = status === "OPEN";

          const badgeClasses = isResolved
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20"
            : isPendingOrProgress
              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20"
              : isCancelled
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20"
                : isOpen
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-500/20"
                  : "bg-muted text-muted-foreground border-border";

          const dotClass = isResolved
            ? "bg-emerald-500"
            : isPendingOrProgress
              ? "bg-amber-500"
              : isCancelled
                ? "bg-red-500"
                : isOpen
                  ? "bg-blue-500"
                  : "bg-muted-foreground";

          return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border ${badgeClasses}`}>
              <span className={`mr-1 h-1 w-1 rounded-full ${dotClass}`} />
              {t(`tickets.statuses.${status}`)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              {t("tickets.colActions")}
            </span>
          </div>
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const tItem = row.original;
          const canCancel = tItem.status !== "CLOSED" && tItem.status !== "CANCELLED" && tItem.status !== "RESOLVED";

          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  markTicketAsRead(tItem.id, user?.id);
                  navigate(`/tickets/${tItem.id}`);
                }}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t("tickets.viewDetails")}</span>
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
                  <DropdownMenuItem
                    onClick={() => {
                      markTicketAsRead(tItem.id, user?.id);
                      navigate(`/tickets/${tItem.id}`);
                    }}
                    className="text-xs cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {t("tickets.viewDetails")}
                  </DropdownMenuItem>
                  {canCancel && (
                    <>
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => handleTicketAction("cancel", tItem)}
                        className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1 text-destructive" />
                        {t("tickets.cancelTicket")}
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
    [t, user, navigate, handleTicketAction, markTicketAsRead],
  );

  return (
    <Page
      activeView={viewMode}
      onViewChange={handleViewChange}
      defaultView={viewMode}
      availableViews={[
        { value: "list", label: t("resources.viewList", "List"), icon: List, title: t("resources.viewList", "List") },
        { value: "kanban", label: t("tickets.kanban", "Kanban"), icon: LayoutGrid, title: t("tickets.kanban", "Kanban") },
      ]}
      totalCount={total}
      defaultPage={page}
      defaultPageSize={limit}
    >
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t("tickets.title")}</Page.Title>
            <Page.Description>{t("tickets.subtitle")}</Page.Description>
          </Page.TitleGroup>
          {canCreateTicket && (
            <Page.Actions maxVisible={3}>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowNewTicket(true)}
                className="h-7 px-3 text-xs font-semibold gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("tickets.newTicket")}</span>
              </Button>
            </Page.Actions>
          )}
        </Page.HeaderRow>
        <Page.Toolbar>
          <Page.Filters>
            <InputGroup className="w-full sm:w-72">
              <InputGroupInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("tickets.searchPlaceholder")}
              />
              <InputGroupAddon>
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="tickets-status-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("tickets.colStatus")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select
                  value={statusFilter || "all"}
                  onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
                >
                  <SelectTrigger
                    id="tickets-status-filter"
                    aria-label={t("tickets.colStatus")}
                    size="default"
                    className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("tickets.filterAllStatuses")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterAllStatuses")}
                    </SelectItem>
                    <SelectItem value="OPEN" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterOpen")}
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterInProgress")}
                    </SelectItem>
                    <SelectItem value="RESOLVED" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterResolved")}
                    </SelectItem>
                    <SelectItem value="CLOSED" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterClosed")}
                    </SelectItem>
                    <SelectItem value="CANCELLED" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterCancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="tickets-category-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("tickets.colCategory")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select
                  value={categoryFilter || "all"}
                  onValueChange={(val) => setCategoryFilter(val === "all" ? "" : val)}
                >
                  <SelectTrigger
                    id="tickets-category-filter"
                    aria-label={t("tickets.colCategory")}
                    size="default"
                    className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("tickets.filterAllCategories")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterAllCategories")}
                    </SelectItem>
                    <SelectItem value="REPAIR" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.REPAIR")}
                    </SelectItem>
                    <SelectItem value="WARRANTY" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.WARRANTY")}
                    </SelectItem>
                    <SelectItem value="SERVICE_OUTAGE" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.SERVICE_OUTAGE")}
                    </SelectItem>
                    <SelectItem value="PREVENTATIVE_MAINTENANCE" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.PREVENTATIVE_MAINTENANCE") || "Maintenance"}
                    </SelectItem>
                    <SelectItem value="HELPDESK" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.HELPDESK")}
                    </SelectItem>
                    <SelectItem value="AI" className="text-xs font-medium cursor-pointer">
                      {t("tickets.categories.AI")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="tickets-priority-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("tickets.colPriority")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select
                  value={priorityFilter || "all"}
                  onValueChange={(val) => setPriorityFilter(val === "all" ? "" : val)}
                >
                  <SelectTrigger
                    id="tickets-priority-filter"
                    aria-label={t("tickets.colPriority")}
                    size="default"
                    className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("tickets.filterAllPriorities")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterAllPriorities")}
                    </SelectItem>
                    <SelectItem value="LOW" className="text-xs font-medium cursor-pointer">
                      {t("tickets.priorities.LOW")}
                    </SelectItem>
                    <SelectItem value="MEDIUM" className="text-xs font-medium cursor-pointer">
                      {t("tickets.priorities.MEDIUM")}
                    </SelectItem>
                    <SelectItem value="HIGH" className="text-xs font-medium cursor-pointer">
                      {t("tickets.priorities.HIGH")}
                    </SelectItem>
                    <SelectItem value="CRITICAL" className="text-xs font-medium cursor-pointer">
                      {t("tickets.priorities.CRITICAL")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="tickets-daterange-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("tickets.colDateRange")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select value={dateRangeFilter || "all"} onValueChange={setDateRangeFilter}>
                  <SelectTrigger
                    id="tickets-daterange-filter"
                    aria-label={t("tickets.colDateRange")}
                    size="default"
                    className="px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("tickets.filterAllDates")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterAllDates")}
                    </SelectItem>
                    <SelectItem value="today" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterToday")}
                    </SelectItem>
                    <SelectItem value="7d" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterLast7Days")}
                    </SelectItem>
                    <SelectItem value="30d" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterLast30Days")}
                    </SelectItem>
                    <SelectItem value="month" className="text-xs font-medium cursor-pointer">
                      {t("tickets.filterThisMonth")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Page.Filters>
          <Page.Controls>
            <Page.ViewSwitcher
              value={viewMode}
              onChange={handleViewChange}
              options={[
                { value: "list", label: t("resources.viewList", "List"), icon: List, title: t("resources.viewList", "List") },
                { value: "kanban", label: t("tickets.kanban", "Kanban"), icon: LayoutGrid, title: t("tickets.kanban", "Kanban") },
              ]}
            />
          </Page.Controls>
        </Page.Toolbar>
      </Page.Header>

      <Page.View type="list">
        <DataTable
          columns={columns}
          data={tickets}
          loading={loading}
          noDataMessage={t("tickets.noTicketsFound")}
          onRowClick={(ticket) => {
            markTicketAsRead(ticket.id, user?.id);
            navigate(`/tickets/${ticket.id}`);
          }}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          enableSorting
          manualSorting
          enableRowSelection
          onSelectedRowsChange={setSelectedTickets}
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
      </Page.View>

      <Page.View type="kanban">
        <TicketKanbanBoard
          tickets={tickets}
          loading={loading}
          userId={user?.id}
          onTicketClick={(ticket) => {
            markTicketAsRead(ticket.id, user?.id);
            navigate(`/tickets/${ticket.id}`);
          }}
        />
      </Page.View>

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
            <AlertDialogCancel className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer">
              {t("tickets.modalCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
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
            <AlertDialogCancel className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer">
              {t("tickets.modalCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90 border-0"
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
              className="h-7 px-3 rounded-md text-xs font-semibold cursor-pointer"
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
