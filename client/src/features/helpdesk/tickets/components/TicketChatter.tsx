import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Lock,
  Monitor,
  MessageSquare,
  PanelRightClose,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment';
import type { TicketResponseItem as TicketResponse } from '../api/ticketService';
import type { AuthUser } from '@/store/useAuthStore';
import { getAttachmentIcon, getAttachmentUrl } from './ticketUtils';
import type { PreviewFileState } from './FilePreviewModal';
import { TicketChatterComposer } from './TicketChatterComposer';
import { cn } from '@/lib/utils';

export interface TicketChatterProps {
  responses: TicketResponse[];
  user: AuthUser | null;
  responseText: string;
  setResponseText: (text: string) => void;
  responseFiles: File[];
  setResponseFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isInternalNote: boolean;
  setIsInternalNote: (val: boolean) => void;
  responseFeedback: { isError: boolean; text: string } | null;
  sendingResponse: boolean;
  onSendResponse: (e: React.FormEvent) => void;
  onPreviewFile: (preview: PreviewFileState) => void;
  onCollapse?: () => void;
  isCollapsible?: boolean;
  headerActions?: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

/**
 * Enterprise Odoo-style Chatter component for Ticket Details.
 * Displays public messages, internal staff notes, attachments, and real-time replies.
 */
export const TicketChatter: React.FC<TicketChatterProps> = ({
  responses,
  user,
  responseText,
  setResponseText,
  responseFiles,
  setResponseFiles,
  isInternalNote,
  setIsInternalNote,
  responseFeedback,
  sendingResponse,
  onSendResponse,
  onPreviewFile,
  onCollapse,
  isCollapsible = false,
  headerActions,
  className,
  headerClassName,
}) => {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on responses update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [responses.length]);

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col h-full min-h-0',
        className
      )}
    >
      {/* Chatter Header */}
      <div
        className={cn(
          'px-4 py-2.5 border-b border-border bg-muted/40 flex items-center justify-between shrink-0',
          headerClassName
        )}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
            {t('ticketDetail.chatterTitle')}
          </h2>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-mono font-bold">
            {responses.length}
          </Badge>
        </div>

        {headerActions ? (
          <div className="flex items-center gap-1">{headerActions}</div>
        ) : isCollapsible && onCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onCollapse}
            className="text-muted-foreground hover:text-foreground"
            title={t('ticketDetail.collapseChatter')}
            aria-label={t('ticketDetail.collapseChatter')}
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        data-chatter-scroll="true"
        className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-4 scroll-smooth"
      >
        {responses.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto py-12 text-center text-muted-foreground">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs italic">{t('ticketDetail.noResponses')}</p>
          </div>
        ) : (
          responses.map((resp) => {
            const isInternal = Boolean(resp.is_internal || resp.isInternal);
            const isAgentAuthored = Boolean(resp.author_name || resp.authorName);
            const isClient = resp.user_role === 'CLIENT' || isAgentAuthored;
            const isSelf = resp.user_id === user?.id && !isAgentAuthored;
            const displayName = resp.author_name || resp.authorName || resp.user_name || 'User';

            // Internal Staff Note View (Odoo Log Note)
            if (isInternal) {
              return (
                <div
                  key={resp.id}
                  className="flex flex-col gap-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-2xs animate-in fade-in-0"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="font-bold">{displayName}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        {t('ticketDetail.internalNoteBadge')}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-mono">
                      {new Date(resp.created_at).toLocaleTimeString(
                        i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                        { hour: 'numeric', minute: '2-digit' }
                      )}
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed mt-1">
                    {resp.message}
                  </div>

                  {resp.attachments && resp.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-500/20 space-y-1.5">
                      {resp.attachments.map((att) => {
                        const downloadUrl = getAttachmentUrl(att.path);
                        return (
                          <Attachment key={att.id} size="sm" className="w-full bg-amber-500/5">
                            <AttachmentMedia>{getAttachmentIcon(att.mime_type)}</AttachmentMedia>
                            <AttachmentContent>
                              <AttachmentTitle>{att.filename}</AttachmentTitle>
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
                                  onPreviewFile({
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
                  )}
                </div>
              );
            }

            // Self message (Right aligned, Primary bubble)
            if (isSelf) {
              return (
                <div key={resp.id} className="flex gap-2.5 ml-auto flex-row-reverse max-w-[85%]">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground shrink-0 flex items-center justify-center font-bold text-[9px] shadow-xs">
                    {displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span className="text-xs font-semibold text-foreground">{displayName}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground bg-muted border border-border px-1 rounded">
                        {resp.user_role}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(resp.created_at).toLocaleTimeString(
                          i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                          { hour: 'numeric', minute: '2-digit' }
                        )}
                      </span>
                    </div>
                    <div className="p-3 bg-primary text-primary-foreground rounded-xl rounded-tr-none text-xs sm:text-sm whitespace-pre-wrap shadow-xs text-left leading-relaxed">
                      {resp.message && <div>{resp.message}</div>}
                      {resp.attachments && resp.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-primary-foreground/20 space-y-1.5">
                          {resp.attachments.map((att) => {
                            const downloadUrl = getAttachmentUrl(att.path);
                            return (
                              <Attachment key={att.id} size="sm" className="w-full text-foreground">
                                <AttachmentMedia>{getAttachmentIcon(att.mime_type)}</AttachmentMedia>
                                <AttachmentContent>
                                  <AttachmentTitle className="text-xs">{att.filename}</AttachmentTitle>
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
                                      onPreviewFile({
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
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Counterparty message (Left aligned, Muted bubble)
            return (
              <div key={resp.id} className="flex gap-2.5 mr-auto max-w-[85%]">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-bold text-[9px] shadow-xs',
                    isAgentAuthored
                      ? 'bg-amber-500 text-white'
                      : isClient
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-foreground border border-border'
                  )}
                >
                  {isAgentAuthored ? (
                    <Monitor className="w-3 h-3" />
                  ) : (
                    displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <div className="flex flex-col gap-1 items-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{displayName}</span>
                    {isAgentAuthored ? (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-1 rounded flex items-center gap-0.5">
                        <Monitor className="w-2.5 h-2.5" />
                        {t('ticketDetail.endpointBadge')}
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground bg-muted border border-border px-1 rounded">
                        {resp.user_role}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(resp.created_at).toLocaleTimeString(
                        i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                        { hour: 'numeric', minute: '2-digit' }
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-muted/40 border border-border rounded-xl rounded-tl-none text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {resp.message && <div>{resp.message}</div>}
                    {resp.attachments && resp.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                        {resp.attachments.map((att) => {
                          const downloadUrl = getAttachmentUrl(att.path);
                          return (
                            <Attachment key={att.id} size="sm" className="w-full">
                              <AttachmentMedia>{getAttachmentIcon(att.mime_type)}</AttachmentMedia>
                              <AttachmentContent>
                                <AttachmentTitle className="text-xs">{att.filename}</AttachmentTitle>
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
                                    onPreviewFile({
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
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Embedded Dual-Mode Composer */}
      <TicketChatterComposer
        responseText={responseText}
        setResponseText={setResponseText}
        responseFiles={responseFiles}
        setResponseFiles={setResponseFiles}
        isInternalNote={isInternalNote}
        setIsInternalNote={setIsInternalNote}
        sendingResponse={sendingResponse}
        responseFeedback={responseFeedback}
        onSendResponse={onSendResponse}
        userRole={user?.role}
      />
    </div>
  );
};
