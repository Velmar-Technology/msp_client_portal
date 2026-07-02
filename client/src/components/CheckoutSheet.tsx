import React from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";

interface CheckoutSheetProps {
  currentPlan: Plan;
  billingCycle: "monthly" | "annual";
  currentEquipmentCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (accepted: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (method: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: () => void;
  activeSubscriptions: Subscription[];
  getPlanName: (name: string | Record<string, string>) => string;
}

// 1. Order Summary Sub-component
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
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-body-md font-semibold text-on-surface">
            {planName} {billingCycle === "annual" ? "Plan (Annually)" : t("plans.planMonthly")}
          </p>
          <p className="text-label-sm text-on-surface-variant mt-0.5">
            {currentEquipmentCount}x {t("plans.equipmentCountSuffix")}
          </p>
        </div>
        <span className="text-body-md font-semibold text-on-surface">${subtotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between text-body-md text-on-surface-variant">
        <span>{t("plans.taxes")}</span>
        <span>${tax.toFixed(2)}</span>
      </div>
      <div className="border-t border-outline-variant pt-3 flex justify-between">
        <span className="text-body-md font-bold text-on-surface">{t("plans.total")}</span>
        <span className="text-body-md font-bold text-primary text-lg">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// 2. Payment Fields Sub-component
interface PaymentFieldsProps {
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (accepted: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (method: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: () => void;
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

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <div className="flex items-start gap-2.5 p-3 bg-surface-container rounded-lg border border-outline-variant mb-4">
          <input
            type="checkbox"
            id="tos-checkbox"
            checked={acceptedTos}
            onChange={(e) => setAcceptedTos(e.target.checked)}
            className="h-4 w-4 rounded border-outline text-primary focus:ring-primary mt-1 cursor-pointer"
          />
          <label htmlFor="tos-checkbox" className="text-body-sm text-on-surface cursor-pointer select-none">
            {t("plans.agreeToTermsPrefix")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors font-medium"
            >
              {t("plans.termsOfServiceLink")}
            </a>
          </label>
        </div>
      )}

      <h2 className="text-h2 text-primary mb-4" style={{ fontFamily: "var(--font-heading)" }}>
        {t("plans.paymentMethod")}
      </h2>

      <div className="flex gap-0 mb-4 border-b border-outline-variant">
        <button
          onClick={() => setPaymentMethod("card")}
          className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
            paymentMethod === "card"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {t("plans.creditCard")}
        </button>
        <button
          onClick={() => setPaymentMethod("transfer")}
          className={`px-4 py-2.5 text-label-md transition-colors cursor-pointer ${
            paymentMethod === "transfer"
              ? "border-b-2 border-primary text-primary"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {t("plans.bankTransfer")}
        </button>
      </div>

      <div className="space-y-4">
        {paymentMethod === "card" ? (
          <>
            <p className="text-body-md text-on-surface-variant mb-4">
              Please complete your checkout payment securely using PayPal. Once approved, your subscription will
              activate immediately.
            </p>
            {paymentMessage && (
              <div
                className={`p-3 rounded-lg mb-4 text-label-md font-semibold text-center ${
                  paymentMessage.includes("activated") || paymentMessage.includes("successfully")
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary animate-pulse"
                }`}
              >
                {paymentMessage}
              </div>
            )}
            <div
              id="paypal-button-container"
              className="my-4 min-h-[150px] flex items-center justify-center bg-surface rounded-xl p-4 border border-outline-variant border-dashed"
            >
              <span className="text-label-md text-on-surface-variant">Loading PayPal Checkout...</span>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-body-md text-on-surface-variant space-y-4">
            <p className="mb-2">{t("plans.transferInstructions")}</p>
            <p className="text-mono font-medium text-on-surface">{t("plans.bankName")}</p>
            <p className="text-mono">{t("plans.bankAccount")}</p>
            <p className="text-mono">
              {t("plans.bankReference")}: {reference}
            </p>
            <button
              onClick={handleProcessSubscription}
              disabled={subscribeLoading}
              className="mt-4 w-full bg-primary text-on-primary py-3 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-semibold"
            >
              {subscribeLoading ? "Processing..." : "Confirm Bank Transfer Intent"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 3. Main CheckoutSheet Component
export function CheckoutSheet({
  currentPlan,
  billingCycle,
  currentEquipmentCount,
  subtotal,
  tax,
  total,
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

  if (currentPlan) {
    const alreadySubscribed = activeSubscriptions.some(
      (sub) => sub.plan === currentPlan.id && sub.status === "ACTIVE"
    );
    if (alreadySubscribed) {
      return (
        <div className="bg-warning/15 border border-warning/30 p-4 rounded-xl text-center space-y-2 my-4">
          <p className="text-body-md font-semibold text-warning">Active Plan Already Registered</p>
          <p className="text-body-sm text-on-surface-variant">
            You already have an active subscription for the <strong>{getPlanName(currentPlan.name)}</strong> plan. To
            change device slots or update details, please use the modification tools on the active subscription
            manager.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-4 text-center py-4">
      <p className="text-body-md text-on-surface-variant">
        Ready to activate your <strong>{getPlanName(currentPlan.name)}</strong> subscription?
      </p>
      <Sheet>
        <SheetTrigger asChild>
          <button className="w-full bg-primary text-on-primary py-3.5 rounded-lg text-label-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer font-bold shadow-md">
            Proceed to Checkout (${total.toFixed(2)})
          </button>
        </SheetTrigger>
        <SheetContent className="w-[400px] p-6 sm:w-[500px] overflow-y-auto bg-surface text-on-surface border-l border-outline-variant">
          <SheetHeader className="pb-4 border-b p-2 border-outline-variant">
            <SheetTitle className="text-h3 text-primary">{t("plans.orderSummary")}</SheetTitle>
          </SheetHeader>

          {/* Order Summary Details */}
          <div className="py-6 space-y-6">
            <OrderSummary
              planName={getPlanName(currentPlan.name)}
              billingCycle={billingCycle}
              currentEquipmentCount={currentEquipmentCount}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />

            {/* Payment Fields inside the Sheet */}
            <div className="border-t border-outline-variant pt-6">
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

            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-4 flex items-start gap-3">
              <Shield className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <div>
                <p className="text-label-md font-medium text-on-surface">{t("plans.encryptedTx")}</p>
                <p className="text-label-sm text-on-surface-variant mt-0.5">{t("plans.militaryGradeSecurity")}</p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
