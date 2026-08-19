import { useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Building2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BANK_ACCOUNTS } from "@/constants/bankAccounts";

export interface PaymentFieldsProps {
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (accepted: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (method: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e?: SyntheticEvent) => void;
}

export function PaymentFields({
  isAdmin,
  acceptedTos,
  setAcceptedTos,
  paymentMethod,
  setPaymentMethod,
  paymentMessage,
  reference,
  subscribeLoading,
  handleProcessSubscription,
}: PaymentFieldsProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-border bg-muted/40">
          <input
            type="checkbox"
            id="tos-checkbox"
            checked={acceptedTos}
            onChange={(e) => setAcceptedTos(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-input text-primary focus:ring-ring mt-0.5 cursor-pointer accent-primary"
          />
          <label
            htmlFor="tos-checkbox"
            className="text-[11px] leading-relaxed text-muted-foreground cursor-pointer select-none"
          >
            {t("plans.agreeToTermsPrefix")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:opacity-85 font-medium"
            >
              {t("plans.termsOfServiceLink")}
            </a>
          </label>
        </div>
      )}

      {(isAdmin || acceptedTos) && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider font-heading">
            {t("plans.paymentMethod")}
          </h3>

          <Tabs
            value={paymentMethod}
            onValueChange={(val) => setPaymentMethod(val as "card" | "transfer")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 h-8 p-0.5 bg-muted border border-border">
              <TabsTrigger value="card" className="text-xs py-1">
                {t("plans.creditCard")}
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-xs py-1">
                {t("plans.bankTransfer")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-3 mt-0">
              <p className="text-xs text-muted-foreground leading-normal">
                {t("plans.paypalPaymentNotice") ||
                  "Please complete your checkout payment securely using PayPal. Once approved, your subscription will activate immediately."}
              </p>
              {paymentMessage && (
                <div
                  className={`py-1.5 px-3 rounded text-[11px] font-medium text-center border ${
                    paymentMessage.includes("activated") || paymentMessage.includes("successfully")
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-secondary text-secondary-foreground border-border animate-pulse"
                  }`}
                >
                  {paymentMessage}
                </div>
              )}
              <div
                id="paypal-button-container"
                className="my-2 min-h-30 flex items-center justify-center bg-muted/20 rounded-lg p-3 border border-border border-dashed"
              >
                <span className="text-xs text-muted-foreground">
                  {t("plans.loadingPayPalCheckout") || "Loading PayPal Checkout..."}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0 space-y-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-3">
                <p className="text-xs text-muted-foreground text-center leading-normal">
                  {t("plans.transferInstructions") || "Transfer to any of the following accounts:"}
                </p>

                {/* CUENTAS BANCARIAS */}
                <div className="space-y-2 text-left">
                  <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 font-heading">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("plans.bankAccountsTitle") || "CUENTAS BANCARIAS"}
                  </h4>

                  <div className="space-y-2">
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
                              <span className="text-xs font-semibold text-foreground">
                                {bank.name}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${bank.badgeBg}`}>
                              {t(bank.typeKey) || bank.type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border text-xs font-mono">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <span className="text-[10px] text-muted-foreground font-sans uppercase">
                                {t("plans.accountNumberLabel") || "No. Cuenta:"}
                              </span>
                              <span className="font-bold text-foreground">{bank.accountNumber}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(bank.accountNumber, bank.id)}
                              className="text-[10px] font-sans flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                              title={t("plans.copy") || "Copy"}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-primary" />
                                  <span className="text-primary font-medium">
                                    {t("plans.copied") || "Copied!"}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>{t("plans.copy") || "Copy"}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reference Box */}
                <div className="bg-card border border-border p-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-sans uppercase font-medium">
                      {t("plans.referenceLabel") || "Reference:"}
                    </span>
                    <span className="font-bold text-foreground">{reference}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(reference, "reference")}
                    className="text-[10px] font-sans flex items-center gap-1 px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    {copiedId === "reference" ? (
                      <>
                        <Check className="h-3 w-3 text-primary" />
                        <span className="text-primary font-medium">
                          {t("plans.copied") || "Copied!"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{t("plans.copy") || "Copy"}</span>
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <button
                    onClick={handleProcessSubscription}
                    disabled={subscribeLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-1.5 rounded text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {subscribeLoading
                      ? t("plans.processing") || "Processing..."
                      : t("plans.confirmBankTransferIntent") || "Confirm Bank Transfer Intent"}
                  </button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default PaymentFields;
