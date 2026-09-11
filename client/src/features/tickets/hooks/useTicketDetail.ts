import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketService } from "../api/ticketService";
import type { TicketItem as Ticket, TicketTimelineItem as TicketEvent, TicketResponseItem as TicketResponse, TicketAttachmentItem as TicketAttachment } from "../api/ticketService";
import type { PreviewFileState } from "../components/FilePreviewModal";
import { useAuth } from "@/hooks/useAuth";
import { userService, type TechnicianUser } from "@/features/users";
import { useTicketReadStore } from "@/store/useTicketReadStore";

/**
 * Custom hook managing the Ticket Detail view.
 * Handles ticket fetching, audit timeline, real-time replies, technician assignment, file attachments, and SLA status tracking.
 *
 * @see BL-101 (1-Hour SLA Cancellation)
 * @see BL-301 (RBAC & State Machine)
 * @param ticketId - Ticket unique identifier string.
 * @returns State and event handlers for ticket lifecycle, comments, attachments, and assignments.
 */
import { useTicketChatStream } from './useTicketChatStream';

export function useTicketDetail(ticketId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<(TicketEvent & { changed_by_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Technician assignment state
  const [technicians, setTechnicians] = useState<TechnicianUser[]>([]);
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
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseFeedback, setResponseFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<PreviewFileState | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const canAssign = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const loadTicketData = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      setError(null);
      const [tData, events, atts, resps] = await Promise.all([
        ticketService.getById(ticketId),
        ticketService.getTimeline(ticketId),
        ticketService.getAttachments(ticketId),
        ticketService.getResponses(ticketId),
      ]);
      setTicket(tData);
      setSelectedTechId(tData.assigned_tech_id || '');
      setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
      setAttachments(atts);
      setResponses(resps);
      useTicketReadStore.getState().markAsRead(tData.id, user?.id);
    } catch (err: unknown) {
      console.error('Failed to load ticket', err);
      const axiosErr = err as { response?: { status?: number; data?: { code?: string; message?: string } } };
      const status = axiosErr?.response?.status;
      const code = axiosErr?.response?.data?.code;
      if (status === 400 || code === 'VALIDATION_ERROR') {
        setError({
          title: t('ticketDetail.invalidTicketId'),
          message: t('ticketDetail.invalidTicketIdDesc'),
        });
      } else if (status === 404 || code === 'NOT_FOUND_ERROR') {
        setError({
          title: t('ticketDetail.ticketNotFound'),
          message: t('ticketDetail.invalidTicketIdDesc'),
        });
      } else {
        setError({
          title: t('ticketDetail.invalidTicketId'),
          message: axiosErr?.response?.data?.message || t('ticketDetail.invalidTicketIdDesc'),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [ticketId, t, user]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Real-time WebSocket listener: immediately appends replies pushed by server
  const handleIncomingMessage = useCallback((incoming: TicketResponse) => {
    setResponses((prev) => {
      if (prev.some((r) => r.id === incoming.id)) {
        return prev;
      }
      return [...prev, incoming];
    });
    if (ticketId) {
      useTicketReadStore.getState().markAsRead(ticketId, user?.id);
    }
  }, [ticketId, user?.id]);

  useTicketChatStream({
    ticketId,
    onNewMessage: handleIncomingMessage,
    enabled: Boolean(ticketId),
  });

  // Background reconciliation fallback (every 8s for active tickets)
  useEffect(() => {
    if (!ticketId || (ticket && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'CANCELLED'))) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const latestResponses = await ticketService.getResponses(ticketId);
        setResponses((prev) => {
          // If counts or latest message timestamp differ, update
          if (latestResponses.length !== prev.length || (latestResponses.length > 0 && latestResponses[latestResponses.length - 1].id !== prev[prev.length - 1]?.id)) {
            return latestResponses;
          }
          return prev;
        });
      } catch {
        // Silently ignore background polling failure
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [ticketId, ticket?.status]);

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

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || (!responseText.trim() && responseFiles.length === 0)) return;
    setSendingResponse(true);
    setResponseFeedback(null);
    try {
      const newResponse = await ticketService.createResponse(
        ticketId,
        responseText.trim(),
        responseFiles,
        isInternalNote
      );
      setResponses((prev) => (prev.some((r) => r.id === newResponse.id) ? prev : [...prev, newResponse]));
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

  const handleAssign = async (techId: string) => {
    if (!ticketId) return;
    setAssigning(true);
    setAssignMessage(null);
    try {
      const updatedTicket = await ticketService.assign(ticketId, techId);
      setTicket(updatedTicket);
      setSelectedTechId(techId);
      setAssignMessage({ text: t('ticketDetail.assignSuccess'), isError: false });
      
      const events = await ticketService.getTimeline(ticketId);
      setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
    } catch (err) {
      console.error('Failed to assign technician', err);
      setAssignMessage({ text: t('ticketDetail.assignError'), isError: true });
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId) return;
    setStatusUpdating(true);
    try {
      const notes = `Status changed directly from details view.`;
      const updatedTicket = await ticketService.updateStatus(ticketId, newStatus, notes);
      setTicket(updatedTicket);
      const events = await ticketService.getTimeline(ticketId);
      setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !ticketId) return;
    setUploadError(null);
    setUploading(true);

    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'video/mp4',
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
        const newAttachment = await ticketService.uploadAttachment(ticketId, file);
        setAttachments((prev) => [...prev, newAttachment]);
        const events = await ticketService.getTimeline(ticketId);
        setTimeline(events as (TicketEvent & { changed_by_name?: string })[]);
      }
    } catch (err) {
      console.error('Failed to upload file', err);
      setUploadError(t('ticketDetail.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const getStatusLabel = useCallback((status: string) => {
    const key = `tickets.statuses.${status}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return status;
  }, [t]);

  const getPriorityLabel = useCallback((priority: string) => {
    const key = `tickets.priorities.${priority}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return priority;
  }, [t]);

  const getCategoryLabel = useCallback((category: string) => {
    const key = `tickets.categories.${category}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return category;
  }, [t]);

  return {
    t,
    i18n,
    user,
    ticket,
    error,
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
    isInternalNote,
    setIsInternalNote,
    sendingResponse,
    responseFeedback,
    previewFile,
    setPreviewFile,
    statusUpdating,
    canAssign,
    getStatusLabel,
    getPriorityLabel,
    getCategoryLabel,
    handleSendResponse,
    handleAssign,
    handleStatusChange,
    handleFileUpload,
  };
}
