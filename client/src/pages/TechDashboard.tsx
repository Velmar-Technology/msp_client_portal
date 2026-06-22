import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
  Search,
  User,
  CheckCircle2,
  Play,
  Clock,
  AlertTriangle,
  ClipboardList,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSLATimer } from '../hooks/useSLATimer';
import { ticketService } from '../services/ticketService';
import { userService } from '../services/userService';
import type { Ticket } from '../services/ticketService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

// Sub-component to handle active SLA timers per ticket
function SLACountdownRow({ ticket, onNavigate }: { ticket: Ticket; onNavigate: (id: string) => void }) {
  const { t } = useTranslation();
  const sla = useSLATimer(ticket.created_at, ticket.category);

  if (!sla.isApplicable || sla.isExpired) return null;

  return (
    <div
      onClick={() => onNavigate(ticket.id)}
      className="flex items-center justify-between p-3.5 bg-error/10 hover:bg-error/15 border border-error/20 rounded-xl cursor-pointer transition-colors shadow-sm animate-pulse"
    >
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-label-md font-semibold text-on-surface truncate">{ticket.title}</h4>
        <span className="text-[11px] text-on-surface-variant opacity-85">
          {ticket.category === 'WARRANTY' ? t('tickets.categories.WARRANTY') : t('tickets.categories.SERVICE_OUTAGE')} • {t(`tickets.priorities.${ticket.priority}`)}
        </span>
      </div>
      <div className="text-right flex items-center gap-2">
        <Clock className="h-4 w-4 text-error animate-spin" style={{ animationDuration: '4s' }} />
        <span className="text-h3 font-mono text-error font-bold">{sla.formattedTime}</span>
      </div>
    </div>
  );
}

