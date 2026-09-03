import {
  FileText,
  Download,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { INVOICE_STATUS_COLORS as statusColor } from '@/constants/billing';
import type { InvoiceContract } from '@shared/contracts';

interface InvoiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceContract | null;
  onDownload: (inv: InvoiceContract) => void;
  onPay: (inv: InvoiceContract) => void;
  onMarkPaid: (inv: InvoiceContract) => void;
  onCancel: (inv: InvoiceContract) => void;
  downloading: boolean;
  isClient: boolean;
  isAdmin: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (dateStr: string) => string;
}

export const InvoiceDetailsModal = ({
  isOpen,
  onClose,
  invoice,
  onDownload,
  onPay,
  onMarkPaid,
  onCancel,
  downloading,
  isClient,
  isAdmin,
  t,
  getStatusLabel,
  formatDate,
}: InvoiceDetailsModalProps) => {
  if (!invoice) return null;

  const isUnpaid = invoice.status === 'PENDING' || invoice.status === 'OVERDUE';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        className="bg-card border border-border rounded-xl shadow-2xl p-6 text-foreground"
      >
        <DialogHeader className="pb-4 border-b border-border flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-muted-foreground" />
              {t('billing.invoiceDetails') || 'Invoice Details'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono mt-0.5">
              {invoice.invoice_number}
            </DialogDescription>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusColor[invoice.status]}`}>
            {getStatusLabel(invoice.status)}
          </span>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-muted/40 p-3 rounded-lg border border-border/80">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                {t('billing.tableDate') || 'Invoice Date'}
              </span>
              <span className="font-mono font-medium text-foreground mt-1 block">
                {formatDate(invoice.invoice_date)}
              </span>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border border-border/80">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                {t('billing.tableDueDate') || 'Due Date'}
              </span>
              <span className="font-mono font-medium text-foreground mt-1 block">
                {formatDate(invoice.due_date)}
              </span>
            </div>
            {invoice.ncf ? (
              <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-lg border border-primary/20">
                <span className="text-primary/70 block text-[10px] uppercase font-bold tracking-wider">
                  {t('billing.ncfLabel') || 'NCF'}
                </span>
                <span className="font-mono font-bold text-primary mt-1 block">
                  {invoice.ncf}
                </span>
              </div>
            ) : null}
            {invoice.rnc ? (
              <div className="bg-muted/40 p-3 rounded-lg border border-border/80">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                  {t('billing.rncLabel') || 'RNC'}
                </span>
                <span className="font-mono font-medium text-foreground mt-1 block">
                  {invoice.rnc}
                </span>
              </div>
            ) : null}
          </div>

          {/* Line Items Table */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/60 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                <span className="col-span-6">{t('billing.itemDescription') || 'Description'}</span>
                <span className="col-span-2 text-center">{t('billing.itemQty') || 'Qty'}</span>
                <span className="col-span-2 text-right">{t('billing.itemUnitPrice') || 'Unit Price'}</span>
                <span className="col-span-2 text-right">{t('billing.itemAmount') || 'Amount'}</span>
              </div>
              {invoice.line_items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-xs border-t border-border/60"
                >
                  <span
                    className="col-span-6 text-foreground font-medium truncate"
                    title={item.description}
                  >
                    {item.description}
                  </span>
                  <span className="col-span-2 text-center text-muted-foreground font-mono">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right text-muted-foreground font-mono">
                    {invoice.currency === 'DOP' ? 'RD$ ' : '$'}{Number(item.unit_price).toFixed(2)}
                  </span>
                  <span className="col-span-2 text-right text-foreground font-mono font-medium">
                    {invoice.currency === 'DOP' ? 'RD$ ' : '$'}{(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Amount Summary */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>{t('billing.tableAmount') || 'Subtotal'}</span>
              <span className="font-mono font-medium">
                {invoice.currency === 'DOP'
                  ? `RD$ ${Number(invoice.amount).toFixed(2)} DOP`
                  : `$${Number(invoice.amount).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>{t('billing.itbisTax') || 'ITBIS (18%)'}</span>
              <span className="font-mono font-medium">
                {invoice.currency === 'DOP'
                  ? `RD$ ${Number(invoice.tax_amount).toFixed(2)} DOP`
                  : `$${Number(invoice.tax_amount).toFixed(2)}`}
              </span>
            </div>
            <div className="border-t border-border pt-2.5 flex justify-between items-center text-sm font-semibold">
              <span className="text-foreground">{t('billing.tableTotal') || 'Total'}</span>
              <span className="text-primary font-bold font-mono text-base">
                {invoice.currency === 'DOP'
                  ? `RD$ ${Number(invoice.total).toFixed(2)} DOP`
                  : `$${Number(invoice.total).toFixed(2)}`}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border sm:justify-between items-center gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(invoice)}
            disabled={downloading}
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t('billing.downloadInvoice') || 'Download PDF'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <DialogClose
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer"
            >
              {t('common.close') || 'Close'}
            </DialogClose>

            {isUnpaid && isClient && (
              <Button
                size="sm"
                onClick={() => onPay(invoice)}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t('billing.payNow') || 'Pay Now'}
              </Button>
            )}

            {isUnpaid && isAdmin && (
              <Button
                size="sm"
                onClick={() => onMarkPaid(invoice)}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {t('billing.markAsPaid') || 'Mark as Paid'}
              </Button>
            )}

            {isUnpaid && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(invoice)}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
              >
                <XCircle className="h-3.5 w-3.5" />
                {t('billing.cancelInvoice') || 'Cancel Invoice'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
