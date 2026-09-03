import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface MarkPaidConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceContract | null;
  onConfirm: () => void;
  loading: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const MarkPaidConfirmModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  loading,
  t,
}: MarkPaidConfirmModalProps) => {
  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-xl p-5 text-foreground">
        <AlertDialogHeader className="pb-3 border-b border-border">
          <AlertDialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t('billing.confirmMarkPaidTitle') || 'Confirm Payment'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t('billing.confirmMarkPaidDesc', {
              number: invoice.invoice_number,
              amount: Number(invoice.total).toFixed(2),
            }) ||
              `Are you sure you want to mark invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}) as paid? Confirm that manual wire transfer has been received.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-3 border-t border-border sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            {t('common.cancel') || 'Cancel'}
          </AlertDialogCancel>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-primary-foreground gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            {t('billing.markAsPaid') || 'Mark as Paid'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
