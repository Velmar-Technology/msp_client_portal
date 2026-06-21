import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { Ticket, TicketResponse } from '../services/ticketService';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { NewTicketModal } from '@/components/NewTicketModal';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { ScrollArea } from '@/components/ui/scroll-area';



const statusColor: Record<string, string> = {
  OPEN: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  AWAITING_PAYMENT: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  CLOSED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error/10 text-error',
};

const priorityColor: Record<string, string> = {
  LOW: 'text-on-surface-variant',
  MEDIUM: 'text-warning',
  HIGH: 'text-error',
  CRITICAL: 'text-error font-bold',
};

function TicketTitleWithHoverCard({ ticket }: { ticket: Ticket }) {
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
        console.error('Failed to load last response', err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <HoverCard onOpenChange={handleOpenChange}>
      <HoverCardTrigger asChild>
        <span className="text-body-md font-medium text-on-surface truncate max-w-xs block cursor-pointer hover:text-primary font-medium hover:underline transition-colors">
          {ticket.title}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 bg-surface-container-lowest border border-outline-variant p-4">
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <h4 className="text-label-md font-bold text-primary">
            {t('ticketDetail.responsesTitle') || 'Last Response'}
          </h4>
          {loading ? (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : lastResponse ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-medium">
                <span>{lastResponse.user_name} ({lastResponse.user_role})</span>
                <span>
                  {new Date(lastResponse.created_at).toLocaleDateString()}
                </span>
              </div>
              <ScrollArea className="h-20 bg-surface-container-low p-2 rounded border border-outline-variant/30">
                <p className="text-[11px] text-on-surface text-left font-normal whitespace-pre-wrap">
                  {lastResponse.message}
                </p>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-[11px] text-on-surface-variant italic">
              {t('ticketDetail.noResponses') || 'No responses yet.'}
            </p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

export function TicketsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Ticket[]>([]);
  const [ticketToCancel, setTicketToCancel] = useState<Ticket | null>(null);
  const [showBulkCancelAlert, setShowBulkCancelAlert] = useState(false);
  const [alertWarningMessage, setAlertWarningMessage] = useState<string | null>(null);
  const limit = 10;

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      REPAIR: t('tickets.categories.REPAIR'),
      WARRANTY: t('tickets.categories.WARRANTY'),
      SERVICE_OUTAGE: t('tickets.categories.SERVICE_OUTAGE'),
    };
    return map[cat] || cat;
  };

  const getPriorityLabel = (pri: string) => {
    const map: Record<string, string> = {
      LOW: t('tickets.priorities.LOW'),
      MEDIUM: t('tickets.priorities.MEDIUM'),
      HIGH: t('tickets.priorities.HIGH'),
      CRITICAL: t('tickets.priorities.CRITICAL'),
    };
    return map[pri] || pri;
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      OPEN: t('tickets.filterOpen'),
      IN_PROGRESS: t('tickets.filterInProgress'),
      AWAITING_PAYMENT: t('tickets.filterAwaitingPayment'),
      RESOLVED: t('tickets.filterResolved'),
      CLOSED: t('tickets.filterClosed'),
      CANCELLED: t('tickets.filterCancelled'),
    };
    return map[status] || status;
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const result = await ticketService.getAll(params);
      setTickets(result.data);
      setTotal(result.pagination.total);
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const totalPages = Math.ceil(total / limit);

  const handleBulkCancelClick = useCallback(() => {
    const cancelableTickets = selectedTickets.filter(t => ['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(t.status));
    if (cancelableTickets.length === 0) {
      setAlertWarningMessage(t('tickets.noCancelableTickets') || 'None of the selected tickets can be cancelled.');
      return;
    }
    setShowBulkCancelAlert(true);
  }, [selectedTickets, t]);

  const confirmBulkCancel = useCallback(async () => {
    const cancelableTickets = selectedTickets.filter(t => ['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(t.status));
    setShowBulkCancelAlert(false);
    setLoading(true);
    try {
      await Promise.all(
        cancelableTickets.map(t =>
          ticketService.updateStatus(t.id, 'CANCELLED', 'Cancelled by client via bulk action.')
        )
      );
      setSelectedTickets([]);
      loadTickets();
    } catch (err) {
      console.error('Failed bulk cancel', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTickets, loadTickets]);

  const confirmCancelIndividual = useCallback(async () => {
    if (!ticketToCancel) return;
    const ticketId = ticketToCancel.id;
    setTicketToCancel(null);
    setLoading(true);
    try {
      await ticketService.updateStatus(ticketId, 'CANCELLED', 'Cancelled by client.');
      loadTickets();
    } catch (err) {
      console.error('Failed to cancel ticket', err);
    } finally {
      setLoading(false);
    }
  }, [ticketToCancel, loadTickets]);

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'title',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableTitle')}</span>,
      cell: ({ row }) => <TicketTitleWithHoverCard ticket={row.original} />,
    },
    {
      accessorKey: 'category',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableCategory')}</span>,
      cell: ({ row }) => <span className="text-body-md text-on-surface-variant">{getCategoryLabel(row.original.category)}</span>,
    },
    {
      accessorKey: 'priority',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tablePriority')}</span>,
      cell: ({ row }) => (
        <span className={`text-label-sm ${priorityColor[row.original.priority]}`}>
          {getPriorityLabel(row.original.priority)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableStatus')}</span>,
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[row.original.status]}`}>
          {getStatusLabel(row.original.status)}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableCreated')}</span>,
      cell: ({ row }) => (
        <span className="text-body-md text-on-surface-variant">
          {new Date(row.original.created_at).toLocaleDateString(
            i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
            { day: '2-digit', month: 'short', year: 'numeric' }
          )}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold block text-right">{t('techDashboard.tableStatus') === 'Estado' ? 'Acciones' : 'Actions'}</span>,
      cell: ({ row }) => {
        const ticket = row.original;
        const canCancel = ['OPEN', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(ticket.status);

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
                <button className="p-2 hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors">
                  <MoreHorizontal className="h-4 w-4 text-on-surface-variant" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-surface-container-lowest border border-outline-variant">
                <DropdownMenuLabel>{t('tickets.actionsLabel') || 'Actions'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  {t('dashboard.viewDetails') || 'View Details'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyId}>
                  {t('tickets.copyId') || 'Copy Ticket ID'}
                </DropdownMenuItem>
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleCancelClick}
                    >
                      {t('tickets.cancelTicket') || 'Cancel Ticket'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [t, i18n.language, navigate, priorityColor, statusColor, getCategoryLabel, getPriorityLabel, getStatusLabel]);

  const handleTicketCreated = useCallback(() => {
    setShowNewTicket(false);
    setPage(1);
    loadTickets();
  }, [loadTickets]);



  return (
    <Page
      title={t('tickets.title')}
      subtitle={t('tickets.subtitle')}
      actions={
        <button
          onClick={() => setShowNewTicket(true)}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity text-label-md cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          {t('tickets.newTicket')}
        </button>
      }
    >

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-50" />
          <input
            type="text"
            placeholder={t('tickets.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all text-on-surface"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary cursor-pointer text-on-surface"
        >
          <option value="">{t('tickets.filterAllStatuses')}</option>
          <option value="OPEN">{t('tickets.filterOpen')}</option>
          <option value="IN_PROGRESS">{t('tickets.filterInProgress')}</option>
          <option value="AWAITING_PAYMENT">{t('tickets.filterAwaitingPayment')}</option>
          <option value="RESOLVED">{t('tickets.filterResolved')}</option>
          <option value="CLOSED">{t('tickets.filterClosed')}</option>
          <option value="CANCELLED">{t('tickets.filterCancelled')}</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTickets.length > 0 && (
        <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-in">
          <span className="text-label-md font-semibold text-primary">
            {selectedTickets.length} {t('tickets.selectedCount') || 'selected'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkCancelClick}
              className="bg-error text-on-error px-4 py-2 rounded-lg text-label-md hover:bg-error/90 transition-colors cursor-pointer font-bold"
            >
              {t('tickets.bulkCancel') || 'Bulk Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        noDataMessage={t('tickets.noTicketsFound')}
        onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
        enableRowSelection={true}
        onSelectedRowsChange={setSelectedTickets}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center px-4 py-3 mt-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
          <span className="text-label-sm text-on-surface-variant">
            {t('tickets.showing')} {(page - 1) * limit + 1}–{Math.min(page * limit, total)} {t('tickets.of')} {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-on-surface" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4 text-on-surface" />
            </button>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicket && (
        <NewTicketModal
          onClose={() => setShowNewTicket(false)}
          onCreated={handleTicketCreated}
        />
      )}

      {/* Individual Cancel Alert Dialog */}
      <AlertDialog open={!!ticketToCancel} onOpenChange={(open) => !open && setTicketToCancel(null)}>
        <AlertDialogContent className="bg-surface-container-lowest border border-outline-variant">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">{t('tickets.cancelTicket')}</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              {t('tickets.confirmCancel')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">{t('tickets.modalCancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              onClick={confirmCancelIndividual}
            >
              {t('tickets.cancelTicket')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Cancel Alert Dialog */}
      <AlertDialog open={showBulkCancelAlert} onOpenChange={setShowBulkCancelAlert}>
        <AlertDialogContent className="bg-surface-container-lowest border border-outline-variant">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">{t('tickets.bulkCancel')}</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              {t('tickets.confirmBulkCancel')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">{t('tickets.modalCancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="cursor-pointer"
              onClick={confirmBulkCancel}
            >
              {t('tickets.bulkCancel')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Info Alert Dialog */}
      <AlertDialog open={!!alertWarningMessage} onOpenChange={(open) => !open && setAlertWarningMessage(null)}>
        <AlertDialogContent className="bg-surface-container-lowest border border-outline-variant">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">{t('dashboard.technicalSupport') || 'Warning'}</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              {alertWarningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="cursor-pointer" onClick={() => setAlertWarningMessage(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
