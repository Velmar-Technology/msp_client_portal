import { useMemo, useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { Shield, Copy, Check, Building2 } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";

interface CheckoutSheetProps {
  currentPlan: Plan;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (accepted: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (method: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e?: SyntheticEvent) => void;
  activeSubscriptions: Subscription[];
  getPlanName: (name: string | Record<string, string>) => string;
}

// Bank Account Information definition for Dominican Banks
interface BankAccountInfo {
  id: string;
  name: string;
  accountNumber: string;
  type: string;
  typeKey: string;
  logoBg: string;
  borderColor: string;
  badgeBg: string;
  logoSvg: React.ReactNode;
}

const BANK_ACCOUNTS: BankAccountInfo[] = [
  {
    id: "popular",
    name: "Banco Popular",
    accountNumber: "821193257",
    type: "Corriente (Checking)",
    typeKey: "plans.typeCorriente",
    logoBg: "bg-[#003876]",
    borderColor: "border-[#002b66]",
    badgeBg: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-white" aria-label="Banco Popular Logo">
        <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" opacity="0.4" />
        <path d="M6 6h3v3H6V6zm10 0h2v2h-2V6zM6 16h2v2H6v-2zm9-1h3v3h-3v-3z" />
        <circle cx="12" cy="12" r="2.5" className="fill-amber-400" />
      </svg>
    ),
  },
  {
    id: "banreservas",
    name: "Banreservas",
    accountNumber: "9603579099",
    type: "Corriente (Checking)",
    typeKey: "plans.typeCorriente",
    logoBg: "bg-[#0091DA]",
    borderColor: "border-[#0070a8]",
    badgeBg: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/50",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-white" aria-label="Banreservas Logo">
        <path d="M3 17.5C6 14.5 9 14.5 12 17.5C15 20.5 18 20.5 21 17.5V13.5C18 16.5 15 16.5 12 13.5C9 10.5 6 10.5 3 13.5V17.5Z" />
        <path d="M3 10.5C6 7.5 9 7.5 12 10.5C15 13.5 18 13.5 21 10.5V6.5C18 9.5 15 9.5 12 6.5C9 3.5 6 3.5 3 6.5V10.5Z" opacity="0.8" />
      </svg>
    ),
  },
  {
    id: "bhd",
    name: "Banco BHD",
    accountNumber: "29949640016",
    type: "Ahorro (Savings)",
    typeKey: "plans.typeAhorro",
    logoBg: "bg-[#00875A]",
    borderColor: "border-[#006b47]",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50",
    logoSvg: (
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-white" aria-label="Banco BHD Logo">
        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.8L18 8v8l-6 3.75L6 16V8l6-3.2z" />
        <path d="M12 8a3 3 0 100 6 3 3 0 000-6zm0 1.8a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
      </svg>
    ),
  },
];

// 1. High-Density Order Summary Sub-component
interface OrderSummaryProps {
  planName: string;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
  subtotal: number;
  tax: number;
  total: number;
}

export function OrderSummary({
  planName,
  billingCycle,
  currentEquipmentCount,
  subtotal,
  tax,
  total,
}: OrderSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-xs space-y-2">
      <div className="flex justify-between items-start pb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{planName}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {billingCycle === "annual" ? t("plans.annualButtonLabel") : t("plans.planMonthly")} •{" "}
            {currentEquipmentCount}x {t("plans.equipmentCountSuffix")}
          </p>
        </div>
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-zinc-500 py-0.5">
        <span>{t("plans.taxes")}</span>
        <span>${tax.toFixed(2)}</span>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-2 flex justify-between items-center text-sm font-semibold">
        <span className="text-zinc-950 dark:text-zinc-50">{t("plans.total")}</span>
        <span className="text-primary font-bold">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// 2. High-Density Payment Fields Sub-component
interface PaymentFieldsProps {
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
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${bank.badgeBg}`}
                            >
                              {t(bank.typeKey) || bank.type}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs font-mono">
                            <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                              <span className="text-[10px] text-zinc-400 font-sans uppercase">
                                {t("plans.accountNumberLabel") || "No. Cuenta:"}
                              </span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                {bank.accountNumber}
                              </span>
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

// 3. Premium SaaS Parent Component
export function CheckoutSheet({
  currentPlan,
  billingCycle,
  currentEquipmentCount,
  isAdmin,
  acceptedTos,
  setAcceptedTos,
  paymentMethod,
  setPaymentMethod,
  paymentMessage,
  reference,
  subscribeLoading,
  handleProcessSubscription,
  activeSubscriptions,
  getPlanName,
}: CheckoutSheetProps) {
  const { t } = useTranslation();

  // Dynamic calculations via memoization (separation of concerns)
  const priceMultiplier = useMemo(() => {
    return billingCycle === "annual" ? 12 * 0.8 : 1;
  }, [billingCycle]);

  const subtotal = useMemo(() => {
    if (!currentPlan) return 0;
    return Math.round(currentPlan.price * priceMultiplier * currentEquipmentCount * 100) / 100;
  }, [currentPlan, priceMultiplier, currentEquipmentCount]);

  const tax = useMemo(() => {
    return Math.round(subtotal * 0.18 * 100) / 100;
  }, [subtotal]);

  const total = useMemo(() => {
    return Math.round((subtotal + tax) * 100) / 100;
  }, [subtotal, tax]);

  if (currentPlan) {
    const alreadySubscribed = activeSubscriptions.some((sub) => sub.plan === currentPlan.id && sub.status === "ACTIVE");
    if (alreadySubscribed) {
      return (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/15 p-3.5 text-center text-xs space-y-1.5 my-4">
          <p className="font-semibold text-amber-800 dark:text-amber-400">
            {t("plans.activePlanAlreadyRegistered") || "Active Plan Already Registered"}
          </p>
          <p className="text-zinc-600 dark:text-zinc-400 leading-normal">
            {t("plans.alreadySubscribedDesc", { name: getPlanName(currentPlan.name) })}
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-3 text-center py-2">
      <p className="text-xs text-zinc-500 leading-relaxed">
        {t("plans.readyToActivate", { name: getPlanName(currentPlan.name) })}
      </p>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 py-2 rounded text-xs font-semibold transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-sm">
            {t("plans.proceedToCheckout", { total: total.toFixed(2) })}
          </button>
        </SheetTrigger>
        <SheetContent className="w-[380px] p-4 sm:w-[440px] overflow-y-auto bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border-l border-zinc-200 dark:border-zinc-800">
          <SheetHeader className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <SheetTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {t("plans.orderSummary")}
            </SheetTitle>
          </SheetHeader>

          {/* Order Summary & Payment Fields */}
          <div className="py-4 space-y-4">
            <OrderSummary
              planName={getPlanName(currentPlan.name)}
              billingCycle={billingCycle}
              currentEquipmentCount={currentEquipmentCount}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />

            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <PaymentFields
                isAdmin={isAdmin}
                acceptedTos={acceptedTos}
                setAcceptedTos={setAcceptedTos}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                paymentMessage={paymentMessage}
                reference={reference}
                subscribeLoading={subscribeLoading}
                handleProcessSubscription={handleProcessSubscription}
              />
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/20 p-3 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">{t("plans.encryptedTx")}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-normal">{t("plans.militaryGradeSecurity")}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
