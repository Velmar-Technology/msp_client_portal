import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Download,
  CreditCard,
  Loader2,
  Shield,
  CheckCircle,
  FileText,
  XCircle,
  Copy,
  Check,
  Building2,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Page } from "@/components/Page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BANK_ACCOUNTS } from "@/constants/bankAccounts";
import { useBilling } from "@/hooks/useBilling";
import { useAuth } from "@/hooks/useAuth";
import type { Invoice } from "@/services/invoiceService";
import { invoiceService } from "@/services/invoiceService";
import { DataTable, DataTableColumnHeader } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";

import { INVOICE_STATUS_COLORS as statusColor } from "@/constants/billing";

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    if (!isOpen || !invoice || paymentMethod !== "card") {
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
            style: {
              layout: "vertical",
              color: "gold",
              shape: "rect",
              label: "paypal",
              tagline: false,
              height: 44,
            },
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
  }, [isOpen, invoice, paymentMethod, t, onSuccess]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-5 text-zinc-900 dark:text-zinc-100 max-h-[90vh] overflow-y-auto">
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
              <Tabs
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as "card" | "transfer")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-2 h-8 p-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <TabsTrigger value="card" className="text-xs py-1">
                    {t("plans.creditCard") || "PayPal / Card"}
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="text-xs py-1">
                    {t("plans.bankTransfer") || "Wire Transfer"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="space-y-3 mt-0">
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
                      <span className="font-semibold text-foreground flex items-center gap-1.5 font-heading">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        {t("billing.secureCheckout") || "Secure Instant Checkout"}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">PayPal &bull; Cards</span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-normal">
                      {t("billing.paypalPaymentNotice") ||
                        t("plans.paypalPaymentNotice") ||
                        "Please complete your checkout payment securely using PayPal. Once approved, your invoice will mark as paid immediately."}
                    </p>

                    <div id="paypal-invoice-pay-container" className="w-full min-h-27.5 relative z-0">
                      <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>{t("plans.loadingPayPalCheckout")}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="transfer" className="mt-0 space-y-3">
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 space-y-3">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center leading-normal">
                      {t("plans.transferInstructions") ||
                        "Transfer to any of the following accounts and specify invoice number in description:"}
                    </p>

                    <div className="space-y-2 text-left">
                      <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-heading">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {t("plans.bankAccountsTitle")}
                      </h4>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {BANK_ACCOUNTS.map((bank) => {
                          const isCopied = copiedId === bank.id;
                          return (
                            <div
                              key={bank.id}
                              className="bg-card border border-border rounded-lg p-2.5 space-y-1.5 shadow-xs transition-all hover:border-border/80"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-6 w-6 rounded flex items-center justify-center shrink-0 shadow-xs ${bank.logoBg} ${bank.borderColor}`}
                                  >
                                    {bank.logoSvg}
                                  </div>
                                  <span className="text-xs font-semibold text-foreground">{bank.name}</span>
                                </div>
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${bank.badgeBg}`}
                                >
                                  {t(bank.typeKey) || bank.type}
                                </span>
                              </div>

                              <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded border border-border/50">
                                <span className="font-mono text-xs font-semibold text-foreground tracking-wider">
                                  {bank.accountNumber}
                                </span>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="xs"
                                  onClick={() => handleCopy(bank.accountNumber, bank.id)}
                                  className="h-6 px-2 text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="h-3 w-3 text-emerald-500" />
                                      <span>{t("plans.copied") || "Copied"}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>{t("plans.copy") || "Copy"}</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded text-[11px] text-blue-700 dark:text-blue-300">
                      {t("plans.bankTransferInstructions") ||
                        "Please complete the bank transfer and send your receipt to billing@velmartech.com.do"}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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
                {t("plans.militaryGradeSecurity") || "256-bit SSL encryption & secure payment processing."}
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
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
            {t("billing.markAsPaid") || "Mark as Paid"}
          </Button>
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

        <div className="py-3 space-y-1.5">
          <Label htmlFor="cancel-invoice-reason" className="text-xs font-semibold text-foreground">
            {t("billing.cancelReasonLabel") || "Reason (optional)"}
          </Label>
          <Input
            id="cancel-invoice-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              t("billing.cancelReasonPlaceholder") || "e.g. Client decided not to proceed with bank transfer"
            }
            className="h-7 text-xs bg-background text-foreground"
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
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
            {t("billing.cancelInvoice") || "Cancel Invoice"}
          </Button>
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        className="bg-white dark:bg-card border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-900 dark:text-zinc-100"
      >
        <DialogHeader className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-zinc-500" />
              {t("billing.invoiceDetails") || "Invoice Details"}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 font-mono mt-0.5">
              {invoice.invoice_number}
            </DialogDescription>
          </div>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${statusColor[invoice.status]}`}>
            {getStatusLabel(invoice.status)}
          </span>
        </DialogHeader>

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

        <DialogFooter className="pt-3 border-t border-zinc-200 dark:border-zinc-800 sm:justify-between items-center gap-2 flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(invoice)}
            disabled={downloading}
            className="text-xs font-semibold gap-1.5 cursor-pointer"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("billing.downloadInvoice") || "Download PDF"}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <DialogClose
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
            >
              {t("common.close") || "Close"}
            </DialogClose>

            {isUnpaid && isClient && (
              <Button
                size="sm"
                onClick={() => onPay(invoice)}
                className="text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
              >
                <CreditCard className="h-3.5 w-3.5" />
                {t("billing.payNow") || "Pay Now"}
              </Button>
            )}

            {isUnpaid && isAdmin && (
              <Button
                size="sm"
                onClick={() => onMarkPaid(invoice)}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-sm"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {t("billing.markAsPaid") || "Mark as Paid"}
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
                {t("billing.cancelInvoice") || "Cancel Invoice"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* --- Main Component --- */

export function BillingPage() {
  const { user } = useAuth();
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
    selectedInvoiceDetails,

    showDetailsModal,
    openDetailsModal,
    closeDetailsModal,
    fetchInvoices,
  } = useBilling();

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
          <Button
            variant="link"
            size="sm"
            onClick={() => openDetailsModal(row.original)}
            className="h-auto p-0 text-sm font-medium text-foreground hover:text-primary hover:underline font-mono text-left cursor-pointer"
          >
            {row.original.invoice_number}
          </Button>
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
        cell: ({ row }) => {
          const status = row.original.status;
          const isPaid = status === "PAID";
          const isPending = status === "PENDING";
          const isOverdue = status === "OVERDUE";
          const isCancelled = status === "CANCELLED";

          const badgeClasses = isPaid
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/20"
            : isPending
              ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/20"
              : isOverdue || isCancelled
                ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/20"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";

          const dotClass = isPaid
            ? "bg-emerald-500"
            : isPending
              ? "bg-amber-500"
              : isOverdue || isCancelled
                ? "bg-red-500"
                : "bg-zinc-400";

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
        id: "actions",
        enableSorting: false,
        header: () => (
          <div className="text-right">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t("billing.tableActions")}
            </span>
          </div>
        ),
        cell: ({ row }) => {
          const inv = row.original;
          const isPendingOrOverdue = inv.status === "PENDING" || inv.status === "OVERDUE";
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openDetailsModal(inv);
                }}
                className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>{t("billing.viewDetails")}</span>
                <ChevronRight className="h-3 w-3" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={(e) => e.stopPropagation()}
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
                    {t("billing.downloadInvoice")}
                  </DropdownMenuItem>

                  {isPendingOrOverdue && (
                    <>
                      {isClient && (
                        <DropdownMenuItem
                          onClick={() => openPayModal(inv)}
                          className="text-xs text-primary font-semibold cursor-pointer"
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          {t("billing.payNow") || "Pay"}
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => openMarkPaidModal(inv)}
                          className="text-xs text-emerald-600 font-semibold cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          {t("billing.markAsPaid") || "Mark Paid"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-border" />
                      <DropdownMenuItem
                        onClick={() => openCancelModal(inv)}
                        className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1 text-destructive" />
                        {t("billing.cancelInvoice") || "Cancel Invoice"}
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
