/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Download, CreditCard, Loader2, Shield, CheckCircle, FileText, Eye, XCircle } from "lucide-react";
import { Page } from "@/components/Page";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useBilling } from "@/hooks/useBilling";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice } from "@/services/invoiceService";
import { invoiceService } from "@/services/invoiceService";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

/* --- Sub-Components --- */

const statusColor: Record<string, string> = {
  PENDING: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700",
  PAID: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  OVERDUE: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  CANCELLED: "bg-zinc-50 dark:bg-zinc-900/30 text-zinc-500 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800",
};

const PayModal = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
  t: (key: string, options?: any) => string;
}) => {
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen || !invoice) {
      setPaymentMessage(null);
      setIsSuccess(false);
      return;
    }

    let scriptElement: HTMLScriptElement | null = null;
    let buttonsInstance: any = null;

    async function initializePaypal() {
      const scriptId = "paypal-js-sdk-script";
      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

      if (!existingScript) {
        scriptElement = document.createElement("script");
        scriptElement.id = scriptId;
        const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "test";
        scriptElement.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        scriptElement.async = true;
        document.body.appendChild(scriptElement);

        await new Promise((resolve) => {
          if (scriptElement) scriptElement.onload = resolve;
        });
      } else {
        scriptElement = existingScript;
      }

      if (!(window as any).paypal) {
        console.error("PayPal SDK failed to load");
        setPaymentMessage(t("billing.paymentError") || "PayPal SDK failed to load");
        return;
      }

      const container = document.getElementById("paypal-invoice-pay-container");
      if (container) {
        container.innerHTML = "";
        try {
          buttonsInstance = (window as any).paypal.Buttons({
            createOrder: async () => {
              setPaymentMessage(t("billing.paymentProcessing") || "Preparing checkout...");
              try {
                const { orderId } = await invoiceService.createPaypalOrder(invoice!.id);
                return orderId;
              } catch (err) {
                console.error(err);
                setPaymentMessage(t("billing.paymentError") || "Failed to create order");
                throw err;
              }
            },
            onApprove: async (data: any) => {
              setPaymentMessage(t("billing.paymentProcessing") || "Processing payment...");
              try {
                const response = await invoiceService.capturePaypalOrder(invoice!.id, data.orderID);
                if (response.success) {
                  setIsSuccess(true);
                  setPaymentMessage(t("billing.paymentSuccess") || "Payment approved!");
                  onSuccess();
                } else {
                  setPaymentMessage(t("billing.paymentError") || "Payment verification failed");
                }
              } catch (err) {
                console.error(err);
                setPaymentMessage(t("billing.paymentError") || "Payment verification failed");
              }
            },
            onError: (err: any) => {
              console.error(err);
              setPaymentMessage(t("billing.paymentError") || "PayPal Checkout error");
            },
          });
          buttonsInstance.render("#paypal-invoice-pay-container");
        } catch (err) {
          console.error("Failed to render PayPal buttons", err);
        }
      }
    }

    const timer = setTimeout(() => {
      initializePaypal();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (buttonsInstance && buttonsInstance.close) {
        try {
          buttonsInstance.close();
        } catch {
          // ignore
        }
      }
    };
  }, [isOpen, invoice, t, onSuccess]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            {isSuccess ? t("billing.paymentSuccessTitle") || "Payment Approved" : t("billing.payNow") || "Pay Invoice"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-normal">
            {isSuccess
              ? t("billing.paymentSuccessDesc", { amount: Number(invoice.total).toFixed(2) })
              : t("billing.modalPayDesc", { amount: Number(invoice.total).toFixed(2), number: invoice.invoice_number })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-3 space-y-3">
          {/* Invoice Summary Card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 text-xs space-y-2">
            <div className="flex justify-between items-start pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">{invoice.invoice_number}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {t("billing.tableDueDate") || "Due Date"}: {new Date(invoice.due_date).toLocaleDateString()}
                </p>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                ${Number(invoice.amount).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-zinc-500 py-0.5">
              <span>{t("plans.taxes") || "Taxes (18%)"}</span>
              <span className="font-mono">${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between items-center text-sm font-semibold">
              <span className="text-zinc-950 dark:text-zinc-50">{t("plans.total") || "Total"}</span>
              <span className="text-primary font-bold font-mono">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>

          {!isSuccess && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 leading-normal">
                {t("plans.paypalPaymentNotice") ||
                  "Please complete your checkout payment securely using PayPal. Once approved, your invoice will mark as paid immediately."}
              </p>

              {paymentMessage && (
                <div
                  className={`py-1.5 px-3 rounded text-[11px] font-medium text-center border ${
                    paymentMessage.includes("success") || paymentMessage.includes("approved")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse"
                  }`}
                >
                  {paymentMessage}
                </div>
              )}

              <div
                id="paypal-invoice-pay-container"
                className="my-2 min-h-[120px] flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 border-dashed"
              >
                <span className="text-xs text-zinc-400">
                  {t("plans.loadingPayPalCheckout") || "Loading PayPal Checkout..."}
                </span>
              </div>
            </div>
          )}

          {isSuccess && paymentMessage && (
            <div className="py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50 rounded-lg text-xs font-semibold text-center">
              {paymentMessage}
            </div>
          )}

          {/* Security Badge */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-2.5 flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                {t("plans.encryptedTx") || "Encrypted Transaction"}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">
                {t("plans.militaryGradeSecurity") || "256-bit SSL encryption & secure PayPal gateway processing."}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="pt-2 border-t border-zinc-200 dark:border-zinc-800 sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            {isSuccess ? t("common.close") || "Close" : t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const MarkPaidConfirmModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  loading,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onConfirm: () => void;
  loading: boolean;
  t: (key: string, options?: any) => string;
}) => {
  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("billing.confirmMarkPaidTitle") || "Confirm Payment"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t("billing.confirmMarkPaidDesc", {
              number: invoice.invoice_number,
              amount: Number(invoice.total).toFixed(2),
            }) ||
              `Are you sure you want to mark invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)}) as paid? Confirm that manual wire transfer has been received.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-800 sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            {t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            {t("billing.markAsPaid") || "Mark as Paid"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const CancelInvoiceConfirmModal = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
  loading,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onConfirm: (reason?: string) => void;
  loading: boolean;
  t: (key: string, options?: any) => string;
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <AlertDialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            {t("billing.confirmCancelTitle") || "Cancel Invoice"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t("billing.confirmCancelDesc", {
              number: invoice.invoice_number,
              amount: Number(invoice.total).toFixed(2),
            }) ||
              `Are you sure you want to cancel invoice ${invoice.invoice_number} ($${Number(invoice.total).toFixed(2)})? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-3 space-y-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {t("billing.cancelReasonLabel") || "Reason (optional)"}
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              t("billing.cancelReasonPlaceholder") || "e.g. Client decided not to proceed with bank transfer"
            }
            className="w-full text-xs px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <AlertDialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-800 sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
          >
            {t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            {/* {t("billing.cancelInvoice") || "Cancel Invoice"} */}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const InvoiceDetailsModal = ({
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
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onDownload: (inv: Invoice) => void;
  onPay: (inv: Invoice) => void;
  onMarkPaid: (inv: Invoice) => void;
  onCancel: (inv: Invoice) => void;
  downloading: boolean;
  isClient: boolean;
  isAdmin: boolean;
  t: (key: string, options?: any) => string;
  getStatusLabel: (status: string) => string;
  formatDate: (dateStr: string) => string;
}) => {
  if (!invoice) return null;

  const isUnpaid = invoice.status === "PENDING" || invoice.status === "OVERDUE";

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-lg bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
          <div>
            <AlertDialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-zinc-500" />
              {t("billing.invoiceDetails") || "Invoice Details"}
            </AlertDialogTitle>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">{invoice.invoice_number}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusColor[invoice.status]}`}>
            {getStatusLabel(invoice.status)}
          </span>
        </AlertDialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                {t("billing.tableDate") || "Invoice Date"}
              </span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-1 block">
                {formatDate(invoice.invoice_date)}
              </span>
            </div>
            <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
              <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">
                {t("billing.tableDueDate") || "Due Date"}
              </span>
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-1 block">
                {formatDate(invoice.due_date)}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          {invoice.line_items && invoice.line_items.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/60 text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                <span className="col-span-6">{t("billing.itemDescription") || "Description"}</span>
                <span className="col-span-2 text-center">{t("billing.itemQty") || "Qty"}</span>
                <span className="col-span-2 text-right">{t("billing.itemUnitPrice") || "Unit Price"}</span>
                <span className="col-span-2 text-right">{t("billing.itemAmount") || "Amount"}</span>
              </div>
              {invoice.line_items.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-xs border-t border-zinc-100 dark:border-zinc-800/60"
                >
                  <span
                    className="col-span-6 text-zinc-800 dark:text-zinc-200 font-medium truncate"
                    title={item.description}
                  >
                    {item.description}
                  </span>
                  <span className="col-span-2 text-center text-zinc-600 dark:text-zinc-400 font-mono">
                    {item.quantity}
                  </span>
                  <span className="col-span-2 text-right text-zinc-600 dark:text-zinc-400 font-mono">
                    ${Number(item.unit_price).toFixed(2)}
                  </span>
                  <span className="col-span-2 text-right text-zinc-800 dark:text-zinc-200 font-mono font-medium">
                    ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Amount Summary */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
              <span>{t("billing.tableAmount") || "Subtotal"}</span>
              <span className="font-mono font-medium">${Number(invoice.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
              <span>{t("billing.tableTax") || "Tax (18%)"}</span>
              <span className="font-mono font-medium">${Number(invoice.tax_amount).toFixed(2)}</span>
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2.5 flex justify-between items-center text-sm font-semibold">
              <span className="text-zinc-950 dark:text-zinc-50">{t("billing.tableTotal") || "Total"}</span>
              <span className="text-primary font-bold font-mono text-base">${Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-800 sm:justify-between items-center gap-2 flex-col-reverse sm:flex-row">
          <button
            onClick={() => onDownload(invoice)}
            disabled={downloading}
            className="px-3.5 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 disabled:opacity-50"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("billing.downloadInvoice") || "Download PDF"}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <AlertDialogCancel
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              {t("common.close") || "Close"}
            </AlertDialogCancel>

            {isUnpaid && isClient && (
              <button
                onClick={() => {
                  onClose();
                  onPay(invoice);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {/* {t("billing.payNow") || "Pay Now"} */}
              </button>
            )}

            {isUnpaid && isAdmin && (
              <button
                onClick={() => {
                  onClose();
                  onMarkPaid(invoice);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {t("billing.markAsPaid") || "Mark as Paid"}
              </button>
            )}

            {isUnpaid && (
              <button
                onClick={() => {
                  onClose();
                  onCancel(invoice);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle className="h-3.5 w-3.5" />
                {/* {t("billing.cancelInvoice") || "Cancel Invoice"} */}
              </button>
            )}
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/* --- Main Component --- */

export function BillingPage() {
  const { user } = useAuth();
  const location = useLocation();
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "ADMIN";

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
    allInvoices,
    selectedInvoiceDetails,
    showDetailsModal,
    openDetailsModal,
    closeDetailsModal,
    fetchInvoices,
  } = useBilling();

  useEffect(() => {
    const state = location.state as { invoiceId?: string } | undefined;
    if (state?.invoiceId && allInvoices.length > 0) {
      const found = allInvoices.find((inv) => inv.id === state.invoiceId);
      if (found) {
        openDetailsModal(found);
      }
    }
  }, [location.state, allInvoices, openDetailsModal]);

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        PENDING: t("tickets.filterAwaitingPayment"),
        PAID: t("tickets.filterResolved"),
        OVERDUE: i18n.language === "es_DO" ? "Vencida" : "Overdue",
        CANCELLED: t("billing.statusCancelled") || (i18n.language === "es_DO" ? "Cancelada" : "Cancelled"),
      };
      return map[status] || status;
    },
    [t, i18n.language],
  );

  const formatDate = useCallback(
    (dateString: string) => {
      return new Date(dateString).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    },
    [i18n.language],
  );

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableInvoiceNo")} />,
        cell: ({ row }) => (
          <button
            onClick={() => openDetailsModal(row.original)}
            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-primary dark:hover:text-primary hover:underline font-mono text-left cursor-pointer"
          >
            {row.original.invoice_number}
          </button>
        ),
      },
      {
        accessorKey: "invoice_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableDate")} />,
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: "due_date",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableDueDate")} />,
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono">
            {formatDate(row.original.due_date)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        accessorFn: (row) => Number(row.amount),
        id: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableAmount")} />,
        cell: ({ row }) => (
          <span className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">
            ${Number(row.original.amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "tax_amount",
        accessorFn: (row) => Number(row.tax_amount),
        id: "tax_amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableTax")} />,
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            ${Number(row.original.tax_amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        accessorFn: (row) => Number(row.total),
        id: "total",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableTotal")} />,
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
            ${Number(row.original.total).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billing.tableStatus")} />,
        cell: ({ row }) => (
          <span
            className={`px-2 py-1 inline-flex text-xs font-semibold rounded-md border ${
              statusColor[row.original.status]
            }`}
          >
            {getStatusLabel(row.original.status)}
          </span>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableActions")}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openDetailsModal(row.original)}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
              title={t("billing.invoiceDetails") || "View Details"}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDownload(row.original)}
              disabled={downloadingId === row.original.id}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
              title={t("billing.downloadInvoice")}
            >
              {downloadingId === row.original.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400 dark:text-zinc-500" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
            {(row.original.status === "PENDING" || row.original.status === "OVERDUE") && (
              <>
                {isClient && (
                  <button
                    onClick={() => openPayModal(row.original)}
                    className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title={t("billing.payNow")}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    {/* {t("billing.payNow")} */}
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => openMarkPaidModal(row.original)}
                    className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    title={t("billing.markAsPaid") || "Mark as Paid"}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {t("billing.markAsPaid") || "Mark as Paid"}
                  </button>
                )}
                <button
                  onClick={() => openCancelModal(row.original)}
                  className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title={t("billing.cancelInvoice") || "Cancel Invoice"}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {/* {t("billing.cancelInvoice") || "Cancel"} */}
                </button>
              </>
            )}
          </div>
        ),
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
    <Page title={t("billing.title")} subtitle={t("billing.subtitle")}>
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        noDataMessage={t("billing.noInvoices")}
        defaultSorting={[{ id: "invoice_date", desc: true }]}
        search={{
          value: search,
          onChange: handleSearchChange,
          placeholder: t("billing.searchPlaceholder") || "Search invoices...",
        }}
        filters={[
          {
            id: "status",
            value: statusFilter,
            onChange: handleStatusFilterChange,
            options: [
              { value: "PENDING", label: t("tickets.filterAwaitingPayment") },
              { value: "PAID", label: t("tickets.filterResolved") },
              { value: "OVERDUE", label: i18n.language === "es_DO" ? "Vencida" : "Overdue" },
              {
                value: "CANCELLED",
                label: t("billing.statusCancelled") || (i18n.language === "es_DO" ? "Cancelada" : "Cancelled"),
              },
            ],
            placeholder: t("billing.allStatuses") || "All Statuses",
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
    </Page>
  );
}
