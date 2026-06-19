import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, AlertTriangle, UserCheck, FileText, Image, Video, FileSpreadsheet, Download, Paperclip, CheckCircle2, AlertCircle, Send, Upload, Activity, UserPlus, XCircle } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import type { Ticket, TicketEvent, TicketAttachment, TicketResponse } from '../services/ticketService';
import { useSLATimer } from '../hooks/useSLATimer';
import { useTranslation } from 'react-i18next';
import { Page } from '@/components/Page';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Ticket responses state
  const [responses, setResponses] = useState<TicketResponse[]>([]);
  const [responseText, setResponseText] = useState('');
  const [responseFiles, setResponseFiles] = useState<File[]>([]);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseFeedback, setResponseFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<{ filename: string; url: string; mimeType: string } | null>(null);

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
        const [t, events, atts, resps] = await Promise.all([
          ticketService.getById(id!),
          ticketService.getTimeline(id!),
          ticketService.getAttachments(id!),
          ticketService.getResponses(id!),
        ]);
        setTicket(t);
        setSelectedTechId(t.assigned_tech_id || '');
        setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
        setAttachments(atts);
        setResponses(resps);
      } catch (err) {
        console.error('Failed to load ticket', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || (!responseText.trim() && responseFiles.length === 0)) return;
    setSendingResponse(true);
    setResponseFeedback(null);
    try {
      const newResponse = await ticketService.createResponse(id, responseText.trim(), responseFiles);
      setResponses((prev) => [...prev, newResponse]);
      setResponseText('');
      setResponseFiles([]);
      setResponseFeedback({ text: t('ticketDetail.responseSuccess'), isError: false });
      setTimeout(() => setResponseFeedback(null), 3000);
    } catch (err) {
      console.error('Failed to send response', err);
      setResponseFeedback({ text: t('ticketDetail.responseError'), isError: true });
    } finally {
      setSendingResponse(false);
    }
  };

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

  // const handleDragOver = (e: React.DragEvent) => {
  //   e.preventDefault();
  //   setIsDragOver(true);
  // };

  // const handleDragLeave = () => {
  //   setIsDragOver(false);
  // };

  // const handleDrop = (e: React.DragEvent) => {
  //   e.preventDefault();
  //   setIsDragOver(false);
  //   handleFileUpload(e.dataTransfer.files);
  // };

  // const handleFileUpload = async (files: FileList | null) => {
  //   if (!files || files.length === 0 || !id) return;
  //   setUploadError(null);
  //   // setUploading(true);

  //   const allowedMimeTypes = [
  //     'image/jpeg',
  //     'image/png',
  //     'image/gif',
  //     'image/webp',
  //     'application/pdf',
  //     'application/msword',
  //     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  //     'application/vnd.ms-excel',
  //     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  //     'text/plain',
  //     'video/mp4',
  //   ];

  //   const maxFileSize = 10 * 1024 * 1024; // 10MB

  //   try {
  //     for (let i = 0; i < files.length; i++) {
  //       const file = files[i];
  //       if (!allowedMimeTypes.includes(file.type)) {
  //         setUploadError(t('ticketDetail.invalidFileType'));
  //         continue;
  //       }
  //       if (file.size > maxFileSize) {
  //         setUploadError(t('ticketDetail.fileTooLarge'));
  //         continue;
  //       }

  //       const newAttachment = await ticketService.uploadAttachment(id, file);
  //       setAttachments((prev) => [...prev, newAttachment]);

  //       // Refresh timeline
  //       const events = await ticketService.getTimeline(id);
  //       setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
  //     }
  //   } catch (err) {
  //     console.error('Failed to upload file', err);
  //     setUploadError(t('ticketDetail.uploadError'));
  //   } finally {
  //     // setUploading(false);
  //   }
  // };

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

  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setStatusUpdating(true);
    try {
      const notes = `Status changed directly from details view.`;
      const updatedTicket = await ticketService.updateStatus(id, newStatus, notes);
      setTicket(updatedTicket);
      // Refresh timeline
      const events = await ticketService.getTimeline(id);
      setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdating(false);
    }
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

  const getTimelineIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <UserPlus className="h-3.5 w-3.5 text-on-surface-variant" />;
      case 'CANCELLED':
        return <XCircle className="h-3.5 w-3.5 text-error" />;
      case 'RESOLVED':
      case 'CLOSED':
        return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      default:
        return <Activity className="h-3.5 w-3.5 text-on-surface-variant" />;
    }
  };

  const renderActionButtons = () => {
    if (!ticket) return null;
    const isInactive = ['CLOSED', 'CANCELLED', 'RESOLVED'].includes(ticket.status);
    
    if (isInactive) {
      return (
        <button
          onClick={() => handleStatusChange('OPEN')}
          disabled={statusUpdating}
          className="px-4 py-2 bg-primary text-on-primary hover:opacity-90 transition-opacity rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />}
          {t('techDashboard.startWork') === 'Iniciar Trabajo' ? 'Reabrir' : 'Reopen'}
        </button>
      );
    }

    if (user?.role === 'CLIENT') {
      return (
        <button
          onClick={() => handleStatusChange('CANCELLED')}
          disabled={statusUpdating}
          className="px-4 py-2 border border-error text-error hover:bg-error/5 transition-colors rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
        >
          {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-error/20 border-t-error rounded-full animate-spin" />}
          {t('tickets.cancelTicket')}
        </button>
      );
    }

    if (user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') {
      return (
        <div className="flex flex-wrap gap-2">
          {ticket.status === 'OPEN' && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={statusUpdating}
              className="px-4 py-2 bg-warning text-[#0F172A] hover:bg-warning/90 transition-colors rounded-lg text-label-md font-bold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-[#0F172A]/20 border-t-[#0F172A] rounded-full animate-spin" />}
              {t('techDashboard.startWork')}
            </button>
          )}
          
          {ticket.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleStatusChange('AWAITING_PAYMENT')}
                disabled={statusUpdating}
                className="px-4 py-2 border border-outline-variant text-primary hover:bg-surface-container-low transition-colors rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
                {t('techDashboard.awaitingPayment')}
              </button>
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={statusUpdating}
                className="px-4 py-2 bg-success text-on-success hover:bg-success/90 transition-colors rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-on-success/20 border-t-on-success rounded-full animate-spin" />}
                {t('techDashboard.resolveTicket')}
              </button>
            </>
          )}

          {ticket.status === 'AWAITING_PAYMENT' && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="px-4 py-2 bg-success text-on-success hover:bg-success/90 transition-colors rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-on-success/20 border-t-on-success rounded-full animate-spin" />}
              {t('techDashboard.resolveTicket')}
            </button>
          )}

          <button
            onClick={() => handleStatusChange('CLOSED')}
            disabled={statusUpdating}
            className="px-4 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors rounded-lg text-label-md font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {t('tickets.filterClosed') === 'Cerrado' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      );
    }
    return null;
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
    <Page className="max-w-7xl">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-h1 text-primary mb-2">
            {ticket.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-semibold border ${statusColor[ticket.status] || 'bg-surface-variant text-on-surface-variant border-outline-variant'}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {t('techDashboard.tableStatus') === 'Estado' ? 'Abierto por' : 'Opened by'} <strong className="font-semibold">{ticket.client_name || 'Client'}</strong> • {new Date(ticket.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {renderActionButtons()}
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
        {/* Left Column: Chat, Description & Timeline */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          
          {/* Description Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm text-on-surface">
            <h3 className="text-h3 text-primary mb-3 font-semibold">
              {t('tickets.modalDescLabel') || 'Description'}
            </h3>
            <div className="bg-surface-container rounded-lg p-4">
              <p className="text-body-md text-on-surface whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Responses / Chat Area */}
          <div className="border border-outline-variant rounded-xl bg-surface-container-lowest flex flex-col shadow-sm text-on-surface">
            <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/40">
              <h2 className="text-h3 font-semibold text-primary">{t('ticketDetail.responsesTitle')}</h2>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto flex flex-col gap-6 bg-surface-container-lowest">
              {responses.length === 0 ? (
                <p className="text-body-md text-on-surface-variant opacity-60 py-4 italic text-center">
                  {t('ticketDetail.noResponses')}
                </p>
              ) : (
                responses.map((resp) => {
                  const isClient = resp.user_role === 'CLIENT';
                  const isTech = resp.user_role === 'TECHNICIAN';
                  const isSelf = resp.user_id === user?.id;

                  if (isSelf) {
                    return (
                      <div key={resp.id} className="flex gap-4 ml-auto flex-row-reverse max-w-[80%]">
                        <div className="w-8 h-8 rounded-full bg-primary border border-outline-variant flex-shrink-0 flex items-center justify-center text-on-primary font-bold text-[12px]">
                          {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-2 flex-row-reverse">
                            <span className="text-label-sm font-bold text-primary">{resp.user_name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-on-primary-container bg-primary-container px-1.5 py-0.5 border border-outline-variant/30 rounded">
                              {resp.user_role}
                            </span>
                            <span className="text-[10px] text-on-surface-variant opacity-75">
                              {new Date(resp.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
                            </span>
                          </div>
                          <div className="p-3.5 bg-primary text-on-primary rounded-xl rounded-tr-none text-body-md whitespace-pre-wrap shadow-sm text-left">
                            {resp.message && <div>{resp.message}</div>}
                            {resp.attachments && resp.attachments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-on-primary/20 space-y-2">
                                {resp.attachments.map((att) => {
                                  const downloadUrl = getAttachmentUrl(att.path);
                                  return (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between p-2 rounded-lg text-body-sm border border-on-primary/10 bg-primary-container/10 text-on-primary"
                                    >
                                      <div
                                        className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                                        onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                      >
                                        {getAttachmentIcon(att.mime_type)}
                                        <span className="truncate max-w-[150px] font-semibold" title={att.filename}>
                                          {att.filename}
                                        </span>
                                        <span className="text-[10px] opacity-80">
                                          ({formatFileSize(att.size_bytes)})
                                        </span>
                                      </div>
                                      <a
                                        href={downloadUrl}
                                        download={att.filename}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 rounded-full hover:bg-primary-container/30 text-on-primary transition-colors cursor-pointer shrink-0"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={resp.id} className="flex gap-4 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant flex-shrink-0 flex items-center justify-center text-primary font-bold text-[12px]">
                        {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-label-sm font-bold text-primary">{resp.user_name}</span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 border rounded ${
                            isClient ? 'bg-secondary/10 text-secondary border-secondary/20' :
                            isTech ? 'bg-warning/10 text-warning border-warning/20' :
                            'bg-surface-container text-on-surface-variant border-outline-variant'
                          }`}>
                            {resp.user_role}
                          </span>
                          <span className="text-[10px] text-on-surface-variant opacity-75">
                            {new Date(resp.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
                          </span>
                        </div>
                        <div className="p-3.5 bg-surface-container border border-outline-variant rounded-xl rounded-tl-none text-body-md text-primary whitespace-pre-wrap">
                          {resp.message && <div>{resp.message}</div>}
                          {resp.attachments && resp.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-2">
                              {resp.attachments.map((att) => {
                                const downloadUrl = getAttachmentUrl(att.path);
                                return (
                                  <div
                                    key={att.id}
                                    className="flex items-center justify-between p-2 rounded-lg text-body-sm border border-outline-variant/40 bg-surface-container-lowest text-on-surface"
                                  >
                                    <div
                                      className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
                                      onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                    >
                                      {getAttachmentIcon(att.mime_type)}
                                      <span className="truncate max-w-[150px] font-semibold" title={att.filename}>
                                        {att.filename}
                                      </span>
                                      <span className="text-[10px] opacity-60">
                                        ({formatFileSize(att.size_bytes)})
                                      </span>
                                    </div>
                                    <a
                                      href={downloadUrl}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded-full hover:bg-primary/10 text-primary transition-colors cursor-pointer shrink-0"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reply Composer Form */}
            <form onSubmit={handleSendResponse} className="p-4 border-t border-outline-variant bg-surface-container-low/30 rounded-b-xl">
              {responseFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 mt-1">
                  {responseFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-3 py-1 bg-surface-container border border-outline-variant/60 rounded-lg text-body-sm text-on-surface">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                      <span className="text-[10px] text-on-surface-variant opacity-60">({formatFileSize(file.size)})</span>
                      <button
                        type="button"
                        onClick={() => setResponseFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded-full hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      >
                        <span className="text-[14px] leading-none font-bold">×</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative border border-outline-variant rounded-xl bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all p-2 shadow-sm">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={t('ticketDetail.placeholderResponse')}
                  rows={3}
                  maxLength={5000}
                  className="w-full p-2 bg-transparent border-none focus:outline-none focus:ring-0 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-none"
                />
                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 mt-2 px-1">
                  <button
                    type="button"
                    onClick={() => document.getElementById('response-file-input')?.click()}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer"
                    title={t('ticketDetail.uploadAttachment')}
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    id="response-file-input"
                    type="file"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) {
                        setResponseFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
                      }
                    }}
                    className="hidden"
                  />
                  
                  <button
                    type="submit"
                    disabled={sendingResponse || (!responseText.trim() && responseFiles.length === 0)}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    {sendingResponse ? (
                      <div className="w-4 h-4 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t('ticketDetail.sendResponse') === 'Enviar Respuesta' ? 'Enviar' : 'Send'}</span>
                        <Send className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {responseFeedback && (
                <div className={`mt-2 text-label-sm font-semibold flex items-center gap-1.5 animate-fade-in ${
                  responseFeedback.isError ? 'text-error' : 'text-success'
                }`}>
                  {responseFeedback.isError ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {responseFeedback.text}
                </div>
              )}
            </form>
          </div>

          {/* Activity Timeline Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm text-on-surface">
            <h2 className="text-h2 text-primary mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              {t('ticketDetail.timelineTitle')}
            </h2>
            {timeline.length === 0 ? (
              <p className="text-body-md text-on-surface-variant py-8 text-center italic">
                {t('ticketDetail.noActivity')}
              </p>
            ) : (
              <div className="flex flex-col gap-6 pl-2">
                {timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-4 relative">
                    {idx < timeline.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-outline-variant" />
                    )}
                    
                    <div className="w-6 h-6 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center flex-shrink-0 z-10">
                      {getTimelineIcon(event.new_status)}
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <span className="text-body-sm text-primary">
                        <span className="font-semibold">{event.changed_by_name || t('ticketDetail.system')}</span>{' '}
                        {t('ticketDetail.changedStatusTo')}{' '}
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                          statusColor[event.new_status] || 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {getStatusLabel(event.new_status)}
                        </span>
                      </span>
                      {event.notes && (
                        <p className="text-body-sm text-on-surface-variant bg-surface-container/50 border border-outline-variant/30 rounded-lg p-2.5 mt-1.5 italic">
                          {event.notes}
                        </p>
                      )}
                      <span className="text-label-sm text-on-surface-variant opacity-60 mt-1">
                        {new Date(event.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Sidebar Panels */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* SLA Timer Countdown */}
          {sla.isApplicable && !sla.isExpired && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-5 shadow-sm text-on-surface flex flex-col gap-2">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
                <h4 className="text-label-md font-bold uppercase tracking-wider">{t('ticketDetail.slaWindow')}</h4>
              </div>
              <p className="text-[12px] text-on-surface-variant opacity-85 leading-relaxed">
                {t('techDashboard.slaDescription') || 'Warranty & Service Outage ticket SLA is active.'}
              </p>
              <div className="text-h1 font-mono text-error font-extrabold tracking-tight mt-1 flex items-center justify-between">
                <span>{t('techDashboard.tableStatus') === 'Estado' ? 'Restante:' : 'Remaining:'}</span>
                <span className="animate-pulse">{sla.formattedTime}</span>
              </div>
            </div>
          )}

          {/* Ticket Information */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm text-on-surface">
            <h3 className="text-nav-parent text-primary font-bold border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-primary" />
              {t('techDashboard.tableStatus') === 'Estado' ? 'Información del Ticket' : 'Ticket Information'}
            </h3>
            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center text-body-md border-b border-outline-variant/10 pb-2.5">
                <span className="text-on-surface-variant opacity-75">{t('ticketDetail.priority')}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-label-sm font-bold border ${
                  ticket.priority === 'CRITICAL' ? 'bg-error-container text-on-error-container border-error animate-pulse' :
                  ticket.priority === 'HIGH' ? 'bg-error/10 text-error border-error/20' :
                  ticket.priority === 'MEDIUM' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-surface-variant text-on-surface-variant border-outline-variant'
                }`}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </div>
              <div className="flex justify-between items-center text-body-md border-b border-outline-variant/10 pb-2.5">
                <span className="text-on-surface-variant opacity-75">{t('tickets.tableCategory')}</span>
                <span className="font-semibold text-primary">{getCategoryLabel(ticket.category)}</span>
              </div>
              <div className="flex justify-between items-center text-body-md">
                <span className="text-on-surface-variant opacity-75">{t('ticketDetail.created')}</span>
                <span className="font-semibold text-primary text-right">
                  {new Date(ticket.created_at).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm text-on-surface">
            <h3 className="text-nav-parent text-primary font-bold border-b border-outline-variant/30 pb-3 mb-4 flex items-center gap-2">
              <UserCheck className="h-4.5 w-4.5 text-primary" />
              {t('techDashboard.tableStatus') === 'Estado' ? 'Asignación' : 'Assignment'}
            </h3>
            
            <div className="flex items-center gap-3 bg-surface-container/50 border border-outline-variant/40 rounded-xl p-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-secondary-container border border-outline-variant flex items-center justify-center text-primary font-bold text-label-md shrink-0">
                {(ticket.assigned_tech_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-body-md font-semibold text-primary truncate">
                  {ticket.assigned_tech_name || t('ticketDetail.unassigned')}
                </span>
                {ticket.assigned_tech_email && (
                  <span className="text-label-sm text-on-surface-variant truncate opacity-85">
                    {ticket.assigned_tech_email}
                  </span>
                )}
              </div>
            </div>

            {canAssign && ticket.client_name && (
              <div className="bg-surface-container-low/40 border border-outline-variant/30 rounded-xl p-3 mb-4 flex flex-col gap-1">
                <span className="text-label-sm text-on-surface-variant font-semibold">
                  {t('techDashboard.tableStatus') === 'Estado' ? 'Cliente' : 'Client'}
                </span>
                <span className="text-body-sm font-medium text-primary truncate">{ticket.client_name}</span>
                <span className="text-label-sm text-on-surface-variant truncate opacity-80">{ticket.client_email}</span>
              </div>
            )}

            {canAssign && (
              <div className="flex flex-col gap-2 mt-4">
                <label className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  {t('ticketDetail.assignTechnician')}
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    disabled={loadingTechs || assigning}
                    className="flex-1 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary disabled:opacity-50 text-on-surface cursor-pointer"
                  >
                    <option value="" disabled>{t('ticketDetail.assignTechnician')}...</option>
                    {technicians.map((tech) => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} {tech.specialty ? `(${tech.specialty})` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAssign(selectedTechId)}
                    disabled={!selectedTechId || selectedTechId === ticket.assigned_tech_id || assigning}
                    className="bg-primary text-on-primary px-3 py-1.5 rounded-lg text-label-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    {assigning ? (
                      <div className="w-3.5 h-3.5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
                    ) : (
                      t('techDashboard.tableStatus') === 'Estado' ? 'Asignar' : 'Assign'
                    )}
                  </button>
                </div>
                {assignMessage && (
                  <Alert variant={assignMessage.isError ? 'destructive' : 'success'} className="mt-2 py-2 px-3 animate-fade-in text-[12px]">
                    <AlertDescription>{assignMessage.text}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* Attachments Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm text-on-surface">
            <div className="border-b border-outline-variant/30 pb-3 mb-4 flex justify-between items-center">
              <h3 className="text-nav-parent text-primary font-bold flex items-center gap-2">
                <Paperclip className="h-4.5 w-4.5 text-primary" />
                {t('ticketDetail.attachmentsTitle')}
              </h3>
              {attachments.length > 0 && (
                <span className="bg-primary/10 text-primary text-label-sm px-2.5 py-0.5 rounded-full font-bold">
                  {attachments.length}
                </span>
              )}
            </div>

            {attachments.length > 0 ? (
              <div className="flex flex-col gap-2.5 mb-4 max-h-[250px] overflow-y-auto pr-1">
                {attachments.map((att) => {
                  const isImage = att.mime_type.startsWith('image/');
                  const downloadUrl = getAttachmentUrl(att.path);
                  return (
                    <div
                      key={att.id}
                      className="flex flex-col justify-between p-2.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-xl transition-all duration-200 group relative overflow-hidden shrink-0"
                    >
                      {isImage && (
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-105 duration-300">
                          <img src={downloadUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div
                        className="flex items-start gap-2.5 relative z-10 cursor-pointer hover:opacity-85 transition-opacity"
                        onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                      >
                        <div className="p-1.5 bg-surface-container-lowest rounded-lg shrink-0 border border-outline-variant/30 flex items-center justify-center">
                          {getAttachmentIcon(att.mime_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-md font-semibold text-on-surface truncate" title={att.filename}>
                            {att.filename}
                          </p>
                          <p className="text-label-sm text-on-surface-variant opacity-60">
                            {formatFileSize(att.size_bytes)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/10 relative z-10">
                        <span className="text-[10px] text-on-surface-variant opacity-50">
                          {new Date(att.uploaded_at).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { day: '2-digit', month: 'short' })}
                        </span>
                        <a
                          href={downloadUrl}
                          download={att.filename}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-full hover:bg-primary/10 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant opacity-65 mb-4 italic text-center py-4 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/40">
                {t('ticketDetail.noAttachments')}
              </p>
            )}

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('sidebar-file-input')?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-outline-variant/60 hover:border-outline-variant hover:bg-surface-container-low/40'
              }`}
            >
              <input
                id="sidebar-file-input"
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <Upload className={`h-6 w-6 mx-auto mb-1 text-on-surface-variant opacity-60 ${uploading ? 'animate-bounce' : ''}`} />
              <p className="text-body-md font-bold text-on-surface mb-0.5">
                {uploading ? t('ticketDetail.uploading') : t('ticketDetail.uploadAttachment')}
              </p>
              <p className="text-[10px] text-on-surface-variant opacity-60">
                {t('techDashboard.tableStatus') === 'Estado' ? 'Arrastra o haz click (Máx 10MB)' : 'Drag & drop or click (Max 10MB)'}
              </p>
            </div>
            {uploadError && (
              <Alert variant="destructive" className="mt-2 py-2 px-3 text-[12px] animate-fade-in">
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}
          </div>

        </div>
      </div>

      {/* Attachment Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade-in" onClick={() => setPreviewFile(null)}>
          <div className="bg-surface-container border border-outline-variant rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant flex items-center justify-between">
              <h3 className="text-h3 text-primary truncate max-w-[80%] font-semibold">{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 text-[24px] leading-none font-bold rounded-full hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-surface-container-lowest min-h-[300px]">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.filename}
                  className="max-w-full max-h-[70vh] object-contain rounded"
                />
              ) : previewFile.mimeType.startsWith('video/') ? (
                <video
                  src={previewFile.url}
                  controls
                  className="max-w-full max-h-[70vh] rounded"
                />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe
                  src={previewFile.url}
                  title={previewFile.filename}
                  className="w-full h-[70vh] border-0 rounded"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                  <p className="text-body-lg font-semibold text-on-surface mb-2">{previewFile.filename}</p>
                  <p className="text-body-md text-on-surface-variant opacity-60 mb-6">{t('ticketDetail.previewNotAvailable')}</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.filename}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-xl text-label-md font-semibold hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('ticketDetail.downloadFile')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
