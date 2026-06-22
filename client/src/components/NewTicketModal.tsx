import { useState, memo } from 'react';
import { X } from 'lucide-react';
import { ticketService } from '../services/ticketService';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface NewTicketModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export const NewTicketModal = memo(function NewTicketModal({ onClose, onCreated }: NewTicketModalProps) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('REPAIR');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const ticket = await ticketService.create({
        title: newTitle,
        description: newDesc,
        category: newCategory,
        priority: newPriority,
      });

      // Upload selected attachments if any
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await ticketService.uploadAttachment(ticket.id, file);
          } catch (uploadErr) {
            console.error(`Failed to upload file ${file.name}`, uploadErr);
          }
        }
      }

      onCreated();
    } catch (err) {
      console.error('Failed to create ticket', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-primary/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in mx-4">
        <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          {t('tickets.createModalTitle')}
        </h2>
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label htmlFor="new-ticket-title" className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalTitleLabel')}</label>
            <Input
              id="new-ticket-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('tickets.modalTitlePlaceholder')}
              required
              minLength={5}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 bg-surface-container-lowest text-on-surface"
            />
          </div>
          <div>
            <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalDescLabel')}</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={t('tickets.modalDescPlaceholder')}
              required
              minLength={10}
              rows={4}
              className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-secondary/20 resize-none bg-surface-container-lowest text-on-surface"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalCategoryLabel')}</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary cursor-pointer bg-surface-container-lowest text-on-surface"
              >
                <option value="REPAIR">{t('tickets.categories.REPAIR')}</option>
                <option value="WARRANTY">{t('tickets.categories.WARRANTY')}</option>
                <option value="SERVICE_OUTAGE">{t('tickets.categories.SERVICE_OUTAGE')}</option>
              </select>
            </div>
            <div>
              <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.modalPriorityLabel')}</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-4 py-2.5 border border-outline-variant rounded-lg text-body-md focus:outline-none focus:border-primary cursor-pointer bg-surface-container-lowest text-on-surface"
              >
                <option value="LOW">{t('tickets.priorities.LOW')}</option>
                <option value="MEDIUM">{t('tickets.priorities.MEDIUM')}</option>
                <option value="HIGH">{t('tickets.priorities.HIGH')}</option>
                <option value="CRITICAL">{t('tickets.priorities.CRITICAL')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-md text-on-surface mb-1.5">{t('tickets.attachmentsLabel')}</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('modal-file-input')?.click()}
                  className="px-4 py-2 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer bg-surface-container-low"
                >
                  {t('tickets.selectFiles')}
                </button>
                <Input
                  id="modal-file-input"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFiles.length > 0 && (
                  <span className="text-label-sm text-on-surface-variant font-medium">
                    {selectedFiles.length} {t('tickets.filesSelected')}
                  </span>
                )}
              </div>
              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <ScrollArea className="h-24 border border-outline-variant/50 rounded-lg p-2 bg-surface-container/50">
                  <div className="space-y-1.5 pr-2">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center text-label-sm bg-surface-container-lowest px-2 py-1 rounded border border-outline-variant/30">
                        <span className="truncate max-w-[220px]" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="text-error hover:text-error/80 cursor-pointer p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-outline-variant rounded-lg text-label-md text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer bg-surface-container-lowest"
            >
              {t('tickets.modalCancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-label-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {submitting ? t('tickets.modalCreating') : t('tickets.modalCreate')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
