import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Clock,
  UserCheck,
  Paperclip,
  Upload,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Ticket, TicketAttachment } from '@/services/ticketService';
import type { useSLATimer } from '@/hooks/useSLATimer';
import { formatFileSize, getAttachmentIcon, getAttachmentUrl } from './ticketUtils';
import type { PreviewFileState } from './FilePreviewModal';

export interface TechnicianOption {
  id: string;
  name: string;
  specialty?: string | null;
}

export interface TicketSidebarProps {
  ticket: Ticket;
  sla: ReturnType<typeof useSLATimer>;
  canAssign: boolean;
  technicians: TechnicianOption[];
  loadingTechs: boolean;
  selectedTechId: string;
  setSelectedTechId: (id: string) => void;
  assigning: boolean;
  assignMessage: { isError: boolean; text: string } | null;
  onAssign: (techId: string) => void;
  attachments: TicketAttachment[];
  uploading: boolean;
  uploadError: string | null;
  isDragOver: boolean;
  setIsDragOver: (isOver: boolean) => void;
  onFileUpload: (files: FileList | null) => void;
  onPreviewFile: (preview: PreviewFileState) => void;
  getPriorityLabel: (priority: string) => string;
  getCategoryLabel: (category: string) => string;
}

export const TicketSidebar: React.FC<TicketSidebarProps> = ({
  ticket,
  sla,
  canAssign,
  technicians,
  loadingTechs,
  selectedTechId,
  setSelectedTechId,
  assigning,
  assignMessage,
  onAssign,
  attachments,
  uploading,
  uploadError,
  isDragOver,
  setIsDragOver,
  onFileUpload,
  onPreviewFile,
  getPriorityLabel,
  getCategoryLabel,
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* SLA Timer */}
      {sla.isApplicable && !sla.isExpired && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertTriangle className="h-4 w-4 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider font-heading">
              {t('ticketDetail.slaWindow')}
            </h4>
          </div>
          <p className="text-[11px] text-destructive/80">
            {t('ticketDetail.slaDescription')}
          </p>
          <div className="text-xl font-mono text-destructive font-extrabold flex justify-between items-baseline mt-1">
            <span className="text-xs font-sans font-semibold">
              {t('ticketDetail.slaRemaining')}
            </span>
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
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                ticket.priority === 'CRITICAL'
                  ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                  : ticket.priority === 'HIGH'
                  ? 'bg-secondary text-secondary-foreground border-border'
                  : ticket.priority === 'MEDIUM'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
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
              {new Date(ticket.created_at).toLocaleDateString(
                i18n.language === 'es_DO' ? 'es-DO' : 'en-US',
                { year: 'numeric', month: 'short', day: 'numeric' }
              )}
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
              {(ticket.assigned_tech_name || 'U')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
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
                <span className="text-xs font-semibold text-foreground truncate">
                  {ticket.client_name}
                </span>
                <span className="text-[10px] text-muted-foreground truncate font-mono">
                  {ticket.client_email}
                </span>
              </div>
            </div>
          )}

          {canAssign && (
            <div className="flex flex-col gap-2 pt-3 border-t border-border">
              <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">
                {t('ticketDetail.assignTechnician')}
              </label>
              <div className="flex gap-2">
                <Select
                  value={selectedTechId || undefined}
                  onValueChange={setSelectedTechId}
                  disabled={loadingTechs || assigning}
                >
                  <SelectTrigger size="lg" className="flex-1 text-xs bg-background border-input">
                    <SelectValue placeholder={`${t('ticketDetail.assignTechnician')}...`} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {technicians.map((tech) => (
                      <SelectItem key={tech.id} value={tech.id} className="text-xs">
                        {tech.name} {tech.specialty ? `(${tech.specialty})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => onAssign(selectedTechId)}
                  disabled={!selectedTechId || selectedTechId === ticket.assigned_tech_id || assigning}
                  size="sm"
                  className="shrink-0 font-semibold"
                >
                  {assigning ? (
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    t('ticketDetail.assignBtn')
                  )}
                </Button>
              </div>
              {assignMessage && (
                <Alert
                  variant={assignMessage.isError ? 'destructive' : 'default'}
                  className="mt-1 py-1.5 px-2 text-[10px]"
                >
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
                  <Attachment key={att.id} className="w-full">
                    <AttachmentMedia>
                      {getAttachmentIcon(att.mime_type)}
                    </AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{att.filename}</AttachmentTitle>
                      <AttachmentDescription>
                        {formatFileSize(att.size_bytes)}
                      </AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      <AttachmentAction asChild aria-label={t('ticketDetail.downloadFile')}>
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
                            mimeType: att.mime_type,
                          })
                        }
                        aria-label={`${t('ticketDetail.previewFile')}: ${att.filename}`}
                      />
                    </AttachmentTrigger>
                  </Attachment>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              {t('ticketDetail.noAttachments')}
            </p>
          )}

          {uploading && (
            <Attachment state="uploading" className="w-full">
              <AttachmentMedia>
                <Upload />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{t('ticketDetail.uploading')}</AttachmentTitle>
              </AttachmentContent>
            </Attachment>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              onFileUpload(e.dataTransfer.files);
            }}
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
              onChange={(e) => onFileUpload(e.target.files)}
              className="hidden"
            />
            <Upload
              className={`h-5 w-5 mx-auto mb-1.5 text-muted-foreground ${
                uploading ? 'animate-bounce text-primary' : ''
              }`}
            />
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
  );
};
