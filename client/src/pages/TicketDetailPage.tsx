import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { Ticket, TicketEvent } from '../services/ticketService';
import { useSLATimer } from '../hooks/useSLATimer';

const statusColor: Record<string, string> = {
  OPEN: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  AWAITING_PAYMENT: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  CLOSED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error/10 text-error',
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<(TicketEvent & { changed_by_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [t, events] = await Promise.all([
          ticketService.getById(id!),
          ticketService.getTimeline(id!),
        ]);
        setTicket(t);
        setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
      } catch (err) {
        console.error('Failed to load ticket', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const sla = useSLATimer(
    ticket?.created_at || new Date().toISOString(),
    ticket?.category || '',
  );

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate('/tickets')}
        className="flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Tickets
      </button>

      {/* Ticket Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-h1 text-primary mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {ticket.title}
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[ticket.status]}`}>
                {ticket.status.replace('_', ' ')}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                {ticket.category.replace('_', ' ')}
              </span>
              <span className="text-label-sm text-on-surface-variant opacity-50">•</span>
              <span className="text-label-sm text-on-surface-variant">
                Priority: <strong>{ticket.priority}</strong>
              </span>
              <span className="text-label-sm text-on-surface-variant opacity-50">•</span>
              <span className="text-label-sm text-on-surface-variant">
                Created: {new Date(ticket.created_at).toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {/* SLA Timer */}
          {sla.isApplicable && !sla.isExpired && (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-label-sm font-bold text-warning">SLA Window</p>
                <p className="text-h3 text-warning font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                  {sla.formattedTime}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface-container rounded-lg p-4 mb-4">
          <p className="text-body-lg text-on-surface whitespace-pre-wrap">{ticket.description}</p>
        </div>

        <p className="text-label-sm text-on-surface-variant">
          Ticket ID: <span className="text-mono">{ticket.id}</span>
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
        <h2 className="text-h2 text-primary mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
          Activity Timeline
        </h2>

        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-8 text-center">
            No activity recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            {timeline.map((event, idx) => (
              <div key={event.id} className="flex gap-4 relative">
                {/* Timeline line */}
                {idx < timeline.length - 1 && (
                  <div className="absolute left-3.5 top-8 w-0.5 h-full bg-outline-variant" />
                )}

                {/* Dot */}
                <div className="relative z-10 w-7 h-7 rounded-full bg-surface-container border-2 border-primary flex items-center justify-center flex-shrink-0 mt-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-label-md font-medium text-on-surface">
                      {event.changed_by_name || 'System'}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      changed status to
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-label-sm font-bold ${statusColor[event.new_status] || 'bg-surface-container text-on-surface-variant'}`}>
                      {event.new_status.replace('_', ' ')}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-body-md text-on-surface-variant bg-surface-container rounded-lg p-3 mt-1">
                      {event.notes}
                    </p>
                  )}
                  <span className="text-label-sm text-on-surface-variant opacity-60 mt-1 inline-block">
                    {new Date(event.created_at).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
