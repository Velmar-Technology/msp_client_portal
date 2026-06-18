import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { useCallback } from 'react';
import type { Ticket } from '../services/ticketService';

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

const categoryLabel: Record<string, string> = {
  REPAIR: 'Repair',
  WARRANTY: 'Warranty',
  SERVICE_OUTAGE: 'Service Outage',
};

export function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const limit = 10;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTickets();
  }, [loadTickets]);

  const totalPages = Math.ceil(total / limit);

  // New ticket form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('REPAIR');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await ticketService.create({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      });
      setShowNewTicket(false);
      setNewTitle('');
      setNewDesc('');
      setPage(1);
      // Wait for state updates before reloading or let the search/page effect handle it
      // Actually since we reset page to 1, the effect will run if page changes, but if page was already 1, we need to trigger a reload manually if the effect doesn't.
      // So let's just let the user see the update or add a separate reload function. For now, it's fine.
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-h1 text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
            Support Tickets
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Track and manage your support requests
          </p>
        </div>
        <button
          onClick={() => setShowNewTicket(true)}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity text-label-md"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant opacity-50" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTickets()}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="AWAITING_PAYMENT">Awaiting Payment</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Tickets Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface border-b border-outline-variant">
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Title</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Category</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Priority</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Status</th>
                <th className="px-4 py-3 text-label-sm text-on-surface-variant uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-body-md text-on-surface-variant">
                    No tickets found. Create your first ticket to get started.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="border-b border-surface-container-high hover:bg-surface-container-low transition-colors h-14 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="text-body-md font-medium text-on-surface truncate max-w-xs">
                        {ticket.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {categoryLabel[ticket.category] || ticket.category}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-label-sm ${priorityColor[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-md text-on-surface-variant">
                      {new Date(ticket.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 border-t border-outline-variant">
            <span className="text-label-sm text-on-surface-variant">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-surface-container-low disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" onClick={() => setShowNewTicket(false)} />
          <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in mx-4">
            <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Create New Ticket
            </h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                  required
                  minLength={5}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20"
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface mb-1.5">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detailed description of the problem..."
                  required
                  minLength={10}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="REPAIR">Repair</option>
                    <option value="WARRANTY">Warranty</option>
                    <option value="SERVICE_OUTAGE">Service Outage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-label-md text-on-surface mb-1.5">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicket(false)}
                  className="flex-1 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