export function TechDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusSummary, setStatusSummary] = useState<Record<string, number>>({});
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load ticket data and summary
  const loadDashboardData = useCallback(async () => {
    try {
      const [summary, ticketList, profile] = await Promise.all([
        ticketService.getStatusSummary(),
        ticketService.getAll({ limit: 100 }), // Fetch recent tickets assigned to this tech
        userService.getProfile(),
      ]);
      setStatusSummary(summary);
      setTickets(ticketList.data);
      setSpecialty((profile.specialty as string) || null);
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
    } catch (err: any) {
      console.error('Status transition failed', err);
      const errMsg = err?.response?.data?.message || t('techDashboard.statusUpdateError');
      setActionMessage({ text: errMsg, isError: true });
    } finally {
      setUpdatingId(null);
      // Auto-hide messages after 4 seconds
      setTimeout(() => setActionMessage(null), 4000);
    }
  }, [t, loadDashboardData]);

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

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'title',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableTitle')}</span>,
      cell: ({ row }) => (
        <span className="text-body-md font-semibold text-on-surface truncate max-w-[200px] block">
          {row.original.title}
        </span>
      ),
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
      id: 'actions',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold block text-right">{t('techDashboard.tableStatus') === 'Estado' ? 'Acciones' : 'Actions'}</span>,
      cell: ({ row }) => {
        const ticket = row.original;
        return (
          <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            {ticket.status === 'OPEN' && (
              <button
                onClick={() => handleStatusTransition(ticket.id, 'IN_PROGRESS')}
                disabled={updatingId === ticket.id}
                className="px-2.5 py-1 bg-warning text-[#0F172A] hover:bg-warning/90 transition-colors text-[11px] font-bold rounded cursor-pointer disabled:opacity-50"
              >
                {t('techDashboard.startWork')}
              </button>
            )}
            {ticket.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => handleStatusTransition(ticket.id, 'AWAITING_PAYMENT')}
                  disabled={updatingId === ticket.id}
                  className="px-2.5 py-1 bg-surface-container-high border border-outline hover:bg-surface-container-highest text-on-surface-variant transition-colors text-[11px] font-semibold rounded cursor-pointer disabled:opacity-50"
                >
                  {t('techDashboard.awaitingPayment')}
                </button>
                <button
                  onClick={() => handleStatusTransition(ticket.id, 'RESOLVED')}
                  disabled={updatingId === ticket.id}
                  className="px-2.5 py-1 bg-success text-on-success hover:bg-success/90 transition-colors text-[11px] font-bold rounded cursor-pointer disabled:opacity-50"
                >
                  {t('techDashboard.resolveTicket')}
                </button>
              </>
            )}
            <button
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              title={t('dashboard.viewDetails')}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ], [t, updatingId, handleStatusTransition, navigate, priorityColor, statusColor, getCategoryLabel, getPriorityLabel, getStatusLabel]);

  // Filtered tickets list for display
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(search.toLowerCase()) ||
      ticket.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? ticket.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Identify tickets that require urgent SLA attention (WARRANTY/SERVICE_OUTAGE in open/in progress status created within last hour)
  const slaTickets = tickets.filter((ticket) => {
    if (!['OPEN', 'IN_PROGRESS'].includes(ticket.status)) return false;
    if (!['WARRANTY', 'SERVICE_OUTAGE'].includes(ticket.category)) return false;
    const elapsed = Date.now() - new Date(ticket.created_at).getTime();
    return elapsed < 60 * 60 * 1000; // Under 1 hour
  });

  const totalAssigned = tickets.length;
  const openCount = statusSummary.OPEN || 0;
  const inProgressCount = statusSummary.IN_PROGRESS || 0;
  const completedCount = (statusSummary.RESOLVED || 0) + (statusSummary.CLOSED || 0);

  if (loading) {
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
        <div className="flex items-center gap-3 bg-surface-container-high p-4 rounded-xl border border-outline-variant/60 shadow-sm animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="text-label-md font-bold text-on-surface leading-tight">{user?.email}</h4>
            <span className="text-[11px] text-on-surface-variant opacity-80 mt-0.5 block">
              {t('techDashboard.mySpecialty')}: <strong>{specialty || (t('profile.languages.es_DO') === 'Español' ? 'Generalista' : 'Generalist')}</strong>
            </span>
          </div>
        </div>
      }
    >

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {/* Total Assigned */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-label-md text-on-surface-variant">{t('techDashboard.assignedTickets')}</h3>
          <p className="text-h2 mt-1 font-bold text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>
            {totalAssigned}
          </p>
        </div>

        {/* Open */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <Clock className="h-6 w-6 text-info" />
          </div>
          <h3 className="text-label-md text-on-surface-variant">{t('techDashboard.openTickets')}</h3>
          <p className="text-h2 mt-1 font-bold text-info" style={{ fontFamily: 'var(--font-heading)' }}>
            {openCount}
          </p>
        </div>

        {/* In Progress */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <Play className="h-6 w-6 text-warning" />
          </div>
          <h3 className="text-label-md text-on-surface-variant">{t('techDashboard.inProgressTickets')}</h3>
          <p className="text-h2 mt-1 font-bold text-warning" style={{ fontFamily: 'var(--font-heading)' }}>
            {inProgressCount}
          </p>
        </div>

        {/* Completed */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
          </div>
          <h3 className="text-label-md text-on-surface-variant">{t('techDashboard.resolvedTickets')}</h3>
          <p className="text-h2 mt-1 font-bold text-success" style={{ fontFamily: 'var(--font-heading)' }}>
            {completedCount}
          </p>
        </div>
      </div>

      {/* Main Grid: SLA Monitor + Tickets list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SLA Attention Panel (Spans 4 cols on desktop) */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-outline-variant/30">
            <AlertTriangle className="h-5 w-5 text-error" />
            <h3 className="text-h3 font-bold text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('techDashboard.slaAttention')}
            </h3>
          </div>
          <p className="text-[12px] text-on-surface-variant mb-4 leading-normal">
            {t('techDashboard.slaDescription')}
          </p>

          {slaTickets.length === 0 ? (
            <div className="py-8 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant/60">
              <CheckCircle2 className="h-8 w-8 text-success/60 mx-auto mb-2" />
              <p className="text-body-md text-on-surface-variant px-4">
                {t('techDashboard.noSlaAttention')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {slaTickets.map((ticket) => (
                <SLACountdownRow key={ticket.id} ticket={ticket} onNavigate={(id) => navigate(`/tickets/${id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Tickets Listing & Controls (Spans 8 cols on desktop) */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
          {/* Action Message Alert */}
          {actionMessage && (
            <div className="p-4 border-b border-outline-variant">
              <Alert variant={actionMessage.isError ? 'destructive' : 'success'} className="animate-fade-in">
                {actionMessage.isError ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
                <AlertTitle>{actionMessage.isError ? 'Error' : 'Success'}</AlertTitle>
                <AlertDescription>{actionMessage.text}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Table Header / Filters */}
          <div className="p-4 border-b border-outline-variant bg-surface-container-low/40 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-60" />
              <Input
                id="tech-tickets-search"
                type="text"
                placeholder={t('tickets.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary text-on-surface"
              />
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold cursor-pointer transition-colors ${!statusFilter ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
              >
                {t('tickets.filterAllStatuses') === 'Todos los Estados' ? 'Todos' : 'All'}
              </button>
              <button
                onClick={() => setStatusFilter('OPEN')}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold cursor-pointer transition-colors ${statusFilter === 'OPEN' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
              >
                {t('tickets.filterOpen')}
              </button>
              <button
                onClick={() => setStatusFilter('IN_PROGRESS')}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold cursor-pointer transition-colors ${statusFilter === 'IN_PROGRESS' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
              >
                {t('tickets.filterInProgress')}
              </button>
              <button
                onClick={() => setStatusFilter('RESOLVED')}
                className={`px-3 py-1 rounded-md text-label-sm font-semibold cursor-pointer transition-colors ${statusFilter === 'RESOLVED' ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'}`}
              >
                {t('tickets.filterResolved')}
              </button>
            </div>
          </div>

          {/* Tickets Table */}
          <DataTable
            columns={columns}
            data={filteredTickets}
            loading={false}
            noDataMessage={t('tickets.noTicketsFound')}
            onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
            className="border-none rounded-none"
          />
        </div>
      </div>
    </Page>
  );
}
