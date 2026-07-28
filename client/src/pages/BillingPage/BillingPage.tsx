/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo, useCallback } from "react";
import { Download, CreditCard, Loader2 } from "lucide-react";
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
    if (!isOpen || !invoice) return;

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
        setPaymentMessage(t("billing.paymentError"));
        return;
      }

      const container = document.getElementById("paypal-button-container");
      if (container) {
        container.innerHTML = "";
        try {
          buttonsInstance = (window as any).paypal.Buttons({
            createOrder: async () => {
              setPaymentMessage(t("billing.paymentProcessing"));
              try {
                const { orderId } = await invoiceService.createPaypalOrder(invoice!.id);
                return orderId;
              } catch (err) {
                console.error(err);
                setPaymentMessage(t("billing.paymentError"));
                throw err;
              }
            },
            onApprove: async (data: any) => {
              setPaymentMessage(t("billing.paymentProcessing"));
              try {
                const response = await invoiceService.capturePaypalOrder(invoice!.id, data.orderID);
                if (response.success) {
                  setIsSuccess(true);
                  setPaymentMessage(t("billing.paymentSuccess"));
                  onSuccess();
                } else {
                  setPaymentMessage(t("billing.paymentError"));
                }
              } catch (err) {
                console.error(err);
                setPaymentMessage(t("billing.paymentError"));
              }
            },
            onError: (err: any) => {
              console.error(err);
              setPaymentMessage(t("billing.paymentError"));
            },
          });
          buttonsInstance.render("#paypal-button-container");
        } catch (err) {
          console.error("Failed to render PayPal buttons", err);
        }
      }
    }

    initializePaypal();

    return () => {
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
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-6 text-zinc-900 dark:text-zinc-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold">
            {isSuccess ? t("billing.paymentSuccessTitle") : t("billing.payNow")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 leading-normal">
            {isSuccess
              ? t("billing.paymentSuccessDesc", { amount: Number(invoice.total).toFixed(2) })
              : t("billing.payModalDesc", { amount: Number(invoice.total).toFixed(2), number: invoice.invoice_number })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-6">
          {!isSuccess && (
            <div
              id="paypal-button-container"
              className="my-3 min-h-[150px] flex items-center justify-center bg-zinc-50/10 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800 border-dashed"
            >
              <span className="text-xs text-zinc-450 dark:text-zinc-500">
                {t("plans.loadingPayPal") || "Loading PayPal..."}
              </span>
            </div>
          )}

          {paymentMessage && (
            <p
              className={`text-xs font-semibold text-center mt-3 p-2.5 rounded-lg border ${
                isSuccess
                  ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400"
                  : paymentMessage === t("billing.paymentProcessing")
                  ? "bg-zinc-500/10 border-zinc-500/20 text-zinc-700 dark:text-zinc-300"
                  : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
              }`}
            >
              {paymentMessage}
            </p>
          )}
        </div>

        <AlertDialogFooter className="sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
          >
            {isSuccess ? t("common.close") : t("common.cancel")}
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
    loading,
    selectedInvoice,
    showPayModal,
    downloadingId,
    setPage,
    handleDownload,
    openPayModal,
    closePayModal,
    fetchInvoices,
  } = useBilling();

  const getStatusLabel = useCallback((status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tickets.filterAwaitingPayment"),
      PAID: t("tickets.filterResolved"),
      OVERDUE: i18n.language === "es_DO" ? "VENCIDA" : "OVERDUE",
    };
    return map[status] || status;
  }, [t, i18n.language]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language === "es_DO" ? "es-DO" : "en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, [i18n.language]);

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
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
    [t, downloadingId, handleDownload, openPayModal, formatDate, getStatusLabel]
  );

  return (
    <Page title={t("billing.title")} subtitle={t("billing.subtitle")}>
      <DataTable
        columns={columns}
        data={invoices}
        loading={loading}
        noDataMessage={t("billing.noInvoices")}
        pagination={{
          page,
          totalPages,
          totalItems: total,
          limit: 10,
          onPageChange: setPage,
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
