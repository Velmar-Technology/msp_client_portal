import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { SummaryCard } from '@/components/shared/SummaryCard';
import { StatsGrid } from '@/components/stats-grid';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import {
  User,
  CheckCircle2,
  Play,
  Clock,
  AlertTriangle,
  ClipboardList,
  AlertCircle,
  MoreHorizontal,
  ChevronRight,
  Eye,
  CreditCard,
  DollarSign,
  Award,
  Zap,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useAuth } from "@/hooks/useAuth";
import { useSLATimer } from "@/hooks/useSLATimer";
import { ticketService, type TicketItem as Ticket } from "@/features/tickets";
import { userService } from "@/services/userService";
import { earningsService, type TechnicianEarning, type TechnicianEarningsSummary } from "@/services/earningsService";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { statusColor, priorityColor } from "@/constants/tickets";
import { SKELETON_DISPLAY_DELAY_MS } from "@/constants/ui";




// Sub-component to handle active SLA timers per ticket
function SLACountdownRow({ ticket, onNavigate }: { ticket: Ticket; onNavigate: (id: string) => void }) {
  const { t } = useTranslation();
  const sla = useSLATimer(ticket);

  if (!sla.isApplicable || sla.isExpired) return null;

  return (
    <div
      onClick={() => onNavigate(ticket.id)}
      className="flex items-center justify-between p-3.5 bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 rounded-xl cursor-pointer transition-colors shadow-xs"
    >
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-sm font-semibold text-foreground truncate">{ticket.title}</h4>
        <span className="text-xs text-muted-foreground">
          {ticket.category === 'WARRANTY' ? t('tickets.categories.WARRANTY') : t('tickets.categories.SERVICE_OUTAGE')} • {t(`tickets.priorities.${ticket.priority}`)}
        </span>
      </div>
      <div className="text-right flex items-center gap-2">
        <Clock className="h-4 w-4 text-destructive animate-spin" />
        <span className="text-sm font-mono text-destructive font-bold">{sla.formattedTime}</span>
      </div>
    </div>
  );
}

