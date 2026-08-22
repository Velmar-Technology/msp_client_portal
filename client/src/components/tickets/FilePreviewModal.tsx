import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PreviewFileState {
  filename: string;
  url: string;
  mimeType: string;
}

export interface FilePreviewModalProps {
  previewFile: PreviewFileState | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ previewFile, onClose }) => {
  const { t } = useTranslation();

  if (!previewFile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="text-sm text-foreground truncate max-w-[80%] font-semibold font-heading">
            {previewFile.filename}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-auto min-h-75">
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
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {previewFile.filename}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {t('ticketDetail.previewNotAvailable')}
              </p>
              <Button asChild size="sm" className="font-semibold inline-flex items-center gap-2">
                <a href={previewFile.url} download={previewFile.filename}>
                  <Download className="h-3.5 w-3.5" />
                  {t('ticketDetail.downloadFile')}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
