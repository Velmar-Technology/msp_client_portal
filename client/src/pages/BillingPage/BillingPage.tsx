/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, CreditCard, Loader2, Shield } from "lucide-react";
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
import type { Invoice } from "@/services/invoiceService";
import { invoiceService } from "@/services/invoiceService";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

/* --- Sub-Components --- */

const statusColor: Record<string, string> = {
  PENDING: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700",
  PAID: "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  OVERDUE: "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
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
              : t("billing.payModalDesc", { amount: Number(invoice.total).toFixed(2), number: invoice.invoice_number })}
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

/* --- Main Component --- */

export function BillingPage() {
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
    fetchInvoices,
  } = useBilling();

  const getStatusLabel = useCallback(
    (status: string) => {
      const map: Record<string, string> = {
        PENDING: t("tickets.filterAwaitingPayment"),
        PAID: t("tickets.filterResolved"),
        OVERDUE: i18n.language === "es_DO" ? "VENCIDA" : "OVERDUE",
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
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableInvoiceNo")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 font-mono">
            {row.original.invoice_number}
          </span>
        ),
      },
      {
        accessorKey: "invoice_date",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableDate")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono">
            {formatDate(row.original.invoice_date)}
          </span>
        ),
      },
      {
        accessorKey: "due_date",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableDueDate")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap font-mono">
            {formatDate(row.original.due_date)}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableAmount")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-zinc-900 dark:text-zinc-100 font-mono">
            ${Number(row.original.amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "tax_amount",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableTax")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 font-mono">
            ${Number(row.original.tax_amount).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "total",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableTotal")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
            ${Number(row.original.total).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableStatus")}
          </span>
        ),
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
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("billing.tableActions")}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
              <button
                onClick={() => openPayModal(row.original)}
                className="px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-semibold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                title={t("billing.payNow")}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t("billing.payNow")}
              </button>
            )}
          </div>
        ),
      },
    ],
    [t, downloadingId, handleDownload, openPayModal, formatDate, getStatusLabel],
  );

  return (
    <Page title={t("billing.title")} subtitle={t("billing.subtitle")}>
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        noDataMessage={t("billing.noInvoices")}
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
              { value: "OVERDUE", label: i18n.language === "es_DO" ? "VENCIDA" : "OVERDUE" },
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
      <PayModal
        isOpen={showPayModal}
        onClose={closePayModal}
        invoice={selectedInvoice}
        onSuccess={fetchInvoices}
        t={t}
      />
    </Page>
  );
}