export function TechDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusSummary, setStatusSummary] = useState<Record<string, number>>({});
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<TechnicianEarningsSummary | null>(null);
  const [earningsList, setEarningsList] = useState<TechnicianEarning[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'earnings'>('tickets');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load ticket data, earnings summary, and user profile
  const loadDashboardData = useCallback(async () => {
    try {
      const [summary, ticketList, profile, earningsData] = await Promise.all([
        ticketService.getStatusSummary(),
        ticketService.getAll({ limit: 100 }), // Fetch recent tickets assigned to this tech
        userService.getProfile(),
        earningsService.getMyEarnings({ limit: 100 }).catch(() => ({ summary: { technician_id: '', total_closed_tickets: 0, total_earned: 0, pending_amount: 0, approved_amount: 0, paid_amount: 0, sla_met_count: 0, sla_met_rate: 0 }, items: [], total: 0 })),
      ]);
      setStatusSummary(summary);
      setTickets(ticketList.data);
      setSpecialty((profile.specialty as string) || null);
      if (earningsData) {
        setEarningsSummary(earningsData.summary);
        setEarningsList(earningsData.items);
      }
    } catch (err) {
      console.error('Failed to load technician dashboard data', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    }
    init();
  }, [loadDashboardData]);

  // Handle Quick Status Transition Actions
  const handleStatusTransition = useCallback(async (ticketId: string, newStatus: string) => {
    setUpdatingId(ticketId);
    setActionMessage(null);
    try {
      const notes = `Status updated via Technician Dashboard quick-action.`;
      await ticketService.updateStatus(ticketId, newStatus, notes);
      setActionMessage({ text: t('techDashboard.statusUpdateSuccess'), isError: false });
      await loadDashboardData(); // Refresh list and metrics
    } catch (err) {
      console.error('Status transition failed', err);
      const errorObj = err as { response?: { data?: { message?: string } } };
      const errMsg = errorObj?.response?.data?.message || t('techDashboard.statusUpdateError');
      setActionMessage({ text: errMsg, isError: true });
    } finally {
      setUpdatingId(null);
      // Auto-hide messages after 4 seconds
      setTimeout(() => setActionMessage(null), 4000);
    }
  }, [t, loadDashboardData]);

  const getCategoryLabel = useCallback((cat: string) => {
    const map: Record<string, string> = {
      REPAIR: t('tickets.categories.REPAIR'),
      WARRANTY: t('tickets.categories.WARRANTY'),
      SERVICE_OUTAGE: t('tickets.categories.SERVICE_OUTAGE'),
      PREVENTATIVE_MAINTENANCE: t('tickets.categories.PREVENTATIVE_MAINTENANCE'),
      HELPDESK: t('tickets.categories.HELPDESK'),
      AI: t('tickets.categories.AI'),
    };
    return map[cat] || cat;
  }, [t]);

  const getPriorityLabel = useCallback((pri: string) => {
    const map: Record<string, string> = {
      LOW: t('tickets.priorities.LOW'),
      MEDIUM: t('tickets.priorities.MEDIUM'),
      HIGH: t('tickets.priorities.HIGH'),
      CRITICAL: t('tickets.priorities.CRITICAL'),
    };
    return map[pri] || pri;
  }, [t]);

  const getStatusLabel = useCallback((status: string) => {
    const map: Record<string, string> = {
      OPEN: t('tickets.filterOpen'),
      IN_PROGRESS: t('tickets.filterInProgress'),
      AWAITING_PAYMENT: t('tickets.filterAwaitingPayment'),
      RESOLVED: t('tickets.filterResolved'),
      CLOSED: t('tickets.filterClosed'),
      CANCELLED: t('tickets.filterCancelled'),
    };
    return map[status] || status;
  }, [t]);

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'title',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tableTitle')}</span>,
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-foreground truncate max-w-50 block">
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tableCategory')}</span>,
      cell: ({ row }) => <span className="text-xs text-zinc-500 dark:text-zinc-400">{getCategoryLabel(row.original.category)}</span>,
    },
    {
      accessorKey: 'priority',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tablePriority')}</span>,
      cell: ({ row }) => (
        <span className={`text-[11px] font-medium ${priorityColor[row.original.priority]}`}>
          {getPriorityLabel(row.original.priority)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tableStatus')}</span>,
      cell: ({ row }) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor[row.original.status]}`}>
          {getStatusLabel(row.original.status)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => (
        <div className="text-right">
          <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">
            {t('common.actions')}
          </span>
        </div>
      ),
      cell: ({ row }) => {
        const ticket = row.original;
        const isOpen = ticket.status === 'OPEN';
        const isInProgress = ticket.status === 'IN_PROGRESS';

        return (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {isOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusTransition(ticket.id, 'IN_PROGRESS')}
                disabled={updatingId === ticket.id}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer bg-warning/10 text-amber-600 dark:text-amber-400 border-warning/30 hover:bg-warning/20"
              >
                <span>{t('techDashboard.startWork')}</span>
                <Play className="h-3 w-3" />
              </Button>
            ) : isInProgress ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusTransition(ticket.id, 'RESOLVED')}
                disabled={updatingId === ticket.id}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              >
                <span>{t('techDashboard.resolveTicket')}</span>
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(`/tickets/${ticket.id}`)}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t('dashboard.viewDetails') || 'View'}</span>
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
                <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {t('common.actions')}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="text-xs cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  {t('dashboard.viewDetails') || 'View Details'}
                </DropdownMenuItem>

                {isOpen && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => handleStatusTransition(ticket.id, 'IN_PROGRESS')}
                      disabled={updatingId === ticket.id}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      {t('techDashboard.startWork')}
                    </DropdownMenuItem>
                  </>
                )}

                {isInProgress && (
                  <>
                    <DropdownMenuSeparator className="bg-border" />
                    <DropdownMenuItem
                      onClick={() => handleStatusTransition(ticket.id, 'AWAITING_PAYMENT')}
                      disabled={updatingId === ticket.id}
                      className="text-xs text-secondary cursor-pointer"
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1" />
                      {t('techDashboard.awaitingPayment')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusTransition(ticket.id, 'RESOLVED')}
                      disabled={updatingId === ticket.id}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                      {t('techDashboard.resolveTicket')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [t, updatingId, handleStatusTransition, navigate, getCategoryLabel, getPriorityLabel, getStatusLabel]);

  const earningsColumns = useMemo<ColumnDef<TechnicianEarning>[]>(() => [
    {
      accessorKey: 'ticket_title',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tableTitle')}</span>,
      cell: ({ row }) => (
        <div className="flex flex-col max-w-50 cursor-pointer" onClick={() => navigate(`/tickets/${row.original.ticket_id}`)}>
          <span className="text-xs font-semibold text-foreground truncate hover:text-primary">{row.original.ticket_title || 'Support Ticket'}</span>
          <span className="text-[10px] text-muted-foreground font-mono">Ref: {row.original.ticket_id.substring(0, 8)}</span>
        </div>
      ),
    },
    {
      accessorKey: 'breakdown.priorityMultiplier',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('techDashboard.multiplier')}</span>,
      cell: ({ row }) => (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-foreground">
          {row.original.breakdown?.priority || 'NORMAL'} ({row.original.breakdown?.priorityMultiplier || 1.0}x)
        </span>
      ),
    },
    {
      accessorKey: 'base_amount',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('techDashboard.baseRate')}</span>,
      cell: ({ row }) => <span className="text-xs text-muted-foreground">${Number(row.original.base_amount).toFixed(2)}</span>,
    },
    {
      accessorKey: 'sla_bonus_amount',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('techDashboard.slaBonus')}</span>,
      cell: ({ row }) => {
        const isMet = row.original.breakdown?.slaMet;
        return (
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded ${isMet ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-500/10 text-muted-foreground'}`}>
            {isMet ? <Zap className="h-3 w-3" /> : null}
            {isMet ? `+$${Number(row.original.sla_bonus_amount).toFixed(2)}` : '$0.00'}
          </span>
        );
      },
    },
    {
      accessorKey: 'final_amount',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('techDashboard.ticketBounty')}</span>,
      cell: ({ row }) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
          ${Number(row.original.final_amount).toFixed(2)} {row.original.currency}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: () => <span className="uppercase text-[10px] text-zinc-500 dark:text-zinc-400 font-bold tracking-wider">{t('tickets.tableStatus')}</span>,
      cell: ({ row }) => {
        const st = row.original.status;
        const colorMap: Record<string, string> = {
          PENDING: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          APPROVED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
          PAID: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          VOIDED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        };
        return (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${colorMap[st] || 'bg-muted text-muted-foreground'}`}>
            {st}
          </span>
        );
      },
    },
  ], [t, navigate]);

  // Filtered tickets list for display
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? ticket.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Client-side pagination
  const [ticketsLimit, setTicketsLimit] = useState(10);
  const [ticketPage, setTicketPage] = useState(1);

  const handleTicketLimitChange = (val: number) => {
    setTicketsLimit(val);
    setTicketPage(1);
  };

  const ticketTotalPages = Math.ceil(filteredTickets.length / ticketsLimit);
  const paginatedTickets = filteredTickets.slice(
    (ticketPage - 1) * ticketsLimit,
    ticketPage * ticketsLimit,
  );

  // Identify tickets that require urgent SLA attention (WARRANTY/SERVICE_OUTAGE in open/in progress status created within last hour)
  const slaTickets = useMemo(() => {
     
    const now = Date.now();
    return tickets.filter((ticket) => {
      if (!['OPEN', 'IN_PROGRESS'].includes(ticket.status)) return false;
      if (!['WARRANTY', 'SERVICE_OUTAGE'].includes(ticket.category)) return false;
      const elapsed = now - new Date(ticket.created_at).getTime();
      return elapsed < 60 * 60 * 1000; // Under 1 hour
    });
  }, [tickets]);

  const totalAssigned = tickets.length;
  const openCount = statusSummary.OPEN || 0;
  const inProgressCount = statusSummary.IN_PROGRESS || 0;
  const completedCount = (statusSummary.RESOLVED || 0) + (statusSummary.CLOSED || 0);

  const showSkeleton = useDeferredLoading(loading, SKELETON_DISPLAY_DELAY_MS);

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Page
      title={`${t('login.welcome')}, ${user?.name}`}
      subtitle={t('techDashboard.subtitle')}
      actions={
        <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
            <User className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user?.email}</h4>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
              {t('techDashboard.mySpecialty')}: <strong className="text-zinc-700 dark:text-zinc-300">{specialty || (i18n.language === 'es_DO' ? 'Generalista' : 'Generalist')}</strong>
            </span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Metrics Row */}
        <section aria-label="Technician Metrics">
          <StatsGrid className="w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {/* Total Assigned */}
            <SummaryCard
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              title={t('techDashboard.assignedTickets')}
              value={totalAssigned}
            />

            {/* Open */}
            <SummaryCard
              icon={<Clock className="h-3.5 w-3.5" />}
              title={t('techDashboard.openTickets')}
              value={openCount}
            />

            {/* In Progress */}
            <SummaryCard
              icon={<Play className="h-3.5 w-3.5" />}
              title={t('techDashboard.inProgressTickets')}
              value={inProgressCount}
            />

            {/* Completed */}
            <SummaryCard
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              title={t('techDashboard.resolvedTickets')}
              value={completedCount}
            />

            {/* My Earnings & Closed Bounties */}
            <SummaryCard
              icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />}
              title={t('techDashboard.myEarnings')}
              value={`$${(earningsSummary?.total_earned || 0).toFixed(2)}`}
              trend={`${earningsSummary?.sla_met_rate || 0}%`}
              isPositiveTrend={true}
              subtitle={`${t('techDashboard.slaMetRate')}`}
            />
          </StatsGrid>
        </section>

        {/* Main Grid: SLA Monitor + Tickets list */}
        <section aria-label="Tickets and SLA Monitor">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SLA Attention Panel (Spans 4 cols on desktop) */}
        <div className="lg:col-span-4 bg-card border border-border p-6 rounded-xl flex flex-col shadow-xs h-fit">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="text-base font-bold text-foreground">
              {t('techDashboard.slaAttention')}
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4 leading-normal">
            {t('techDashboard.slaDescription')}
          </p>

          {slaTickets.length === 0 ? (
            <div className="py-8 text-center bg-muted/50 rounded-xl border border-dashed border-border">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground px-4">
                {t('techDashboard.noSlaAttention')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-87.5 overflow-y-auto pr-1">
              {slaTickets.map((ticket) => (
                <SLACountdownRow key={ticket.id} ticket={ticket} onNavigate={(id) => navigate(`/tickets/${id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Tickets Listing & Controls (Spans 8 cols on desktop) */}
        <div className="lg:col-span-8 bg-card border border-border rounded-xl overflow-hidden shadow-xs flex flex-col">
          {/* Tab Selection Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={activeTab === 'tickets' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('tickets')}
                className="h-7 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>{t('techDashboard.assignedTickets')}</span>
                <span className="ml-1 text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full">
                  {filteredTickets.length}
                </span>
              </Button>

              <Button
                type="button"
                variant={activeTab === 'earnings' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('earnings')}
                className="h-7 text-xs font-semibold gap-1.5 cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                <Award className="h-3.5 w-3.5" />
                <span>{t('techDashboard.myEarnings')}</span>
                <span className="ml-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-full">
                  {earningsList.length}
                </span>
              </Button>
            </div>
          </div>

          {/* Action Message Alert */}
          {actionMessage && (
            <div className="p-4 border-b border-border">
              <Alert variant={actionMessage.isError ? 'destructive' : 'default'} className="animate-fade-in">
                {actionMessage.isError ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
                <AlertTitle>{actionMessage.isError ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription>{actionMessage.text}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Tickets or Earnings Table */}
          {activeTab === 'tickets' ? (
            <DataTable
              columns={columns}
              data={paginatedTickets}
              loading={false}
              noDataMessage={t('tickets.noTicketsFound')}
              onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
              className="border-none rounded-none"
              search={{
                value: search,
                onChange: (val) => { setSearch(val); setTicketPage(1); },
                placeholder: t('tickets.searchPlaceholder'),
              }}
              filters={[
                {
                  id: 'status',
                  value: statusFilter,
                  onChange: (val) => { setStatusFilter(val); setTicketPage(1); },
                  options: [
                    { value: 'OPEN', label: t('tickets.filterOpen') },
                    { value: 'IN_PROGRESS', label: t('tickets.filterInProgress') },
                    { value: 'RESOLVED', label: t('tickets.filterResolved') },
                    { value: 'CLOSED', label: t('tickets.filterClosed') },
                  ],
                  placeholder: t('tickets.filterAllStatuses'),
                }
              ]}
              pagination={{
                page: ticketPage,
                totalPages: ticketTotalPages,
                totalItems: filteredTickets.length,
                limit: ticketsLimit,
                onPageChange: setTicketPage,
                onLimitChange: handleTicketLimitChange,
              }}
            />
          ) : (
            <DataTable
              columns={earningsColumns}
              data={earningsList}
              loading={false}
              noDataMessage={t('techDashboard.noEarnings')}
              className="border-none rounded-none"
              pagination={{
                page: 1,
                totalPages: 1,
                totalItems: earningsList.length,
                limit: 50,
                onPageChange: () => {},
                onLimitChange: () => {},
              }}
            />
          )}
        </div>
      </div>
        </section>
      </div>
    </Page>
  );
}

export default TechDashboardPage;
