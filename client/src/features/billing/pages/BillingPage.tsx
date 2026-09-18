import { useCallback, useMemo, useState } from 'react';
import {
  Download,
  CreditCard,
  Loader2,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  ChevronRight,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { useAuth } from '@/hooks/useAuth';
import type { InvoiceContract } from '@shared/contracts';
import { useBilling } from '../hooks/useBilling';
import { useRequestVaultGrace } from '../api/useBillingQueries';
import { PayModal } from '../components/PayModal';
import { MarkPaidConfirmModal } from '../components/MarkPaidConfirmModal';
import { CancelInvoiceConfirmModal } from '../components/CancelInvoiceConfirmModal';
import { InvoiceDetailsModal } from '../components/InvoiceDetailsModal';

export function BillingPage() {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';
  const requestGraceMutation = useRequestVaultGrace();
  const [isGraceConfirmOpen, setIsGraceConfirmOpen] = useState(false);
  const [graceActiveUntil, setGraceActiveUntil] = useState<string | null>(null);

  const {
    t,
    i18n,
    invoices,
    total,
    page,
    totalPages,
    limit,
    loading,
    selectedInvoice,
    showPayModal,
    downloadingId,
    search,
    statusFilter,
    setPage,
    handleSearchChange,
    handleStatusFilterChange,
    handleLimitChange,
    handleDownload,
    openPayModal,
    closePayModal,
    selectedInvoiceToMarkPaid,
    showMarkPaidModal,
    markingPaid,
    openMarkPaidModal,
    closeMarkPaidModal,
    handleMarkAsPaid,
    selectedInvoiceToCancel,
    showCancelModal,
    cancelling,
    openCancelModal,
    closeCancelModal,
    handleCancelInvoice,
    selectedInvoiceDetails,
    showDetailsModal,
    openDetailsModal,
    closeDetailsModal,
    fetchInvoices,
  } = useBilling();

  const isDelinquent =
    user?.accountStatus === 'READ_ONLY' ||
    user?.accountStatus === 'SUSPENDED' ||
    invoices.some((i) => i.status === 'OVERDUE');

  const overdueInvoice = invoices.find(
    (i) => i.status === 'OVERDUE' || (i.status === 'PENDING' && new Date(i.due_date) < new Date())
  );

  const handleConfirmGrace = async () => {
    try {
      const res = await requestGraceMutation.mutateAsync();
      toast.success(
        t('billing.emergencyGraceActivatedToast', 'Emergency 24-hour grace activated successfully.')
      );
      setGraceActiveUntil(res.graceUntil);
      setIsGraceConfirmOpen(false);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        t('billing.emergencyGraceExhausted', 'Emergency 24-hour grace extension has already been used for this billing cycle.');
      toast.error(msg);
      setIsGraceConfirmOpen(false);
    }
  };

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        PENDING: t('tickets.filterAwaitingPayment'),
        PAID: t('tickets.filterResolved'),
        OVERDUE: i18n.language === 'es_DO' ? 'Vencida' : 'Overdue',
        CANCELLED: t('billing.statusCancelled') || (i18n.language === 'es_DO' ? 'Cancelada' : 'Cancelled'),
      };
      return map[status] || status;
    },
    [t, i18n.language],
  );

  const formatDate = useCallback(
    (dateString: string) => {
      return new Date(dateString).toLocaleDateString(i18n.language === 'es_DO' ? 'es-DO' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    },
    [i18n.language],
  );

  const columns = useMemo<ColumnDef<InvoiceContract>[]>(
    () => [
      {
        accessorKey: 'invoice_number',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableInvoiceNo')} />,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              onClick={() => openDetailsModal(row.original)}
              className="h-auto p-0 text-sm font-medium text-foreground hover:text-primary hover:underline font-mono text-left cursor-pointer"
            >
              {row.original.invoice_number}
            </Button>
            {row.original.ncf && (
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                {row.original.ncf}
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'invoice_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableDate')} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: 'due_date',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableDueDate')} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap font-mono">
            {formatDate(row.original.due_date)}
          </span>
        ),
      },
      {
        accessorKey: 'amount',
        accessorFn: (row) => Number(row.amount),
        id: 'amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableAmount')} />,
        cell: ({ row }) => (
          <span className="text-sm text-foreground font-mono">
            {row.original.currency === 'DOP' ? 'RD$ ' : '$'}{Number(row.original.amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'tax_amount',
        accessorFn: (row) => Number(row.tax_amount),
        id: 'tax_amount',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableTax')} />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground font-mono">
            {row.original.currency === 'DOP' ? 'RD$ ' : '$'}{Number(row.original.tax_amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'total',
        accessorFn: (row) => Number(row.total),
        id: 'total',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableTotal')} />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-foreground font-mono">
            {row.original.currency === 'DOP' ? 'RD$ ' : '$'}{Number(row.original.total).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title={t('billing.tableStatus')} />,
        cell: ({ row }) => {
          const status = row.original.status;
          const isPaid = status === 'PAID';
          const isPending = status === 'PENDING';
          const isOverdue = status === 'OVERDUE';
          const isCancelled = status === 'CANCELLED';

          const badgeClasses = isPaid
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20'
            : isPending
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20'
              : isOverdue || isCancelled
                ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20'
                : 'bg-muted text-muted-foreground border-border';

          const dotClass = isPaid
            ? 'bg-emerald-500'
            : isPending
              ? 'bg-amber-500'
              : isOverdue || isCancelled
                ? 'bg-red-500'
                : 'bg-muted-foreground';

          return (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-medium border ${badgeClasses}`}
            >
              <span className={`mr-1 h-1 w-1 rounded-full ${dotClass}`} />
              {getStatusLabel(status)}
            </span>
          );
        },
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => (
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('billing.tableActions')}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          const isPendingOrOverdue = inv.status === 'PENDING' || inv.status === 'OVERDUE';
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  openDetailsModal(inv);
                }}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t('billing.viewDetails')}</span>
                <ChevronRight className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="h-7 w-7 cursor-pointer"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-card text-foreground border border-border">
                  <DropdownMenuItem
                    onClick={() => handleDownload(inv)}
                    disabled={downloadingId === inv.id}
                    className="text-xs cursor-pointer"
                  >
                    {downloadingId === inv.id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5 mr-1" />
                    )}
                    {t('billing.downloadInvoice')}
                  </DropdownMenuItem>

                  {isPendingOrOverdue && (
                    <>
                      {isClient && (
                        <DropdownMenuItem
                          onClick={() => openPayModal(inv)}
                          className="text-xs text-primary font-semibold cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          {t('billing.payNow') || 'Pay'}
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => openMarkPaidModal(inv)}
                          className="text-xs text-emerald-600 font-semibold cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {t('billing.markAsPaid') || 'Mark Paid'}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => openCancelModal(inv)}
                        className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-destructive" />
                        {t('billing.cancelInvoice') || 'Cancel Invoice'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      t,
      downloadingId,
      handleDownload,
      openPayModal,
      openMarkPaidModal,
      openCancelModal,
      openDetailsModal,
      formatDate,
      getStatusLabel,
      isClient,
      isAdmin,
    ],
  );

  return (
    <Page>
      <Page.Header>
        <Page.Breadcrumbs className="mb-2 text-muted-foreground text-xs" />
        <Page.HeaderRow>
          <Page.TitleGroup>
            <Page.Title>{t('billing.title')}</Page.Title>
            <Page.Description>{t('billing.subtitle')}</Page.Description>
          </Page.TitleGroup>
        </Page.HeaderRow>
      </Page.Header>

      {/* BL-702 Non-Payment Scale & Emergency Grace Alert Card */}
      {isDelinquent && (
        <div
          data-testid="billing-non-payment-alert"
          className="mb-6 rounded-xl border border-destructive/30 bg-linear-to-r from-destructive/10 via-destructive/5 to-transparent p-4 sm:p-5 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-destructive/15 text-destructive shrink-0 mt-0.5">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold font-heading text-destructive">
                    {t('billing.nonPaymentAlertTitle', 'Account Delinquent — Action Required')}
                  </h3>
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase font-bold"
                  >
                    {user?.accountStatus || 'OVERDUE'}
                  </Badge>
                  {graceActiveUntil && (
                    <Badge
                      variant="outline"
                      data-testid="emergency-grace-active-badge"
                      className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-semibold"
                    >
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {t('billing.emergencyGraceActiveBadge', 'Emergency 24h Grace Active')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                  {graceActiveUntil
                    ? t('billing.emergencyGraceActiveDesc', {
                        time: new Date(graceActiveUntil).toLocaleString(),
                      })
                    : t('billing.nonPaymentAlertDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isClient && !graceActiveUntil && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="request-grace-btn"
                  className="h-7 text-xs font-semibold gap-1.5 border-amber-500/40 hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 cursor-pointer"
                  onClick={() => setIsGraceConfirmOpen(true)}
                  disabled={requestGraceMutation.isPending}
                >
                  {requestGraceMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Clock className="h-3 w-3 text-amber-500" />
                  )}
                  {requestGraceMutation.isPending
                    ? t('billing.requestingEmergencyGrace', 'Activating 24h Grace...')
                    : t('billing.requestEmergencyGraceBtn', 'Request 24h Emergency Access')}
                </Button>
              )}

              {isClient && overdueInvoice && (
                <Button
                  type="button"
                  size="sm"
                  data-testid="pay-overdue-balance-btn"
                  className="h-7 text-xs font-semibold gap-1.5 bg-destructive hover:bg-destructive/90 text-white cursor-pointer"
                  onClick={() => openPayModal(overdueInvoice)}
                >
                  <CreditCard className="h-3 w-3" />
                  {t('billing.payOverdueBalanceBtn', 'Pay Overdue Invoices')}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        noDataMessage={t('billing.noInvoices')}
        defaultSorting={[{ id: 'invoice_date', desc: true }]}
        search={{
          value: search,
          onChange: handleSearchChange,
          placeholder: t('billing.searchPlaceholder') || 'Search invoices...',
        }}
        filters={[
          {
            id: 'status',
            value: statusFilter,
            onChange: handleStatusFilterChange,
            options: [
              { value: 'PENDING', label: t('tickets.filterAwaitingPayment') },
              { value: 'PAID', label: t('tickets.filterResolved') },
              { value: 'OVERDUE', label: i18n.language === 'es_DO' ? 'Vencida' : 'Overdue' },
              {
                value: 'CANCELLED',
                label: t('billing.statusCancelled') || (i18n.language === 'es_DO' ? 'Cancelada' : 'Cancelled'),
              },
            ],
            placeholder: t('billing.allStatuses') || 'All Statuses',
          },
        ]}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit,
          onPageChange: setPage,
          onLimitChange: handleLimitChange,
        }}
      />
      <InvoiceDetailsModal
        isOpen={showDetailsModal}
        onClose={closeDetailsModal}
        invoice={selectedInvoiceDetails}
        onDownload={handleDownload}
        onPay={openPayModal}
        onMarkPaid={openMarkPaidModal}
        onCancel={openCancelModal}
        downloading={downloadingId === selectedInvoiceDetails?.id}
        isClient={isClient}
        isAdmin={isAdmin}
        t={t}
        getStatusLabel={getStatusLabel}
        formatDate={formatDate}
      />
      <PayModal
        isOpen={showPayModal}
        onClose={closePayModal}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
        t={t}
      />
      <MarkPaidConfirmModal
        isOpen={showMarkPaidModal}
        onClose={closeMarkPaidModal}
        invoice={selectedInvoiceToMarkPaid}
        onConfirm={handleMarkAsPaid}
        loading={markingPaid}
        t={t}
      />
      <CancelInvoiceConfirmModal
        isOpen={showCancelModal}
        onClose={closeCancelModal}
        invoice={selectedInvoiceToCancel}
        onConfirm={handleCancelInvoice}
        loading={cancelling}
        t={t}
      />
      <AlertDialog open={isGraceConfirmOpen} onOpenChange={setIsGraceConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-sm font-bold">
              <Clock className="h-4 w-4 text-amber-500" />
              {t('billing.emergencyGraceConfirmTitle', 'Request 24-Hour Emergency Vault Access')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'billing.emergencyGraceConfirmDesc',
                'You are granted a 1-time emergency 24-hour bypass per overdue billing cycle. This immediately reactivates temporary password vault access while your accounting payment or bank wire clears.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-7 text-xs cursor-pointer">
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-grace-activation-btn"
              className="h-7 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              onClick={handleConfirmGrace}
            >
              {t('billing.activate24hAccess', 'Activate 24h Access')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
