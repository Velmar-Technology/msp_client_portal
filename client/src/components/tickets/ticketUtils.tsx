import {
  Image as ImageIcon,
  Video,
  FileText,
  FileSpreadsheet,
  UserPlus,
  XCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getAttachmentIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-muted-foreground" />;
  if (mimeType.startsWith('video/')) return <Video className="h-4 w-4 text-primary" />;
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-destructive" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    return <FileSpreadsheet className="h-4 w-4 text-primary" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground" />;
};

export const getAttachmentUrl = (filePath: string): string => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('uploads/')) {
    return '/' + normalized;
  }
  return normalized;
};

export const getTimelineIcon = (status: string) => {
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

export { statusColor, priorityColor, TICKET_STATUS_COLORS, TICKET_PRIORITY_COLORS } from "@/constants/tickets";

