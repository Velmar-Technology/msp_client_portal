import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketService } from '../services/ticketService';
import type { Ticket, TicketEvent, TicketAttachment, TicketResponse } from '../services/ticketService';
import { useAuth } from './useAuth';
import { userService } from '../services/userService';

export function useTicketDetail(ticketId: string | undefined) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<(TicketEvent & { changed_by_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Technician assignment state
  const [technicians, setTechnicians] = useState<any[]>([]);
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
  const [sendingResponse, setSendingResponse] = useState(false);
  const [responseFeedback, setResponseFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // File preview state
  const [previewFile, setPreviewFile] = useState<{ filename: string; url: string; mimeType: string } | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const canAssign = user?.role === 'ADMIN' || user?.role === 'TECHNICIAN';

  const loadTicketData = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
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
    } catch (err) {
      console.error('Failed to load ticket', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

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
      const newResponse = await ticketService.createResponse(ticketId, responseText.trim(), responseFiles);
      setResponses((prev) => [...prev, newResponse]);
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

  return {
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
  };
}
