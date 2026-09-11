import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Send, X, AlertCircle, CheckCircle2, MessageSquare, Lock } from 'lucide-react';
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
} from '@/components/ui/attachment';
import { formatFileSize, getAttachmentIcon } from './ticketUtils';
import { cn } from '@/lib/utils';

export interface TicketChatterComposerProps {
  responseText: string;
  setResponseText: (text: string) => void;
  responseFiles: File[];
  setResponseFiles: React.Dispatch<React.SetStateAction<File[]>>;
  isInternalNote: boolean;
  setIsInternalNote: (val: boolean) => void;
  sendingResponse: boolean;
  responseFeedback: { isError: boolean; text: string } | null;
  onSendResponse: (e: React.FormEvent) => void;
  userRole?: string;
  className?: string;
}

/**
 * Odoo-style dual-mode composer component for Ticket Chatter.
 * Supports public client messages and private technician internal staff notes.
 */
export const TicketChatterComposer: React.FC<TicketChatterComposerProps> = ({
  responseText,
  setResponseText,
  responseFiles,
  setResponseFiles,
  isInternalNote,
  setIsInternalNote,
  sendingResponse,
  responseFeedback,
  onSendResponse,
  userRole,
  className,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClient = userRole === 'CLIENT';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!sendingResponse && (responseText.trim() || responseFiles.length > 0)) {
        onSendResponse(e);
      }
    }
  };

  return (
    <form
      onSubmit={onSendResponse}
      className={cn('p-3 border-t border-border bg-card flex flex-col gap-2 shrink-0', className)}
    >
      {/* Mode Switcher Tabs (Odoo Style: Send Message vs Log Note) */}
      {!isClient && (
        <div className="flex items-center gap-1.5 pb-0.5">
          <Button
            type="button"
            variant={!isInternalNote ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setIsInternalNote(false)}
            className={cn(
              'h-6 text-xs gap-1.5 transition-all font-medium',
              !isInternalNote
                ? 'shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="w-3 h-3" />
            <span>{t('ticketDetail.sendMessageTab')}</span>
          </Button>

          <Button
            type="button"
            variant={isInternalNote ? 'outline' : 'ghost'}
            size="xs"
            onClick={() => setIsInternalNote(true)}
            className={cn(
              'h-6 text-xs gap-1.5 transition-all font-medium',
              isInternalNote
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-xs'
                : 'text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400'
            )}
          >
            <Lock className="w-3 h-3 text-amber-500" />
            <span>{t('ticketDetail.logNoteTab')}</span>
          </Button>
        </div>
      )}

      {/* Attachment Previews */}
      {responseFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {responseFiles.map((file, idx) => (
            <Attachment key={`${file.name}-${idx}`} size="sm" state="idle">
              <AttachmentMedia>{getAttachmentIcon(file.type)}</AttachmentMedia>
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
                  <X className="w-3 h-3" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </div>
      )}

      {/* Textarea Box with dynamic border tint for Internal Notes */}
      <div
        className={cn(
          'relative border rounded-lg transition-colors p-2 shadow-xs',
          isInternalNote
            ? 'bg-amber-500/5 border-amber-500/30 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20'
            : 'bg-muted/20 border-border focus-within:border-ring focus-within:bg-card'
        )}
      >
        <textarea
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInternalNote
              ? t('ticketDetail.placeholderInternalNote')
              : t('ticketDetail.placeholderMessage')
          }
          rows={3}
          maxLength={5000}
          className="w-full p-1 bg-transparent border-none focus:outline-none focus:ring-0 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground resize-none leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
              aria-label={t('ticketDetail.uploadAttachment')}
              title={t('ticketDetail.uploadAttachment')}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  setResponseFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                }
              }}
              className="hidden"
            />
            <span className="hidden sm:inline text-[10px] text-muted-foreground/70 font-mono select-none">
              {t('ticketDetail.ctrlEnterHint')}
            </span>
          </div>

          <Button
            type="submit"
            disabled={sendingResponse || (!responseText.trim() && responseFiles.length === 0)}
            size="xs"
            className={cn(
              'h-7 px-3 font-semibold gap-1.5 text-xs shadow-xs transition-all',
              isInternalNote
                ? 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {sendingResponse ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isInternalNote
                    ? t('ticketDetail.sendInternalNote')
                    : t('ticketDetail.send')}
                </span>
                {isInternalNote ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {responseFeedback && (
        <div
          className={cn(
            'text-xs font-semibold flex items-center gap-1.5 animate-in fade-in-0 duration-150',
            responseFeedback.isError ? 'text-destructive' : 'text-primary'
          )}
        >
          {responseFeedback.isError ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{responseFeedback.text}</span>
        </div>
      )}
    </form>
  );
};
