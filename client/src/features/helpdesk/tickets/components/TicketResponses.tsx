import React from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Send, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import type { TicketResponseItem as TicketResponse } from '../api/ticketService';
import type { AuthUser } from '@/store/useAuthStore';
import { formatFileSize, getAttachmentIcon, getAttachmentUrl } from './ticketUtils';
import type { PreviewFileState } from './FilePreviewModal';

export interface TicketResponsesProps {
  responses: TicketResponse[];
  user: AuthUser | null;
  responseText: string;
  setResponseText: (text: string) => void;
  responseFiles: File[];
  setResponseFiles: React.Dispatch<React.SetStateAction<File[]>>;
  responseFeedback: { isError: boolean; text: string } | null;
  sendingResponse: boolean;
  onSendResponse: (e: React.FormEvent) => void;
  onPreviewFile: (preview: PreviewFileState) => void;
}

export const TicketResponses: React.FC<TicketResponsesProps> = ({
  responses,
  user,
  responseText,
  setResponseText,
  responseFiles,
  setResponseFiles,
  responseFeedback,
  sendingResponse,
  onSendResponse,
  onPreviewFile,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-border bg-muted/30">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider font-heading">
          {t('ticketDetail.responsesTitle')}
        </h2>
      </div>

      <div className="p-5 max-h-125 overflow-y-auto flex flex-col gap-5">
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 italic text-center">
            {t('ticketDetail.noResponses')}
          </p>
        ) : (
          responses.map((resp) => {
            const isAgentAuthored = Boolean(resp.author_name || resp.authorName);
            const isClient = resp.user_role === 'CLIENT' || isAgentAuthored;
            const isTech = resp.user_role === 'TECHNICIAN' && !isAgentAuthored;
            const isSelf = resp.user_id === user?.id && !isAgentAuthored;
            const displayName = resp.author_name || resp.authorName || resp.user_name || 'User';

            if (isSelf) {
              return (
                <div key={resp.id} className="flex gap-3 ml-auto flex-row-reverse max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground shrink-0 flex items-center justify-center font-bold text-[10px] shadow-xs">
                    {displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex items-center gap-1.5 flex-row-reverse">
                      <span className="text-xs font-bold text-foreground">{displayName}</span>
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
                    <div className="p-3 bg-primary text-primary-foreground rounded-xl rounded-tr-none text-sm whitespace-pre-wrap shadow-xs text-left">
                      {resp.message && <div>{resp.message}</div>}
                      {resp.attachments && resp.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-primary-foreground/20 space-y-1.5">
                          {resp.attachments.map((att) => {
                            const downloadUrl = getAttachmentUrl(att.path);
                            return (
                              <Attachment
                                key={att.id}
                                size="sm"
                                className="w-full border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground has-[>a,>button]:hover:bg-primary-foreground/20"
                              >
                                <AttachmentMedia className="bg-primary-foreground/10 text-primary-foreground">
                                  {getAttachmentIcon(att.mime_type)}
                                </AttachmentMedia>
                                <AttachmentContent>
                                  <AttachmentTitle>{att.filename}</AttachmentTitle>
                                </AttachmentContent>
                                <AttachmentActions>
                                  <AttachmentAction
                                    asChild
                                    aria-label={t('ticketDetail.downloadFile')}
                                    className="hover:text-primary-foreground"
                                  >
                                    <a
                                      href={downloadUrl}
                                      download={att.filename}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Download />
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

            return (
              <div key={resp.id} className="flex gap-3 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-muted-foreground font-bold text-[10px]">
                  {displayName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground">{displayName}</span>
                    {isAgentAuthored && (
                      <span className="text-[9px] font-mono font-medium px-1 rounded border bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-500/20">
                        {t('ticketDetail.endpointBadge')}
                      </span>
                    )}
                    <span
                      className={`text-[9px] uppercase font-bold tracking-wider px-1 rounded border ${
                        isClient
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : isTech
                          ? 'bg-secondary text-secondary-foreground border-border'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {isAgentAuthored ? 'CLIENT' : resp.user_role}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(resp.created_at).toLocaleTimeString(
                        i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                        { hour: 'numeric', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                  <div className="p-3 bg-muted/40 border border-border rounded-xl rounded-tl-none text-sm text-foreground whitespace-pre-wrap">
                    {resp.message && <div>{resp.message}</div>}
                    {resp.attachments && resp.attachments.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                        {resp.attachments.map((att) => {
                          const downloadUrl = getAttachmentUrl(att.path);
                          return (
                            <Attachment key={att.id} size="sm" className="w-full">
                              <AttachmentMedia>
                                {getAttachmentIcon(att.mime_type)}
                              </AttachmentMedia>
                              <AttachmentContent>
                                <AttachmentTitle>{att.filename}</AttachmentTitle>
                              </AttachmentContent>
                              <AttachmentActions>
                                <AttachmentAction
                                  asChild
                                  aria-label={t('ticketDetail.downloadFile')}
                                >
                                  <a
                                    href={downloadUrl}
                                    download={att.filename}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    <Download />
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

      <form onSubmit={onSendResponse} className="p-3 border-t border-border bg-muted/30">
        {responseFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {responseFiles.map((file, idx) => (
              <Attachment key={`${file.name}-${idx}`} size="sm" state="idle">
                <AttachmentMedia>
                  {getAttachmentIcon(file.type)}
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{file.name}</AttachmentTitle>
                  <AttachmentDescription>{formatFileSize(file.size)}</AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label={t('ticketDetail.removeAttachment')}
                    onClick={() => setResponseFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
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
              aria-label={t('ticketDetail.uploadAttachment')}
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <Input
              id="response-file-input"
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setResponseFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                }
              }}
              className="hidden"
            />
            <Button
              type="submit"
              disabled={sendingResponse || (!responseText.trim() && responseFiles.length === 0)}
              size="sm"
              className="font-semibold gap-1.5"
            >
              {sendingResponse ? (
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('ticketDetail.send')}</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
        {responseFeedback && (
          <div
            className={`mt-2 text-xs font-semibold flex items-center gap-1.5 ${
              responseFeedback.isError ? 'text-destructive' : 'text-primary'
            }`}
          >
            {responseFeedback.isError ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            {responseFeedback.text}
          </div>
        )}
      </form>
    </div>
  );
};
