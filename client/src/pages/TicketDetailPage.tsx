import { useParams } from 'react-router-dom';
import {
  Clock, AlertTriangle, UserCheck, FileText, Image as ImageIcon, Video,
  FileSpreadsheet, Download, Paperclip, CheckCircle2, AlertCircle, Send, Upload,
  Activity, UserPlus, XCircle, X
} from 'lucide-react';

import { useTicketDetail } from '../hooks/useTicketDetail';
import { useSLATimer } from '../hooks/useSLATimer';
import { Page } from '@/components/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const statusColor: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  AWAITING_PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  CLOSED: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
};

// ---- Helpers ----
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />;
  return <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />;
};

const getAttachmentUrl = (filePath: string) => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) {
    return '/' + normalized;
  }
  return normalized;
};

const getTimelineIcon = (status: string) => {
  switch (status) {
    case 'OPEN':
      return <UserPlus className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />;
    case 'CANCELLED':
      return <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />;
    case 'RESOLVED':
    case 'CLOSED':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />;
  }
};

// ---- Main Component ----

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    t,
    i18n,
    user,
    ticket,
    timeline,
    loading,
    technicians,
    loadingTechs,
    assigning,
    assignMessage,
    selectedTechId,
    setSelectedTechId,
    attachments,
    uploading,
    uploadError,
    isDragOver,
    setIsDragOver,
    responses,
    responseText,
    setResponseText,
    responseFiles,
    setResponseFiles,
    sendingResponse,
    responseFeedback,
    previewFile,
    setPreviewFile,
    statusUpdating,
    canAssign,
    handleSendResponse,
    handleAssign,
    handleStatusChange,
    handleFileUpload,
  } = useTicketDetail(id);

  const sla = useSLATimer(
    ticket?.created_at || new Date().toISOString(),
    ticket?.category || '',
  );

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

  const renderActionButtons = () => {
    if (!ticket) return null;
    const isInactive = ['CLOSED', 'CANCELLED', 'RESOLVED'].includes(ticket.status);
    
    if (isInactive) {
      return (
        <button
          onClick={() => handleStatusChange('OPEN')}
          disabled={statusUpdating}
          className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
        >
          {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />}
          {t('techDashboard.startWork') === 'Iniciar Trabajo' ? 'Reabrir' : 'Reopen'}
        </button>
      );
    }

    if (user?.role === 'CLIENT') {
      return (
        <button
          onClick={() => handleStatusChange('CANCELLED')}
          disabled={statusUpdating}
          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
        >
          {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-red-600/20 border-t-red-600 rounded-full animate-spin" />}
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
              className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />}
              {t('techDashboard.startWork')}
            </button>
          )}
          
          {ticket.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleStatusChange('AWAITING_PAYMENT')}
                disabled={statusUpdating}
                className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-zinc-700/20 border-t-zinc-700 rounded-full animate-spin" />}
                {t('techDashboard.awaitingPayment')}
              </button>
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={statusUpdating}
                className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                {t('techDashboard.resolveTicket')}
              </button>
            </>
          )}

          {ticket.status === 'AWAITING_PAYMENT' && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
              {t('techDashboard.resolveTicket')}
            </button>
          )}

          <button
            onClick={() => handleStatusChange('CLOSED')}
            disabled={statusUpdating}
            className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {t('tickets.filterClosed') === 'Cerrado' ? 'Cerrar' : 'Close'}
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading || !ticket) {
    return (
      <Page>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="space-y-2 w-full md:w-1/2">
            <Skeleton className="h-8 w-3/4 bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <Skeleton className="h-5 w-28 bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-2">
                <Skeleton className="h-3 w-full bg-zinc-200 dark:bg-zinc-700" />
                <Skeleton className="h-3 w-5/6 bg-zinc-200 dark:bg-zinc-700" />
                <Skeleton className="h-3 w-2/3 bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <Skeleton className="h-5 w-40 bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-full bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
            {ticket.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColor[ticket.status] || 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              {t('techDashboard.tableStatus') === 'Estado' ? 'Abierto por' : 'Opened by'} <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{ticket.client_name || 'Client'}</strong> • {new Date(ticket.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
        </div>
        {renderActionButtons()}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
        
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          
          {/* Description Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {t('tickets.modalDescLabel') || 'Description'}
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Responses / Chat */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{t('ticketDetail.responsesTitle')}</h2>
            </div>
            
            <div className="p-5 max-h-[500px] overflow-y-auto flex flex-col gap-5">
              {responses.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 italic text-center">
                  {t('ticketDetail.noResponses')}
                </p>
              ) : (
                responses.map((resp) => {
                  const isClient = resp.user_role === 'CLIENT';
                  const isTech = resp.user_role === 'TECHNICIAN';
                  const isSelf = resp.user_id === user?.id;

                  if (isSelf) {
                    return (
                      <div key={resp.id} className="flex gap-3 ml-auto flex-row-reverse max-w-[85%]">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shrink-0 flex items-center justify-center font-bold text-[10px] shadow-sm">
                          {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{resp.user_name}</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-600 bg-zinc-100 border border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 px-1 rounded">
                              {resp.user_role}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              {new Date(resp.created_at).toLocaleTimeString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="p-3 bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl rounded-tr-none text-sm whitespace-pre-wrap shadow-sm text-left">
                            {resp.message && <div>{resp.message}</div>}
                            {resp.attachments && resp.attachments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-zinc-700 dark:border-zinc-300 space-y-1.5">
                                {resp.attachments.map((att) => {
                                  const downloadUrl = getAttachmentUrl(att.path);
                                  return (
                                    <div key={att.id} className="flex items-center justify-between p-1.5 rounded-md text-xs border border-zinc-700/50 bg-zinc-800/50 dark:border-zinc-300/50 dark:bg-zinc-200/50">
                                      <div
                                        className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                      >
                                        <span className="text-zinc-300 dark:text-zinc-600">{getAttachmentIcon(att.mime_type)}</span>
                                        <span className="truncate max-w-[150px] font-medium" title={att.filename}>{att.filename}</span>
                                      </div>
                                      <a
                                        href={downloadUrl}
                                        download={att.filename}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 rounded-full hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors cursor-pointer shrink-0"
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
                    <div key={resp.id} className="flex gap-3 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-bold text-[10px]">
                        {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{resp.user_name}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1 rounded border ${
                            isClient ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                            isTech ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                            'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          }`}>
                            {resp.user_role}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            {new Date(resp.created_at).toLocaleTimeString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl rounded-tl-none text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
                          {resp.message && <div>{resp.message}</div>}
                          {resp.attachments && resp.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 space-y-1.5">
                              {resp.attachments.map((att) => {
                                const downloadUrl = getAttachmentUrl(att.path);
                                return (
                                  <div key={att.id} className="flex items-center justify-between p-1.5 rounded-md text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                                    <div
                                      className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                    >
                                      {getAttachmentIcon(att.mime_type)}
                                      <span className="truncate max-w-[150px] font-medium" title={att.filename}>{att.filename}</span>
                                    </div>
                                    <a
                                      href={downloadUrl}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer shrink-0"
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

            <form onSubmit={handleSendResponse} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              {responseFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {responseFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-xs text-zinc-700 dark:text-zinc-300">
                      <Paperclip className="h-3 w-3 text-zinc-400" />
                      <span className="truncate max-w-[120px] font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setResponseFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors p-2 shadow-sm">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={t('ticketDetail.placeholderResponse')}
                  rows={2}
                  maxLength={5000}
                  className="w-full p-1.5 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 resize-none"
                />
                <div className="flex items-center justify-between pt-2 mt-1">
                  <button
                    type="button"
                    onClick={() => document.getElementById('response-file-input')?.click()}
                    className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <Input
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
                    className="px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {sendingResponse ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t('ticketDetail.sendResponse') === 'Enviar Respuesta' ? 'Enviar' : 'Send'}</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              {responseFeedback && (
                <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${
                  responseFeedback.isError ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {responseFeedback.isError ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {responseFeedback.text}
                </div>
              )}
            </form>
          </div>

          {/* Timeline Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{t('ticketDetail.timelineTitle')}</h2>
            </div>
            <div className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-4">{t('ticketDetail.noActivity')}</p>
              ) : (
                <div className="flex flex-col gap-5">
                  {timeline.map((event, idx) => (
                    <div key={event.id} className="flex gap-3 relative">
                      {idx < timeline.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-20px] w-px bg-zinc-200 dark:bg-zinc-800" />
                      )}
                      <div className="w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 z-10">
                        {getTimelineIcon(event.new_status)}
                      </div>
                      <div className="flex flex-col min-w-0 pt-0.5">
                        <span className="text-xs text-zinc-700 dark:text-zinc-300">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{event.changed_by_name || t('ticketDetail.system')}</span>{' '}
                          {t('ticketDetail.changedStatusTo')}{' '}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            statusColor[event.new_status] || 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          }`}>
                            {getStatusLabel(event.new_status)}
                          </span>
                        </span>
                        {event.notes && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/80 rounded-md p-2 mt-1.5 italic">
                            {event.notes}
                          </p>
                        )}
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-mono">
                          {new Date(event.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          
          {/* SLA Timer */}
          {sla.isApplicable && !sla.isExpired && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-4 shadow-sm flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider">{t('ticketDetail.slaWindow')}</h4>
              </div>
              <p className="text-[11px] text-red-700/80 dark:text-red-400/80">
                {t('techDashboard.slaDescription') || 'Warranty & Service Outage ticket SLA is active.'}
              </p>
              <div className="text-xl font-mono text-red-600 dark:text-red-400 font-extrabold flex justify-between items-baseline mt-1">
                <span className="text-xs font-sans font-semibold">{t('techDashboard.tableStatus') === 'Estado' ? 'Restante:' : 'Remaining:'}</span>
                <span className="animate-pulse">{sla.formattedTime}</span>
              </div>
            </div>
          )}

          {/* Ticket Information */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {t('techDashboard.tableStatus') === 'Estado' ? 'Información' : 'Information'}
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{t('ticketDetail.priority')}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                  ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 animate-pulse' :
                  ticket.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                  ticket.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
                  'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                }`}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <span className="text-zinc-500 dark:text-zinc-400">{t('tickets.tableCategory')}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{getCategoryLabel(ticket.category)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <span className="text-zinc-500 dark:text-zinc-400">{t('ticketDetail.created')}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                  {new Date(ticket.created_at).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                {t('techDashboard.tableStatus') === 'Estado' ? 'Asignación' : 'Assignment'}
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {(ticket.assigned_tech_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {ticket.assigned_tech_name || t('ticketDetail.unassigned')}
                  </span>
                  {ticket.assigned_tech_email && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">
                      {ticket.assigned_tech_email}
                    </span>
                  )}
                </div>
              </div>

              {canAssign && ticket.client_name && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                    {t('techDashboard.tableStatus') === 'Estado' ? 'Cliente' : 'Client'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ticket.client_name}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">{ticket.client_email}</span>
                  </div>
                </div>
              )}

              {canAssign && (
                <div className="flex flex-col gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                    {t('ticketDetail.assignTechnician')}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTechId}
                      onChange={(e) => setSelectedTechId(e.target.value)}
                      disabled={loadingTechs || assigning}
                      className="flex-1 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 disabled:opacity-50 cursor-pointer"
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
                      className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-3 py-1.5 rounded-md text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {assigning ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                      ) : (
                        t('techDashboard.tableStatus') === 'Estado' ? 'Asignar' : 'Assign'
                      )}
                    </button>
                  </div>
                  {assignMessage && (
                    <Alert variant={assignMessage.isError ? 'destructive' : 'success'} className="mt-1 py-1.5 px-2 text-[10px]">
                      <AlertDescription>{assignMessage.text}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                  {t('ticketDetail.attachmentsTitle')}
                </h3>
              </div>
              {attachments.length > 0 && (
                <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold">
                  {attachments.length}
                </span>
              )}
            </div>
            
            <div className="p-4 flex flex-col gap-3">
              {attachments.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                  {attachments.map((att) => {
                    const downloadUrl = getAttachmentUrl(att.path);
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 rounded-lg transition-colors group"
                      >
                        <div
                          className="flex items-center gap-2 min-w-0 cursor-pointer"
                          onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                        >
                          <div className="p-1.5 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
                            {getAttachmentIcon(att.mime_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={att.filename}>
                              {att.filename}
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                              {formatFileSize(att.size_bytes)}
                            </p>
                          </div>
                        </div>
                        <a
                          href={downloadUrl}
                          download={att.filename}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 dark:hover:text-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic text-center py-2">
                  {t('ticketDetail.noAttachments')}
                </p>
              )}

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFileUpload(e.dataTransfer.files); }}
                onClick={() => document.getElementById('sidebar-file-input')?.click()}
                className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Input
                  id="sidebar-file-input"
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className={`h-5 w-5 mx-auto mb-1.5 text-zinc-400 ${uploading ? 'animate-bounce text-zinc-900 dark:text-zinc-100' : ''}`} />
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {uploading ? t('ticketDetail.uploading') : t('ticketDetail.uploadAttachment')}
                </p>
              </div>
              {uploadError && (
                <Alert variant="destructive" className="mt-1 py-1.5 px-2 text-[10px]">
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in" onClick={() => setPreviewFile(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/50">
              <h3 className="text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[80%] font-semibold">{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-[300px]">
              {previewFile.mimeType.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.filename} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : previewFile.mimeType.startsWith('video/') ? (
                <video src={previewFile.url} controls className="max-w-full max-h-[70vh] rounded" />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe src={previewFile.url} title={previewFile.filename} className="w-full h-[70vh] border-0 rounded" />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-zinc-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{previewFile.filename}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">{t('ticketDetail.previewNotAvailable')}</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.filename}
                    className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 rounded-lg text-xs font-semibold hover:opacity-90 inline-flex items-center gap-2"
                  >
                    <Download className="h-3.5 w-3.5" />
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

export default TicketDetailPage;
