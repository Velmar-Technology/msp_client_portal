import { type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import type { Plan } from "../api/planService";
import type { Subscription } from "../api/subscriptionService";
import type { BillingCycle } from "../types";
import { CheckoutSheet } from "@/components/checkout-sheet";

export interface PaymentSectionProps {
  currentPlan: Plan;
  billingCycle: BillingCycle;
  currentEquipmentCount: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMethod: "card" | "transfer";
  setPaymentMethod: (val: "card" | "transfer") => void;
  paymentMessage: string | null;
  reference: string;
  subscribeLoading: boolean;
  handleProcessSubscription: (e?: SyntheticEvent) => Promise<void>;
  activeSubscriptions: Subscription[];
  getPlanName: (name: string | Record<string, string>) => string;
  autoRenew?: boolean;
  setAutoRenew?: (val: boolean) => void;
}

export function PaymentSection({
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
  autoRenew,
  setAutoRenew,
}: PaymentSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-xs text-foreground">
      {/* Header Banner */}
      <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading">
            {t("plans.planTitle", { name: getPlanName(currentPlan.name) }) || `${getPlanName(currentPlan.name)} Plan`}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {currentEquipmentCount}x {t("plans.equipmentCountSuffix")} •{" "}
            {billingCycle === "annual"
              ? t("plans.annualButtonLabel") || "Annually"
              : t("plans.monthlyButtonLabel") || "Monthly"}
          </p>
        </div>
      </div>

      <CheckoutSheet
        currentPlan={currentPlan}
        billingCycle={billingCycle}
        currentEquipmentCount={currentEquipmentCount}
        isAdmin={isAdmin}
        acceptedTos={acceptedTos}
        setAcceptedTos={setAcceptedTos}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentMessage={paymentMessage}
        reference={reference}
        subscribeLoading={subscribeLoading}
        handleProcessSubscription={handleProcessSubscription}
        activeSubscriptions={activeSubscriptions}
        getPlanName={getPlanName}
        autoRenew={autoRenew}
        setAutoRenew={setAutoRenew}
      />
    </div>
  );
}

export default PaymentSection;
