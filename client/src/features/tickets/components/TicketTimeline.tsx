import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TicketTimelineItem as TicketEvent } from '../api/ticketService';
import { getTimelineIcon, statusColor } from './ticketUtils';

export interface TicketTimelineProps {
  timeline: TicketEvent[];
  getStatusLabel: (status: string) => string;
}

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ timeline, getStatusLabel }) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
          {t('ticketDetail.timelineTitle')}
        </h2>
      </div>
      <div className="p-5">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            {t('ticketDetail.noActivity')}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {timeline.map((event, idx) => (
              <div key={event.id} className="flex gap-3 relative">
                {idx < timeline.length - 1 && (
                  <div className="absolute left-2.75 top-6 -bottom-5 w-px bg-border" />
                )}
                <div className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shrink-0 z-10">
                  {getTimelineIcon(event.new_status)}
                </div>
                <div className="flex flex-col min-w-0 pt-0.5">
                  <span className="text-xs text-foreground">
                    <span className="font-bold text-foreground">
                      {event.changed_by_name || t('ticketDetail.system')}
                    </span>{' '}
                    {t('ticketDetail.changedStatusTo')}{' '}
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        statusColor[event.new_status] || 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {getStatusLabel(event.new_status)}
                    </span>
                  </span>
                  {event.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-2 mt-1.5 italic">
                      {event.notes}
                    </p>
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {new Date(event.created_at).toLocaleString(
                      i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                      {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      }
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
