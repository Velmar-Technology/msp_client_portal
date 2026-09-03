import { useState, useEffect } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { InvoiceContract } from '@shared/contracts';

interface CancelInvoiceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceContract | null;
  onConfirm: (reason?: string) => void;
  loading: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const CancelInvoiceConfirmModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  loading,
  t,
}: CancelInvoiceConfirmModalProps) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-xl p-5 text-foreground">
        <AlertDialogHeader className="pb-3 border-b border-border">
          <AlertDialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            {t('billing.confirmCancelTitle') || 'Cancel Invoice'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t('billing.confirmCancelDesc', {
              number: invoice.invoice_number,
              amount: Number(invoice.total).toFixed(2),
            }) ||
              `Are you sure you want to cancel invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)})? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-3 space-y-1.5">
          <Label htmlFor="cancel-invoice-reason" className="text-xs font-semibold text-foreground">
            {t('billing.cancelReasonLabel') || 'Reason (optional)'}
          </Label>
          <Input
            id="cancel-invoice-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              t('billing.cancelReasonPlaceholder') || 'e.g. Client decided not to proceed with bank transfer'
            }
            className="h-7 text-xs bg-background text-foreground"
          />
        </div>

        <AlertDialogFooter className="pt-3 border-t border-border sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            {t('common.cancel') || 'Cancel'}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            {t('billing.cancelInvoice') || 'Cancel Invoice'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
