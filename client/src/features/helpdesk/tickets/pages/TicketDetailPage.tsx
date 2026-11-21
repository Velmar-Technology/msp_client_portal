import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  Moon,
  Download,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { useSLATimer } from '../hooks/useSLATimer';
import { useTicketSlaAwareness } from '@/hooks/useBusinessHours';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { useUrlState } from '@/hooks/useUrlState';
import { PageShell } from '@/components/layout/PageShell';
import { HorizontalTabs, ListGroup, ListItem, SectionHeader } from '@/components/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment';
import {
  TicketStatusBar,
  TicketFlightRecorderCard,
  TicketChatter,
  TicketTimeline,
  FilePreviewModal,
} from '../components';
import {
  formatFileSize,
  getAttachmentIcon,
  getAttachmentUrl,
} from '../components/ticketUtils';

/**
 * Modern Ticket Detail view following the Profile Page & ADR-016 standards.
 * Features a side-by-side architecture:
 * - Left/Main Column: Card-less Description, Attachments, and permanent Comments & Discussion thread.
 * - Right/Side Panel: Compact bubble tabs ([ Properties ] [ Diagnostics ] [ Timeline ]),
 *   hairline setting rows, and flat danger zone.
 *
 * @see ADR-016
 * @see BL-101 (1h SLA Cancel)
 */
