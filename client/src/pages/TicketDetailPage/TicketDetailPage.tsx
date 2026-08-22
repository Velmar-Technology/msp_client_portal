import { useParams, Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { useSLATimer } from '@/hooks/useSLATimer';
import { useDeferredLoading } from '@/hooks/useDeferredLoading';
import { Page } from '@/components/Page';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TicketDetailHeader,
  TicketDescriptionCard,
  TicketResponses,
  TicketTimeline,
  TicketSidebar,
  FilePreviewModal,
} from '@/components/tickets';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    t,
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
    canAssign,
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
      <TicketDetailHeader
        ticket={ticket}
        user={user}
        statusUpdating={statusUpdating}
        getStatusLabel={getStatusLabel}
        onStatusChange={handleStatusChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
        <div className="lg:col-span-8 flex flex-col gap-6 w-full">
          <TicketDescriptionCard description={ticket.description} />
          <TicketResponses
            responses={responses}
            user={user}
            responseText={responseText}
            setResponseText={setResponseText}
            responseFiles={responseFiles}
            setResponseFiles={setResponseFiles}
            responseFeedback={responseFeedback}
            sendingResponse={sendingResponse}
            onSendResponse={handleSendResponse}
            onPreviewFile={setPreviewFile}
          />
          <TicketTimeline timeline={timeline} getStatusLabel={getStatusLabel} />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 w-full">
          <TicketSidebar
            ticket={ticket}
            sla={sla}
            canAssign={canAssign}
            technicians={technicians}
            loadingTechs={loadingTechs}
            selectedTechId={selectedTechId}
            setSelectedTechId={setSelectedTechId}
            assigning={assigning}
            assignMessage={assignMessage}
            onAssign={handleAssign}
            attachments={attachments}
            uploading={uploading}
            uploadError={uploadError}
            isDragOver={isDragOver}
            setIsDragOver={setIsDragOver}
            onFileUpload={handleFileUpload}
            onPreviewFile={setPreviewFile}
            getPriorityLabel={getPriorityLabel}
            getCategoryLabel={getCategoryLabel}
          />
        </div>
      </div>

      <FilePreviewModal
        previewFile={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </Page>
  );
}

export default TicketDetailPage;
