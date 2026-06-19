import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, AlertTriangle, UserCheck, FileText, Image, Video, FileSpreadsheet, Download, Paperclip, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { Ticket, TicketEvent, TicketAttachment } from '../services/ticketService';
import { useSLATimer } from '../hooks/useSLATimer';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const statusColor: Record<string, string> = {
  OPEN: 'bg-info/10 text-info',
  IN_PROGRESS: 'bg-warning/10 text-warning',
  AWAITING_PAYMENT: 'bg-warning/10 text-warning',
  RESOLVED: 'bg-success/10 text-success',
  CLOSED: 'bg-surface-container text-on-surface-variant',
  CANCELLED: 'bg-error/10 text-error',
};

export function TicketDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<(TicketEvent & { changed_by_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Technician assignment state
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('');

  // Attachments state
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const canAssign = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

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

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [t, events, atts] = await Promise.all([
          ticketService.getById(id!),
          ticketService.getTimeline(id!),
          ticketService.getAttachments(id!),
        ]);
        setTicket(t);
        setSelectedTechId(t.assigned_tech_id || '');
        setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
        setAttachments(atts);
      } catch (err) {
        console.error('Failed to load ticket', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAttachmentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-secondary" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-info" />;
    if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-error" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-success" />;
    return <FileText className="h-5 w-5 text-on-surface-variant" />;
  };

  const getAttachmentUrl = (filePath: string) => {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.startsWith('uploads/')) {
      return '/' + normalized;
    }
    return normalized;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !id) return;
    setUploadError(null);
    setUploading(true);

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'video/mp4',
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!allowedMimeTypes.includes(file.type)) {
          setUploadError(t('ticketDetail.invalidFileType'));
          continue;
        }
        if (file.size > maxFileSize) {
          setUploadError(t('ticketDetail.fileTooLarge'));
          continue;
        }

        const newAttachment = await ticketService.uploadAttachment(id, file);
        setAttachments((prev) => [...prev, newAttachment]);

        // Refresh timeline
        const events = await ticketService.getTimeline(id);
        setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
      }
    } catch (err) {
      console.error('Failed to upload file', err);
      setUploadError(t('ticketDetail.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!canAssign) return;
    async function loadTechs() {
      setLoadingTechs(true);
      try {
        const techs = await userService.getTechnicians();
        setTechnicians(techs);
      } catch (err) {
        console.error('Failed to load technicians', err);
      } finally {
        setLoadingTechs(false);
      }
    }
    loadTechs();
  }, [canAssign]);

  const handleAssign = async (techId: string) => {
    if (!id) return;
    setAssigning(true);
    setAssignMessage(null);
    try {
      const updatedTicket = await ticketService.assign(id, techId);
      setTicket(updatedTicket);
      setSelectedTechId(techId);
      setAssignMessage({ text: t('ticketDetail.assignSuccess'), isError: false });
      
      // Reload timeline to show assignment event
      const events = await ticketService.getTimeline(id);
      setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
    } catch (err) {
      console.error('Failed to assign technician', err);
      setAssignMessage({ text: t('ticketDetail.assignError'), isError: true });
    } finally {
      setAssigning(false);
    }
  };

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
        className="flex items-center gap-2 text-label-md text-on-surface-variant hover:text-primary transition-colors mb-4 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('ticketDetail.backToTickets')}
      </button>

      {/* Ticket Header */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-6 shadow-sm text-on-surface">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-h1 text-primary mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              {ticket.title}
            </h1>
            <div className="flex flex-wrap gap-2 items-center">
              <span className={`px-2 py-0.5 rounded text-label-sm font-bold ${statusColor[ticket.status]}`}>
                {getStatusLabel(ticket.status)}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                {getCategoryLabel(ticket.category)}
              </span>
              <span className="text-label-sm text-on-surface-variant opacity-50">•</span>
              <span className="text-label-sm text-on-surface-variant">
                {t('ticketDetail.priority')}: <strong>{getPriorityLabel(ticket.priority)}</strong>
              </span>
              <span className="text-label-sm text-on-surface-variant opacity-50">•</span>
              <span className="text-label-sm text-on-surface-variant">
                {t('ticketDetail.created')}: {new Date(ticket.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
              </span>
            </div>
          </div>

          {/* SLA Timer */}
          {sla.isApplicable && !sla.isExpired && (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <div>
                <p className="text-label-sm font-bold text-warning">{t('ticketDetail.slaWindow')}</p>
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

        {/* Attachments Section */}
        <div className="border-t border-outline-variant/30 pt-5 mt-5">
          <h3 className="text-h3 text-primary mb-3 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            {t('ticketDetail.attachmentsTitle')}
            {attachments.length > 0 && (
              <span className="bg-primary/10 text-primary text-label-sm px-2 py-0.5 rounded-full font-bold animate-pulse">
                {attachments.length}
              </span>
            )}
          </h3>

          {/* Attachments Grid */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4 animate-fade-in">
              {attachments.map((att) => {
                const isImage = att.mime_type.startsWith('image/');
                const downloadUrl = getAttachmentUrl(att.path);
                return (
                  <div
                    key={att.id}
                    className="flex flex-col justify-between p-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-lg transition-all duration-200 group relative overflow-hidden"
                  >
                    {/* Background faint preview for images */}
                    {isImage && (
                      <div className="absolute inset-0 opacity-5 pointer-events-none transition-transform group-hover:scale-105 duration-300">
                        <img src={downloadUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-start gap-3 relative z-10">
                      <div className="p-2 bg-surface-container-lowest rounded-md shrink-0 border border-outline-variant/30">
                        {getAttachmentIcon(att.mime_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-body-md font-medium text-on-surface truncate" title={att.filename}>
                          {att.filename}
                        </p>
                        <p className="text-label-sm text-on-surface-variant opacity-60">
                          {formatFileSize(att.size_bytes)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-outline-variant/20 relative z-10">
                      <span className="text-label-sm text-on-surface-variant opacity-50">
                        {new Date(att.uploaded_at).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { day: '2-digit', month: 'short' })}
                      </span>
                      <a
                        href={downloadUrl}
                        download={att.filename}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-full hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {attachments.length === 0 && (
            <p className="text-body-md text-on-surface-variant opacity-65 mb-4 italic">
              {t('ticketDetail.noAttachments')}
            </p>
          )}

          {/* Upload Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragOver
                ? 'border-primary bg-primary/5 scale-[0.99]'
                : 'border-outline-variant/60 hover:border-outline-variant hover:bg-surface-container-high/40'
            }`}
            onClick={() => document.getElementById('detail-file-input')?.click()}
          >
            <input
              id="detail-file-input"
              type="file"
              multiple
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
            <UploadCloud className={`h-8 w-8 mx-auto mb-2 text-on-surface-variant opacity-60 ${uploading ? 'animate-bounce' : 'group-hover:scale-110 duration-200'}`} />
            <p className="text-body-md font-semibold text-on-surface mb-0.5">
              {uploading ? t('ticketDetail.uploading') : t('ticketDetail.dragAndDrop')}
            </p>
            <p className="text-label-sm text-on-surface-variant opacity-60">
              {t('ticketDetail.allowedTypes')}
            </p>
          </div>

          {uploadError && (
            <Alert variant="destructive" className="mt-2 animate-fade-in">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Client & Assignment Section */}
        <div className="border-t border-outline-variant/30 pt-4 mt-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              {/* Display Assigned Tech */}
              <div className="flex items-center gap-2">
                <UserCheck className="h-4.5 w-4.5 text-primary" />
                <span className="text-body-md text-on-surface">
                  {t('ticketDetail.assignedTechnician')}:{' '}
                  <strong className="text-primary font-semibold">
                    {ticket.assigned_tech_name
                      ? `${ticket.assigned_tech_name} (${ticket.assigned_tech_email})`
                      : t('ticketDetail.unassigned')}
                  </strong>
                </span>
              </div>
              
              {/* Display Client Info (Admin/Tech only) */}
              {canAssign && ticket.client_name && (
                <div className="flex items-center gap-2 text-label-sm text-on-surface-variant opacity-80 pl-6.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>Client: <strong>{ticket.client_name} ({ticket.client_email})</strong></span>
                </div>
              )}
            </div>

            {/* Assignment Dropdown Control for Admin/Tech */}
            {canAssign && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-surface-container-high p-2 rounded-lg border border-outline-variant/50 w-full md:w-auto">
                <div className="flex-1 min-w-[200px]">
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    disabled={loadingTechs || assigning}
                    className="w-full px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md text-body-md focus:outline-none focus:border-primary disabled:opacity-50 text-on-surface cursor-pointer"
                  >
                    <option value="" disabled>{t('ticketDetail.assignTechnician')}...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} {tech.specialty ? `(${tech.specialty})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => handleAssign(selectedTechId)}
                  disabled={!selectedTechId || selectedTechId === ticket.assigned_tech_id || assigning}
                  className="bg-primary text-on-primary px-4 py-1.5 rounded-md text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {assigning ? t('ticketDetail.assigning') : t('ticketDetail.assignTechnician')}
                </button>
              </div>
            )}
          </div>
          
          {/* Assignment feedback message */}
          {assignMessage && (
            <Alert variant={assignMessage.isError ? 'destructive' : 'default'} className="animate-fade-in">
              {assignMessage.isError ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              <AlertTitle>{assignMessage.isError ? 'Error' : 'Success'}</AlertTitle>
              <AlertDescription>{assignMessage.text}</AlertDescription>
            </Alert>
          )}
        </div>

        <p className="text-label-sm text-on-surface-variant mt-4">
          {t('ticketDetail.ticketId')}: <span className="text-mono">{ticket.id}</span>
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm text-on-surface">
        <h2 className="text-h2 text-primary mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('ticketDetail.timelineTitle')}
        </h2>

        {timeline.length === 0 ? (
          <p className="text-body-md text-on-surface-variant py-8 text-center">
            {t('ticketDetail.noActivity')}
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
                <div className="relative z-10 w-7 h-7 rounded-full bg-surface-container border-2 border-primary flex items-center justify-center shrink-0 mt-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </div>

                {/* Content */}
                <div className="pb-6 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-label-md font-medium text-on-surface">
                      {event.changed_by_name || t('ticketDetail.system')}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">
                      {t('ticketDetail.changedStatusTo')}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-label-sm font-bold ${statusColor[event.new_status] || 'bg-surface-container text-on-surface-variant'}`}>
                      {getStatusLabel(event.new_status)}
                    </span>
                  </div>
                  {event.notes && (
                    <p className="text-body-md text-on-surface-variant bg-surface-container rounded-lg p-3 mt-1">
                      {event.notes}
                    </p>
                  )}
                  <span className="text-label-sm text-on-surface-variant opacity-60 mt-1 inline-block">
                    {new Date(event.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
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
