import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight, X, MoreHorizontal } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { Ticket } from '../services/ticketService';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
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

  const columns = useMemo<ColumnDef<Ticket>[]>(() => [
    {
      accessorKey: 'title',
      header: () => <span className="uppercase text-label-sm text-on-surface-variant font-bold">{t('tickets.tableTitle')}</span>,
      cell: ({ row }) => (
        <span className="text-body-md font-medium text-on-surface truncate max-w-xs block">
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

        const handleCancel = async (e: React.MouseEvent) => {
          e.stopPropagation();
          if (confirm(t('tickets.confirmCancel') || 'Are you sure you want to cancel this ticket?')) {
            try {
              await ticketService.updateStatus(ticket.id, 'CANCELLED', 'Cancelled by client.');
              loadTickets();
            } catch (err) {
              console.error('Failed to cancel ticket', err);
            }
          }
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
                      onClick={handleCancel}
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
  ], [t, i18n.language, navigate, loadTickets, priorityColor, statusColor, getCategoryLabel, getPriorityLabel, getStatusLabel]);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('REPAIR');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ticket = await ticketService.create({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      });

      // Upload selected attachments if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await ticketService.uploadAttachment(ticket.id, file);
          } catch (uploadErr) {
            console.error(`Failed to upload file ${file.name}`, uploadErr);
          }
        }
      }

      setShowNewTicket(false);
      setNewTitle('');
      setNewDesc('');
      setSelectedFiles([]);
      setPage(1);
      loadTickets();
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* Tickets Table */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        noDataMessage={t('tickets.noTicketsFound')}
        onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" onClick={() => setShowNewTicket(false)} />
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in mx-4">
            <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('tickets.createModalTitle')}
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalTitleLabel')}</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('tickets.modalTitlePlaceholder')}
                  required
                  minLength={5}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalDescLabel')}</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t('tickets.modalDescPlaceholder')}
                  required
                  minLength={10}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 resize-none bg-surface-container-lowest text-on-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalCategoryLabel')}</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary cursor-pointer bg-surface-container-lowest text-on-surface"
                  >
                    <option value="REPAIR">{t('tickets.categories.REPAIR')}</option>
                    <option value="WARRANTY">{t('tickets.categories.WARRANTY')}</option>
                    <option value="SERVICE_OUTAGE">{t('tickets.categories.SERVICE_OUTAGE')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalPriorityLabel')}</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary cursor-pointer bg-surface-container-lowest text-on-surface"
                  >
                    <option value="LOW">{t('tickets.priorities.LOW')}</option>
                    <option value="MEDIUM">{t('tickets.priorities.MEDIUM')}</option>
                    <option value="HIGH">{t('tickets.priorities.HIGH')}</option>
                    <option value="CRITICAL">{t('tickets.priorities.CRITICAL')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.attachmentsLabel')}</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('modal-file-input')?.click()}
                      className="px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer bg-surface-container-low"
                    >
                      {t('tickets.selectFiles')}
                    </button>
                    <input
                      id="modal-file-input"
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {selectedFiles.length > 0 && (
                      <span className="text-label-sm text-on-surface-variant font-medium">
                        {selectedFiles.length} {t('tickets.filesSelected')}
                      </span>
                    )}
                  </div>
                  {/* Selected files list */}
                  {selectedFiles.length > 0 && (
                    <div className="max-h-24 overflow-y-auto border border-outline-variant/50 rounded-lg p-2 space-y-1.5 bg-surface-container/50">
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center text-label-sm bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/30">
                          <span className="truncate max-w-[220px]" title={file.name}>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-error hover:text-error/80 cursor-pointer p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer bg-surface-container-lowest"
                >
                  {t('tickets.modalCancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? t('tickets.modalCreating') : t('tickets.modalCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
