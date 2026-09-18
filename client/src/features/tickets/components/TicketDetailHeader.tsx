import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageSquare, Laptop, Clock } from 'lucide-react';
import { Page, type PageStatusStage } from '@/components/Page';
import type { TicketItem as Ticket } from '../api/ticketService';
import type { AuthUser } from '@/store/useAuthStore';

export interface TicketStatusBarProps {
  ticket: Ticket;
  user: AuthUser | null;
  statusUpdating?: boolean;
  onStatusChange: (newStatus: string) => void;
  className?: string;
}

/**
 * Stage pipeline and workflow action bar for Ticket Detail view.
 * Mimics Odoo ERP's statusbar widget inside form headers.
 */
export const TicketStatusBar: React.FC<TicketStatusBarProps> = ({
  ticket,
  user,
  statusUpdating = false,
  onStatusChange,
  className,
}) => {
  const { t } = useTranslation();

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
            className="h-7 px-3 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 font-semibold cursor-pointer"
          >
            {statusUpdating && (
              <div className="w-3 h-3 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin mr-1" />
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
              className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1" />
              )}
              {t('ticketDetail.reopen')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="h-7 px-3 text-xs text-muted-foreground font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-border border-t-foreground rounded-full animate-spin mr-1" />
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
              className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1" />
              )}
              {t('techDashboard.resolveTicket')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="h-7 px-3 text-xs text-muted-foreground font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-border border-t-foreground rounded-full animate-spin mr-1" />
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
              className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1" />
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
                className="h-7 px-3 text-xs font-semibold cursor-pointer"
              >
                {statusUpdating && (
                  <div className="w-3 h-3 border-2 border-border border-t-foreground rounded-full animate-spin mr-1" />
                )}
                {t('techDashboard.awaitingPayment')}
              </Button>
              <Button
                size="sm"
                onClick={() => onStatusChange('RESOLVED')}
                disabled={statusUpdating}
                className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
              >
                {statusUpdating && (
                  <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1" />
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
              className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
            >
              {statusUpdating && (
                <div className="w-3 h-3 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-1" />
              )}
              {t('techDashboard.resolveTicket')}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange('CLOSED')}
            disabled={statusUpdating}
            className="h-7 px-3 text-xs text-muted-foreground font-semibold cursor-pointer"
          >
            {statusUpdating && (
              <div className="w-3 h-3 border-2 border-border border-t-foreground rounded-full animate-spin mr-1" />
            )}
            {t('ticketDetail.closeTicket')}
          </Button>
        </div>
      );
    }
    return null;
  };

  const stages: PageStatusStage[] = [
    {
      id: 'OPEN',
      label: t('tickets.statusOpen', 'Open'),
      isCurrent: ticket.status === 'OPEN',
      isCompleted: ticket.status !== 'OPEN' && ticket.status !== 'CANCELLED',
    },
    {
      id: 'IN_PROGRESS',
      label: t('tickets.statusInProgress', 'In Progress'),
      isCurrent: ticket.status === 'IN_PROGRESS' || ticket.status === 'AWAITING_PAYMENT',
      isCompleted: ticket.status === 'RESOLVED' || ticket.status === 'RESOLVED_AUTOMATED' || ticket.status === 'CLOSED',
    },
    {
      id: 'RESOLVED',
      label: t('tickets.statusResolved', 'Resolved'),
      isCurrent: ticket.status === 'RESOLVED' || ticket.status === 'RESOLVED_AUTOMATED',
      isCompleted: ticket.status === 'CLOSED',
    },
    {
      id: 'CLOSED',
      label: t('tickets.statusClosed', 'Closed'),
      isCurrent: ticket.status === 'CLOSED',
      isCompleted: ticket.status === 'CLOSED',
    },
  ];

  if (ticket.status === 'CANCELLED') {
    stages.push({
      id: 'CANCELLED',
      label: t('tickets.statusCancelled', 'Cancelled'),
      isCurrent: true,
      disabled: true,
    });
  }

  return (
    <Page.StatusBar
      className={className}
      actions={renderActionButtons()}
      stages={stages}
      currentStageId={ticket.status}
    />
  );
};

export interface TicketDetailHeaderProps {
  ticket: Ticket;
  user: AuthUser | null;
  statusUpdating?: boolean;
  getStatusLabel: (status: string) => string;
  onStatusChange?: (newStatus: string) => void;
  responseCount?: number;
  onToggleChat?: () => void;
  isChatOpen?: boolean;
  sla?: {
    isApplicable?: boolean;
    formattedTime?: string;
    isExpired?: boolean;
  };
  showStatusBar?: boolean;
}

/**
 * Enterprise Form Header for Ticket detail pages.
 * Implements Odoo's Form Title block (`oe_title`) with Stat Buttons (`oe_button_box`).
 */
export const TicketDetailHeader: React.FC<TicketDetailHeaderProps> = ({
  ticket,
  user,
  statusUpdating = false,
  getStatusLabel,
  onStatusChange,
  responseCount,
  onToggleChat,
  isChatOpen,
  sla,
  showStatusBar = false,
}) => {
  const { t, i18n } = useTranslation();

  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'RESOLVED_AUTOMATED';
  const isPendingOrProgress = ticket.status === 'IN_PROGRESS' || ticket.status === 'AWAITING_PAYMENT';
  const isCancelled = ticket.status === 'CANCELLED';
  const isOpen = ticket.status === 'OPEN';

  const badgeClasses = isResolved
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20'
    : isPendingOrProgress
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20'
      : isCancelled
        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20'
        : isOpen
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-500/20'
          : 'bg-muted text-muted-foreground border-border';

  const dotClass = isResolved
    ? 'bg-emerald-500'
    : isPendingOrProgress
      ? 'bg-amber-500'
      : isCancelled
        ? 'bg-red-500'
        : isOpen
          ? 'bg-blue-500'
          : 'bg-muted-foreground';

  return (
    <>
      {showStatusBar && onStatusChange && (
        <TicketStatusBar
          ticket={ticket}
          user={user}
          statusUpdating={statusUpdating}
          onStatusChange={onStatusChange}
          className="mb-4"
        />
      )}

      <Page.FormHeader
        title={ticket.title}
        badges={
          <>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border ${badgeClasses}`}
            >
              <span className={`mr-1 h-1 w-1 rounded-full ${dotClass}`} />
              {getStatusLabel(ticket.status)}
            </span>
            {ticket.source === 'AGENT' && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-500/20 font-mono">
                {t('ticketDetail.sourceAgentBadge')}
              </span>
            )}
          </>
        }
        subtitle={
          <span>
            {t('ticketDetail.openedBy')}{' '}
            <strong className="font-semibold text-foreground">
              {ticket.reporter_name
                ? `${ticket.reporter_name}${ticket.client_name ? ` (${ticket.client_name})` : ''}`
                : ticket.client_name || 'Client'}
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
        }
        buttonBox={
          <Page.StatBox>
            {onToggleChat && (
              <Page.StatButton
                icon={MessageSquare}
                value={typeof responseCount === 'number' ? responseCount : undefined}
                label={t('ticketDetail.toggleChatter')}
                onClick={onToggleChat}
                active={isChatOpen}
              />
            )}
            {ticket.device_name && (
              <Page.StatButton
                icon={Laptop}
                value={ticket.device_name}
                label="Device"
              />
            )}
            {sla?.isApplicable && (
              <Page.StatButton
                icon={Clock}
                value={sla.formattedTime}
                label="SLA"
                active={sla.isExpired}
              />
            )}
          </Page.StatBox>
        }
      />
    </>
  );
};
