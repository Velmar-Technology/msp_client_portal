import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { Ticket } from '@/services/ticketService';
import type { AuthUser } from '@/store/useAuthStore';

export interface TicketDetailHeaderProps {
  ticket: Ticket;
  user: AuthUser | null;
  statusUpdating: boolean;
  getStatusLabel: (status: string) => string;
  onStatusChange: (newStatus: string) => void;
}

const statusColor: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary border-primary/20',
  IN_PROGRESS: 'bg-secondary text-secondary-foreground border-border',
  AWAITING_PAYMENT: 'bg-secondary text-secondary-foreground border-border animate-pulse',
  RESOLVED: 'bg-primary/10 text-primary border-primary/20',
  RESOLVED_AUTOMATED: 'bg-primary/10 text-primary border-primary/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const TicketDetailHeader: React.FC<TicketDetailHeaderProps> = ({
  ticket,
  user,
  statusUpdating,
  getStatusLabel,
  onStatusChange,
}) => {
  const { t, i18n } = useTranslation();

  const renderActionButtons = () => {
    // Terminal states: CANCELLED and CLOSED tickets cannot transition anywhere
    if (ticket.status === 'CANCELLED' || ticket.status === 'CLOSED') {
      return null;
    }

    if (user?.role === 'CLIENT') {
      if (ticket.status === 'OPEN') {
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange('CANCELLED')}
            disabled={statusUpdating}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold"
          >
            {statusUpdating && (
              <div className="w-3.5 h-3.5 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin mr-1.5" />
            )}
            {t('tickets.cancelTicket')}
          </Button>
        );
      }
      return null;
    }

    if (user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') {
      if (ticket.status === 'RESOLVED') {
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onStatusChange('OPEN')}
              disabled={statusUpdating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('ticketDetail.reopen')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="text-muted-foreground font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('ticketDetail.closeTicket')}
            </Button>
          </div>
        );
      }

      if (ticket.status === 'RESOLVED_AUTOMATED') {
        return (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => onStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('techDashboard.resolveTicket')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="text-muted-foreground font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('ticketDetail.closeTicket')}
            </Button>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          {ticket.status === 'OPEN' && (
            <Button
              size="sm"
              onClick={() => onStatusChange('IN_PROGRESS')}
              disabled={statusUpdating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('techDashboard.startWork')}
            </Button>
          )}

          {ticket.status === 'IN_PROGRESS' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStatusChange('AWAITING_PAYMENT')}
                disabled={statusUpdating}
                className="font-semibold"
              >
                {statusUpdating && (
                  <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin mr-1.5" />
                )}
                {t('techDashboard.awaitingPayment')}
              </Button>
              <Button
                size="sm"
                onClick={() => onStatusChange('RESOLVED')}
                disabled={statusUpdating}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {statusUpdating && (
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
                )}
                {t('techDashboard.resolveTicket')}
              </Button>
            </>
          )}

          {ticket.status === 'AWAITING_PAYMENT' && (
            <Button
              size="sm"
              onClick={() => onStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {statusUpdating && (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1.5" />
              )}
              {t('techDashboard.resolveTicket')}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange('CLOSED')}
            disabled={statusUpdating}
            className="text-muted-foreground font-semibold"
          >
            {statusUpdating && (
              <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin mr-1.5" />
            )}
            {t('ticketDetail.closeTicket')}
          </Button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold text-foreground mb-1.5 font-heading">
          {ticket.title}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              statusColor[ticket.status] || 'bg-muted text-muted-foreground border-border'
            }`}
          >
            {getStatusLabel(ticket.status)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t('ticketDetail.openedBy')}{' '}
            <strong className="font-semibold text-foreground">
              {ticket.client_name || 'Client'}
            </strong>{' '}
            •{' '}
            {new Date(ticket.created_at).toLocaleString(
              i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }
            )}
          </span>
        </div>
      </div>
      {renderActionButtons()}
    </div>
  );
};
