import { useState, useEffect } from "react";
import { Shield, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BANK_ACCOUNTS } from "@/constants/bankAccounts";
import { useCapturePaypalOrder } from "../api/useBillingQueries";
import { invoiceService } from "../api/invoiceService";
import type { InvoiceContract } from "@shared/contracts";

interface PayModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceContract | null;
  onSuccess: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const PayModal = ({ isOpen, onClose, invoice, onSuccess, t }: PayModalProps) => {
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "transfer">("card");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { mutateAsync: captureAsync } = useCapturePaypalOrder();

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
    let buttonsInstance: { render: (s: string) => Promise<void>; close: () => void } | null = null;

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

      const globalWin = window as unknown as {
        paypal?: { Buttons: (opts: unknown) => { render: (selector: string) => Promise<void>; close: () => void } };
      };
      if (!globalWin.paypal) {
        console.error("PayPal SDK failed to load");
        setPaymentMessage(t("billing.paymentError") || "PayPal SDK failed to load");
        return;
      }

      const container = document.getElementById("paypal-invoice-pay-container");
      if (container) {
        container.innerHTML = "";
        try {
          buttonsInstance = globalWin.paypal.Buttons({
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
            onApprove: async (data: { orderID: string }) => {
              setPaymentMessage(t("billing.paymentProcessing") || "Processing payment...");
              try {
                const response = await captureAsync({ id: invoice!.id, orderId: data.orderID });
                if (response.success) {
                  setIsSuccess(true);
                  setPaymentMessage(
                    t("billing.paymentSuccess") || "Payment processed successfully! Your subscription is active.",
                  );
                  onSuccess();
                } else {
                  setPaymentMessage(
                    (response as { message?: string }).message ||
                      t("billing.paymentFailed") ||
                      "Payment capture failed",
                  );
                }
              } catch (err) {
                console.error(err);
                setPaymentMessage(t("billing.paymentFailed") || "Payment capture failed");
              }
            },
            onError: (err: unknown) => {
              console.error(err);
              setPaymentMessage(t("billing.paymentError") || "Payment error occurred");
            },
          });

          if (buttonsInstance) {
            await buttonsInstance.render("#paypal-invoice-pay-container");
          }
        } catch (e) {
          console.error("Failed to render buttons", e);
        }
      }
    }

    initializePaypal();

    return () => {
      if (buttonsInstance) {
        try {
          buttonsInstance.close();
        } catch {
          // ignore cleanup failure if container already unmounted
        }
      }
    };
  }, [isOpen, invoice, paymentMethod, captureAsync, onSuccess, t]);

  if (!invoice) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md bg-card border border-border rounded-xl shadow-xl p-5 text-foreground">
        <AlertDialogHeader className="pb-3 border-b border-border">
          <AlertDialogTitle className="text-sm font-bold text-foreground">
            {t("billing.payInvoiceModalTitle", { number: invoice.invoice_number }) ||
              `Pay Invoice ${invoice.invoice_number}`}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="py-3 space-y-4">
          <div className="bg-muted/40 p-3 rounded-lg border border-border/80 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("billing.totalDue") || "Total Due"}</span>
            <span className="text-base font-bold text-primary font-mono">${Number(invoice.total).toFixed(2)}</span>
          </div>

          {!isSuccess && (
            <div>
              <Tabs
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as "card" | "transfer")}
                className="w-full"
              >
                <TabsList className="grid grid-cols-2 mb-3">
                  <TabsTrigger value="card" className="text-xs">
                    {t("plans.creditCard") || "PayPal / Card"}
                  </TabsTrigger>
                  <TabsTrigger value="transfer" className="text-xs">
                    {t("plans.bankTransfer") || "Bank Transfer"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="card" className="space-y-3 mt-0">
                  <div id="paypal-invoice-pay-container" className="min-h-37.5 flex items-center justify-center" />
                </TabsContent>

                <TabsContent value="transfer" className="space-y-3 mt-0">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-foreground">
                      {t("plans.selectBank") || "Our Bank Accounts (Dominican Republic)"}
                    </div>

                    <div className="max-h-55 overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 gap-2">
                        {BANK_ACCOUNTS.map((bank) => {
                          const isCopied = copiedId === bank.id;
                          return (
                            <div
                              key={bank.id}
                              className="p-2.5 rounded-lg border border-border bg-card/60 hover:bg-card transition-colors space-y-1.5"
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
                        "Please complete the bank transfer and send your receipt to facturacion@velmartech.com.do"}
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
          <div className="rounded-lg border border-border bg-muted/20 p-2.5 flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-[11px] font-semibold text-foreground">
                {t("plans.encryptedTx") || "Encrypted Transaction"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">
                {t("plans.militaryGradeSecurity") || "256-bit SSL encryption & secure payment processing."}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="pt-2 border-t border-border sm:justify-end gap-2">
          <AlertDialogCancel
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-border hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            {isSuccess ? t("common.close") || "Close" : t("common.cancel") || "Cancel"}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