export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { getParam, setParam } = useUrlState();
  const activeSideTab = getParam('sideTab') || 'properties';

  const {
    user,
    ticket,
    error,
    responses,
    timeline,
    attachments,
    technicians,
    loading,
    assigning,
    statusUpdating,
    sendingResponse,
    responseText,
    setResponseText,
    responseFiles,
    setResponseFiles,
    isInternalNote,
    setIsInternalNote,
    responseFeedback,
    selectedTechId,
    setSelectedTechId,
    previewFile,
    setPreviewFile,
    canAssign,
    getStatusLabel,
    getPriorityLabel,
    getCategoryLabel,
    handleStatusChange,
    handleAssign,
    handleSendResponse,
  } = useTicketDetail(id);

  const sla = useSLATimer(ticket);
  const slaAwareness = useTicketSlaAwareness(ticket?.created_at, i18n.language);
  const showSkeleton = useDeferredLoading(loading);

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <PageShell variant="full" className="max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32 rounded" />
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-8 w-64 rounded-md" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!ticket || error) {
    return (
      <PageShell variant="constrained" className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="space-y-6">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto border border-destructive/20 shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {error?.title || t('ticketDetail.invalidTicketId')}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {error?.message || t('ticketDetail.invalidTicketIdDesc')}
            </p>
          </div>
          <div>
            <Link
              to="/helpdesk/tickets"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-sm font-semibold shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('ticketDetail.backToTickets')}
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'RESOLVED_AUTOMATED';
  const isPendingOrProgress = ticket.status === 'IN_PROGRESS' || ticket.status === 'AWAITING_PAYMENT';
  const isCancelled = ticket.status === 'CANCELLED';
  const isOpen = ticket.status === 'OPEN';

  const statusBadgeVariant = isResolved
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20'
    : isPendingOrProgress
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20'
      : isCancelled
        ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20'
        : isOpen
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-500/20'
          : 'bg-muted text-muted-foreground border-border';

  // Side panel tabs: Diagnostics tab rendered dynamically when telemetry is attached
  const sideTabs = [
    {
      id: 'properties',
      label: t('ticketDetail.properties', 'Properties'),
    },
    ...(ticket.device_snapshot || ticket.reporter_name
      ? [
          {
            id: 'diagnostics',
            label: t('ticketDetail.diagnostics', 'Diagnostics'),
          },
        ]
      : []),
    {
      id: 'timeline',
      label: t('ticketDetail.timelineTitle', 'Timeline'),
    },
  ];

  return (
    <PageShell
      variant="full"
      className="max-w-7xl mx-auto animate-fade-in"
      backPath="/helpdesk/tickets"
      backLabel={t('ticketDetail.backToTickets')}
      title={ticket.title}
      badge={
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${statusBadgeVariant}`}
          >
            {getStatusLabel(ticket.status)}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            #{ticket.id.slice(0, 8)}
          </span>
        </div>
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
      actions={
        sla?.isApplicable && !sla.isExpired ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono font-bold animate-pulse self-start sm:self-auto">
            <Clock className="w-3.5 h-3.5" />
            <span>{sla.formattedTime}</span>
          </div>
        ) : undefined
      }
    >

        {/* Workflow Stage Progression Tracker */}
        <TicketStatusBar
          ticket={ticket}
          user={user}
          statusUpdating={statusUpdating}
          onStatusChange={handleStatusChange}
          className="rounded-xl border border-border/60 bg-card shadow-2xs"
        />

        {/* Responsive Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-1">
          {/* Main Column: Description, Attachments, and Dedicated Comments Section */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
            {/* Description Section (Card-less, text-first) */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                {t('tickets.modalDescLabel', 'Description')}
              </h2>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-5 shadow-2xs">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-normal">
                  {ticket.description}
                </p>
              </div>
            </div>

            {/* Attached Files Gallery */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  {t('ticketDetail.attachmentsTitle')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((att) => {
                    const downloadUrl = getAttachmentUrl(att.path);
                    return (
                      <Attachment key={att.id} size="sm" className="w-full">
                        <AttachmentMedia>{getAttachmentIcon(att.mime_type)}</AttachmentMedia>
                        <AttachmentContent>
                          <AttachmentTitle>{att.filename}</AttachmentTitle>
                          <AttachmentDescription>
                            {formatFileSize(att.size_bytes)}
                          </AttachmentDescription>
                        </AttachmentContent>
                        <AttachmentActions>
                          <AttachmentAction asChild aria-label={t('ticketDetail.downloadFile')}>
                            <a href={downloadUrl} download={att.filename} target="_blank" rel="noreferrer">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </AttachmentAction>
                        </AttachmentActions>
                        <AttachmentTrigger asChild>
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewFile({
                                filename: att.filename,
                                url: downloadUrl,
                                mimeType: att.mime_type || att.mimeType || '',
                              })
                            }
                            aria-label={`${t('ticketDetail.previewFile')}: ${att.filename}`}
                          />
                        </AttachmentTrigger>
                      </Attachment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dedicated Comments & Discussion Section (Linear/GitHub style) */}
            <div className="space-y-2">
              <TicketChatter
                responses={responses}
                user={user}
                responseText={responseText}
                setResponseText={setResponseText}
                responseFiles={responseFiles}
                setResponseFiles={setResponseFiles}
                isInternalNote={isInternalNote}
                setIsInternalNote={setIsInternalNote}
                responseFeedback={responseFeedback}
                sendingResponse={sendingResponse}
                onSendResponse={handleSendResponse}
                onPreviewFile={setPreviewFile}
                isCollapsible={false}
                className="border border-border/60 rounded-xl min-h-[520px] shadow-2xs"
              />
            </div>
          </div>

          {/* Side Panel: Bubble Tabs for Properties, Diagnostics, and Timeline */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
            <HorizontalTabs
              tabs={sideTabs}
              activeTab={activeSideTab}
              onTabChange={(tabId) => setParam('sideTab', tabId)}
            />

            {/* Side Tab 1: Properties */}
            {activeSideTab === 'properties' && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-3">
                  <SectionHeader title={t('ticketDetail.ticketProperties', 'Ticket Properties')} />
                  <ListGroup>
                    <ListItem
                      title={t('ticketDetail.priority')}
                      description={t('ticketDetail.priorityDesc', 'SLA urgency priority level')}
                      trailing={
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                            ticket.priority === 'CRITICAL'
                              ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                              : ticket.priority === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : ticket.priority === 'MEDIUM'
                                  ? 'bg-primary/10 text-primary border-primary/20'
                                  : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {getPriorityLabel(ticket.priority)}
                        </span>
                      }
                    />

                    <ListItem
                      title={t('tickets.tableCategory')}
                      description={t('ticketDetail.categoryDesc', 'Problem domain classification')}
                      trailing={
                        <span className="text-sm font-semibold text-foreground">
                          {getCategoryLabel(ticket.category)}
                        </span>
                      }
                    />

                    <ListItem
                      title={t('ticketDetail.assignedSpecialist', 'Assigned Specialist')}
                      description={
                        ticket.assigned_tech_email ||
                        t('ticketDetail.assignedSpecialistDesc', 'Technician currently handling this request')
                      }
                      trailing={
                        canAssign && technicians.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={selectedTechId || ticket.assigned_tech_id || ''}
                              onValueChange={(val) => {
                                setSelectedTechId(val);
                                handleAssign(val);
                              }}
                              disabled={assigning}
                            >
                              <SelectTrigger className="h-7 text-xs w-36 sm:w-40">
                                <SelectValue placeholder={t('ticketDetail.assignTechnician')} />
                              </SelectTrigger>
                              <SelectContent>
                                {technicians.map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id} className="text-xs">
                                    {tech.name} {tech.specialty ? `(${tech.specialty})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {assigning && (
                              <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {(ticket.assigned_tech_name || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {ticket.assigned_tech_name || t('ticketDetail.unassigned')}
                            </span>
                          </div>
                        )
                      }
                    />

                    <ListItem
                      title={t('ticketDetail.openedBy', 'Reported By')}
                      description={ticket.reporter_email || ticket.client_email || ''}
                      trailing={
                        <span className="text-sm font-medium text-foreground">
                          {ticket.reporter_name
                            ? `${ticket.reporter_name}${ticket.client_name ? ` (${ticket.client_name})` : ''}`
                            : ticket.client_name || 'Client'}
                        </span>
                      }
                    />

                    <ListItem
                      title={t('ticketDetail.created', 'Submission Time')}
                      description={new Date(ticket.created_at).toLocaleString(
                        i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                      trailing={
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border bg-muted text-muted-foreground border-border/80">
                          {ticket.source === 'AGENT' ? t('ticketDetail.sourceAgent') : ticket.source || 'PORTAL'}
                        </span>
                      }
                    />

                    {(sla.isApplicable || slaAwareness?.isAfterHours) && (
                      <ListItem
                        title={t('ticketDetail.slaWindow', 'SLA Response Window')}
                        description={
                          slaAwareness?.isAfterHours
                            ? t('ticketDetail.afterHoursExplanation', { time: slaAwareness.formattedSlaStart })
                            : t('ticketDetail.slaDescription')
                        }
                        trailing={
                          sla.isApplicable && !sla.isExpired ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              {sla.formattedTime}
                            </span>
                          ) : slaAwareness?.isAfterHours ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <Moon className="w-3.5 h-3.5" />
                              {slaAwareness.formattedSlaStart}
                            </span>
                          ) : null
                        }
                      />
                    )}

                    <ListItem
                      title={t('ticketDetail.attachmentsTitle', 'Attachments')}
                      description={
                        attachments.length > 0
                          ? `${attachments.length} ${attachments.length === 1 ? 'file' : 'files'}`
                          : t('ticketDetail.noAttachments')
                      }
                      trailing={
                        attachments.length > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border bg-muted text-muted-foreground border-border/80">
                            {attachments.length}
                          </span>
                        ) : null
                      }
                    />
                  </ListGroup>
                </div>

                {/* Flat Danger Zone: Ticket Cancellation for Client on Open Tickets */}
                {user?.role === 'CLIENT' && ticket.status === 'OPEN' && (
                  <div className="space-y-3">
                    <SectionHeader title={t('ticketDetail.ticketActions', 'Ticket Actions')} />
                    <ListGroup>
                      <ListItem
                        danger
                        title={t('ticketDetail.cancelTitle', 'Cancel Ticket Request')}
                        description={t('ticketDetail.cancelExplanation')}
                        trailing={
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange('CANCELLED')}
                            disabled={statusUpdating}
                            className="h-7 px-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold cursor-pointer"
                          >
                            {statusUpdating && (
                              <div className="w-3 h-3 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin mr-1" />
                            )}
                            {t('tickets.cancelTicket')}
                          </Button>
                        }
                      />
                    </ListGroup>
                  </div>
                )}
              </div>
            )}

            {/* Side Tab 2: Diagnostics */}
            {activeSideTab === 'diagnostics' && (ticket.device_snapshot || ticket.reporter_name) && (
              <div className="animate-fade-in">
                <TicketFlightRecorderCard
                  snapshot={ticket.device_snapshot}
                  reporterName={ticket.reporter_name}
                  reporterEmail={ticket.reporter_email}
                  deviceName={ticket.device_name}
                />
              </div>
            )}

            {/* Side Tab 3: Timeline */}
            {activeSideTab === 'timeline' && (
              <div className="animate-fade-in">
                <TicketTimeline timeline={timeline} getStatusLabel={getStatusLabel} />
              </div>
            )}
          </div>
        </div>

        <FilePreviewModal
          previewFile={previewFile}
          onClose={() => setPreviewFile(null)}
        />
    </PageShell>
  );
}

export default TicketDetailPage;
