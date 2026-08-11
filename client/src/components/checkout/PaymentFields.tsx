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
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20">
          <input
            type="checkbox"
            id="tos-checkbox"
            checked={acceptedTos}
            onChange={(e) => setAcceptedTos(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-zinc-300 text-primary focus:ring-primary/20 mt-0.5 cursor-pointer accent-primary"
          />
          <label
            htmlFor="tos-checkbox"
            className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 cursor-pointer select-none"
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
          <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
            {t("plans.paymentMethod")}
          </h3>

          <Tabs
            value={paymentMethod}
            onValueChange={(val) => setPaymentMethod(val as "card" | "transfer")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4 h-8 p-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <TabsTrigger value="card" className="text-xs py-1">
                {t("plans.creditCard")}
              </TabsTrigger>
              <TabsTrigger value="transfer" className="text-xs py-1">
                {t("plans.bankTransfer")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-3 mt-0">
              <p className="text-xs text-zinc-500 leading-normal">
                {t("plans.paypalPaymentNotice") ||
                  "Please complete your checkout payment securely using PayPal. Once approved, your subscription will activate immediately."}
              </p>
              {paymentMessage && (
                <div
                  className={`py-1.5 px-3 rounded text-[11px] font-medium text-center border ${
                    paymentMessage.includes("activated") || paymentMessage.includes("successfully")
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50"
                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50 animate-pulse"
                  }`}
                >
                  {paymentMessage}
                </div>
              )}
              <div
                id="paypal-button-container"
                className="my-2 min-h-[120px] flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-900/30 rounded-lg p-3 border border-zinc-200 dark:border-zinc-800 border-dashed"
              >
                <span className="text-xs text-zinc-400">
                  {t("plans.loadingPayPalCheckout") || "Loading PayPal Checkout..."}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0 space-y-3">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/10 p-3.5 space-y-3">
                <p className="text-xs text-zinc-500 text-center leading-normal">
                  {t("plans.transferInstructions") || "Transfer to any of the following accounts:"}
                </p>

                {/* CUENTAS BANCARIAS */}
                <div className="space-y-2 text-left">
                  <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                    {t("plans.bankAccountsTitle") || "CUENTAS BANCARIAS"}
                  </h4>

                  <div className="space-y-2">
                    {BANK_ACCOUNTS.map((bank) => {
                      const isCopied = copiedId === bank.id;
                      return (
                        <div
                          key={bank.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 space-y-1.5 shadow-2xs transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-6 w-6 rounded flex items-center justify-center shrink-0 shadow-2xs ${bank.logoBg} ${bank.borderColor}`}
                              >
                                {bank.logoSvg}
                              </div>
                              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                {bank.name}
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${bank.badgeBg}`}>
                              {t(bank.typeKey) || bank.type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-mono">
                            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                              <span className="text-[10px] text-zinc-400 font-sans uppercase">
                                {t("plans.accountNumberLabel") || "No. Cuenta:"}
                              </span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">{bank.accountNumber}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(bank.accountNumber, bank.id)}
                              className="text-[10px] font-sans flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title={t("plans.copy") || "Copy"}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-lg flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-sans uppercase font-medium">
                      {t("plans.referenceLabel") || "Reference:"}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{reference}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(reference, "reference")}
                    className="text-[10px] font-sans flex items-center gap-1 px-1.5 py-0.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {copiedId === "reference" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
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
                    className="w-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 py-1.5 rounded text-xs font-medium transition-opacity disabled:opacity-50 cursor-pointer shadow-2xs"
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
