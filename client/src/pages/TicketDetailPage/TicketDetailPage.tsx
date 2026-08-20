import { useParams, Link } from 'react-router-dom';
import {
  Clock, AlertTriangle, UserCheck, FileText, Image as ImageIcon, Video,
  FileSpreadsheet, Download, Paperclip, CheckCircle2, AlertCircle, Send, Upload,
  Activity, UserPlus, XCircle, X, ArrowLeft
} from 'lucide-react';

import { useTicketDetail } from "@/hooks/useTicketDetail";
import { useSLATimer } from "@/hooks/useSLATimer";
import { useDeferredLoading } from "@/hooks/useDeferredLoading";
import { Page } from '@/components/Page';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const statusColor: Record<string, string> = {
  OPEN: 'bg-primary/10 text-primary border-primary/20',
  IN_PROGRESS: 'bg-secondary text-secondary-foreground border-border',
  AWAITING_PAYMENT: 'bg-secondary text-secondary-foreground border-border animate-pulse',
  RESOLVED: 'bg-primary/10 text-primary border-primary/20',
  RESOLVED_AUTOMATED: 'bg-primary/10 text-primary border-primary/20',
  CLOSED: 'bg-muted text-muted-foreground border-border',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
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
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-primary" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-destructive" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-4 w-4 text-primary" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
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
      return <UserPlus className="h-3.5 w-3.5 text-primary" />;
    case 'CANCELLED':
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    case 'RESOLVED':
    case 'CLOSED':
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-secondary" />;
  }
};

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  
  const {
    t,
    i18n,
    user,
    ticket,
    error,
    responses,
    timeline,
    attachments,
    technicians,
    loading,
    loadingTechs,
    assigning,
    statusUpdating,
    sendingResponse,
    uploading,
    responseText,
    setResponseText,
    responseFiles,
    setResponseFiles,
    responseFeedback,
    selectedTechId,
    setSelectedTechId,
    assignMessage,
    uploadError,
    previewFile,
    setPreviewFile,
    isDragOver,
    setIsDragOver,
    getStatusLabel,
    getPriorityLabel,
    getCategoryLabel,
    handleStatusChange,
    handleAssign,
    handleSendResponse,
    handleFileUpload,
  } = useTicketDetail(id);

  const sla = useSLATimer(ticket);
  const showSkeleton = useDeferredLoading(loading);

  const canAssign = user?.role === 'ADMIN';

  const renderActionButtons = () => {
    if (!ticket) return null;

    // Terminal states: CANCELLED and CLOSED tickets cannot transition anywhere
    if (ticket.status === 'CANCELLED' || ticket.status === 'CLOSED') {
      return null;
    }

    if (user?.role === 'CLIENT') {
      if (ticket.status === 'OPEN') {
        return (
          <button
            onClick={() => handleStatusChange('CANCELLED')}
            disabled={statusUpdating}
            className="px-3 py-1.5 border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-destructive/20 border-t-destructive rounded-full animate-spin" />}
            {t('tickets.cancelTicket')}
          </button>
        );
      }
      return null;
    }

    if (user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') {
      if (ticket.status === 'RESOLVED') {
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('OPEN')}
              disabled={statusUpdating}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />}
              {t('ticketDetail.reopen')}
            </button>
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin" />}
              {t('ticketDetail.closeTicket')}
            </button>
          </div>
        );
      }

      if (ticket.status === 'RESOLVED_AUTOMATED') {
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />}
              {t('techDashboard.resolveTicket')}
            </button>
            <button
              onClick={() => handleStatusChange('CLOSED')}
              disabled={statusUpdating}
              className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin" />}
              {t('ticketDetail.closeTicket')}
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-wrap gap-2">
          {ticket.status === 'OPEN' && (
            <button
              onClick={() => handleStatusChange('IN_PROGRESS')}
              disabled={statusUpdating}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />}
              {t('techDashboard.startWork')}
            </button>
          )}
          
          {ticket.status === 'IN_PROGRESS' && (
            <>
              <button
                onClick={() => handleStatusChange('AWAITING_PAYMENT')}
                disabled={statusUpdating}
                className="px-3 py-1.5 border border-border text-foreground hover:bg-muted transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin" />}
                {t('techDashboard.awaitingPayment')}
              </button>
              <button
                onClick={() => handleStatusChange('RESOLVED')}
                disabled={statusUpdating}
                className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />}
                {t('techDashboard.resolveTicket')}
              </button>
            </>
          )}

          {ticket.status === 'AWAITING_PAYMENT' && (
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={statusUpdating}
              className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />}
              {t('techDashboard.resolveTicket')}
            </button>
          )}

          <button
            onClick={() => handleStatusChange('CLOSED')}
            disabled={statusUpdating}
            className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-muted transition-colors rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {statusUpdating && <div className="w-3.5 h-3.5 border-2 border-border border-t-foreground rounded-full animate-spin" />}
            {t('ticketDetail.closeTicket')}
          </button>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    if (!showSkeleton) return null;
    return (
      <Page>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-in">
          <div className="space-y-2 w-full md:w-1/2">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <Skeleton className="h-5 w-28" />
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6 w-full">
            <div className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="space-y-3 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (!ticket || error) {
    return (
      <Page>
        <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6">
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
              to={user?.role === 'CLIENT' ? '/tickets' : '/tech/tickets'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-lg text-sm font-semibold shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('ticketDetail.backToTickets')}
            </Link>
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
          <h1 className="text-xl font-bold text-foreground mb-1.5 font-heading">
            {ticket.title}
          </h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusColor[ticket.status] || 'bg-muted text-muted-foreground border-border'}`}>
              {getStatusLabel(ticket.status)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {t('ticketDetail.openedBy')} <strong className="font-semibold text-foreground">{ticket.client_name || 'Client'}</strong> • {new Date(ticket.created_at).toLocaleString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                {t('tickets.modalDescLabel') || 'Description'}
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-muted/40 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Responses / Chat */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">{t('ticketDetail.responsesTitle')}</h2>
            </div>
            
            <div className="p-5 max-h-125 overflow-y-auto flex flex-col gap-5">
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 italic text-center">
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
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground shrink-0 flex items-center justify-center font-bold text-[10px] shadow-xs">
                          {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          <div className="flex items-center gap-1.5 flex-row-reverse">
                            <span className="text-xs font-bold text-foreground">{resp.user_name}</span>
                            <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground bg-muted border border-border px-1 rounded">
                              {resp.user_role}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(resp.created_at).toLocaleTimeString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="p-3 bg-primary text-primary-foreground rounded-xl rounded-tr-none text-sm whitespace-pre-wrap shadow-xs text-left">
                            {resp.message && <div>{resp.message}</div>}
                            {resp.attachments && resp.attachments.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-primary-foreground/20 space-y-1.5">
                                {resp.attachments.map((att) => {
                                  const downloadUrl = getAttachmentUrl(att.path);
                                  return (
                                    <div key={att.id} className="flex items-center justify-between p-1.5 rounded-md text-xs border border-primary-foreground/20 bg-primary-foreground/10">
                                      <div
                                        className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                      >
                                        <span>{getAttachmentIcon(att.mime_type)}</span>
                                        <span className="truncate max-w-37.5 font-medium" title={att.filename}>{att.filename}</span>
                                      </div>
                                      <a
                                        href={downloadUrl}
                                        download={att.filename}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 rounded-full hover:bg-primary-foreground/20 transition-colors cursor-pointer shrink-0"
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
                      <div className="w-7 h-7 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground font-bold text-[10px]">
                        {(resp.user_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground">{resp.user_name}</span>
                          <span className={`text-[9px] uppercase font-bold tracking-wider px-1 rounded border ${
                            isClient ? 'bg-primary/10 text-primary border-primary/20' :
                            isTech ? 'bg-secondary text-secondary-foreground border-border' :
                            'bg-muted text-muted-foreground border-border'
                          }`}>
                            {resp.user_role}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(resp.created_at).toLocaleTimeString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="p-3 bg-muted/40 border border-border rounded-xl rounded-tl-none text-sm text-foreground whitespace-pre-wrap">
                          {resp.message && <div>{resp.message}</div>}
                          {resp.attachments && resp.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                              {resp.attachments.map((att) => {
                                const downloadUrl = getAttachmentUrl(att.path);
                                return (
                                  <div key={att.id} className="flex items-center justify-between p-1.5 rounded-md text-xs border border-border bg-card">
                                    <div
                                      className="flex items-center gap-1.5 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                                    >
                                      {getAttachmentIcon(att.mime_type)}
                                      <span className="truncate max-w-37.5 font-medium" title={att.filename}>{att.filename}</span>
                                    </div>
                                    <a
                                      href={downloadUrl}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer shrink-0"
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

            <form onSubmit={handleSendResponse} className="p-3 border-t border-border bg-muted/30">
              {responseFiles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {responseFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-30 font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setResponseFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative border border-border rounded-lg bg-card focus-within:border-ring transition-colors p-2 shadow-xs">
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder={t('ticketDetail.placeholderResponse')}
                  rows={2}
                  maxLength={5000}
                  className="w-full p-1.5 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                />
                <div className="flex items-center justify-between pt-2 mt-1">
                  <button
                    type="button"
                    onClick={() => document.getElementById('response-file-input')?.click()}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
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
                    className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-xs font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {sendingResponse ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{t('ticketDetail.send')}</span>
                        <Send className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
              {responseFeedback && (
                <div className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${
                  responseFeedback.isError ? 'text-destructive' : 'text-primary'
                }`}>
                  {responseFeedback.isError ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {responseFeedback.text}
                </div>
              )}
            </form>
          </div>

          {/* Timeline Card */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">{t('ticketDetail.timelineTitle')}</h2>
            </div>
            <div className="p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">{t('ticketDetail.noActivity')}</p>
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
                          <span className="font-bold text-foreground">{event.changed_by_name || t('ticketDetail.system')}</span>{' '}
                          {t('ticketDetail.changedStatusTo')}{' '}
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            statusColor[event.new_status] || 'bg-muted text-muted-foreground border-border'
                          }`}>
                            {getStatusLabel(event.new_status)}
                          </span>
                        </span>
                        {event.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-2 mt-1.5 italic">
                            {event.notes}
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground mt-1 font-mono">
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
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 shadow-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4 animate-pulse" />
                <h4 className="text-xs font-bold uppercase tracking-wider font-heading">{t('ticketDetail.slaWindow')}</h4>
              </div>
              <p className="text-[11px] text-destructive/80">
                {t('ticketDetail.slaDescription')}
              </p>
              <div className="text-xl font-mono text-destructive font-extrabold flex justify-between items-baseline mt-1">
                <span className="text-xs font-sans font-semibold">{t('ticketDetail.slaRemaining')}</span>
                <span className="animate-pulse">{sla.formattedTime}</span>
              </div>
            </div>
          )}

          {/* Ticket Information */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                {t('ticketDetail.information')}
              </h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">{t('ticketDetail.priority')}</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                  ticket.priority === 'CRITICAL' ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse' :
                  ticket.priority === 'HIGH' ? 'bg-secondary text-secondary-foreground border-border' :
                  ticket.priority === 'MEDIUM' ? 'bg-primary/10 text-primary border-primary/20' :
                  'bg-muted text-muted-foreground border-border'
                }`}>
                  {getPriorityLabel(ticket.priority)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border pt-3">
                <span className="text-muted-foreground">{t('tickets.tableCategory')}</span>
                <span className="font-semibold text-foreground">{getCategoryLabel(ticket.category)}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-border pt-3">
                <span className="text-muted-foreground">{t('ticketDetail.created')}</span>
                <span className="font-semibold text-foreground font-mono">
                  {new Date(ticket.created_at).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                {t('ticketDetail.assignment')}
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-lg p-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {(ticket.assigned_tech_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {ticket.assigned_tech_name || t('ticketDetail.unassigned')}
                  </span>
                  {ticket.assigned_tech_email && (
                    <span className="text-[10px] text-muted-foreground truncate font-mono">
                      {ticket.assigned_tech_email}
                    </span>
                  )}
                </div>
              </div>

              {canAssign && ticket.client_name && (
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    {t('ticketDetail.client')}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground truncate">{ticket.client_name}</span>
                    <span className="text-[10px] text-muted-foreground truncate font-mono">{ticket.client_email}</span>
                  </div>
                </div>
              )}

              {canAssign && (
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                    {t('ticketDetail.assignTechnician')}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedTechId}
                      onChange={(e) => setSelectedTechId(e.target.value)}
                      disabled={loadingTechs || assigning}
                      className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
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
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-xs font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                    >
                      {assigning ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        t('ticketDetail.assignBtn')
                      )}
                    </button>
                  </div>
                  {assignMessage && (
                    <Alert variant={assignMessage.isError ? 'destructive' : 'default'} className="mt-1 py-1.5 px-2 text-[10px]">
                      <AlertDescription>{assignMessage.text}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
                  {t('ticketDetail.attachmentsTitle')}
                </h3>
              </div>
              {attachments.length > 0 && (
                <span className="bg-muted text-muted-foreground text-[9px] px-1.5 py-0.5 rounded font-bold border border-border">
                  {attachments.length}
                </span>
              )}
            </div>
            
            <div className="p-4 flex flex-col gap-3">
              {attachments.length > 0 ? (
                <div className="flex flex-col gap-2 max-h-62.5 overflow-y-auto">
                  {attachments.map((att) => {
                    const downloadUrl = getAttachmentUrl(att.path);
                    return (
                      <div
                        key={att.id}
                        className="flex items-center justify-between p-2 bg-muted/30 hover:bg-muted/60 border border-border rounded-lg transition-colors group"
                      >
                        <div
                          className="flex items-center gap-2 min-w-0 cursor-pointer"
                          onClick={() => setPreviewFile({ filename: att.filename, url: downloadUrl, mimeType: att.mime_type })}
                        >
                          <div className="p-1.5 bg-card rounded border border-border shrink-0">
                            {getAttachmentIcon(att.mime_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate" title={att.filename}>
                              {att.filename}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {formatFileSize(att.size_bytes)}
                            </p>
                          </div>
                        </div>
                        <a
                          href={downloadUrl}
                          download={att.filename}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-2">
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
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/40'
                }`}
              >
                <Input
                  id="sidebar-file-input"
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className={`h-5 w-5 mx-auto mb-1.5 text-muted-foreground ${uploading ? 'animate-bounce text-primary' : ''}`} />
                <p className="text-xs font-bold text-foreground">
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
          <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="text-sm text-foreground truncate max-w-[80%] font-semibold font-heading">{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-75">
              {previewFile.mimeType.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.filename} className="max-w-full max-h-[70vh] object-contain rounded" />
              ) : previewFile.mimeType.startsWith('video/') ? (
                <video src={previewFile.url} controls className="max-w-full max-h-[70vh] rounded" />
              ) : previewFile.mimeType === 'application/pdf' ? (
                <iframe src={previewFile.url} title={previewFile.filename} className="w-full h-[70vh] border-0 rounded" />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-semibold text-foreground mb-1">{previewFile.filename}</p>
                  <p className="text-xs text-muted-foreground mb-4">{t('ticketDetail.previewNotAvailable')}</p>
                  <a
                    href={previewFile.url}
                    download={previewFile.filename}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2"
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
