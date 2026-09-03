import { useTranslation } from "react-i18next";
import { Shield, Loader2 } from "lucide-react";
import type { Plan } from "../api/planService";
import type { Subscription } from "../api/subscriptionService";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export interface SubscriptionModifyFormProps {
  activeSub: Subscription;
  currentPlan: Plan;
  currentPlanName: string;
  currentEquipmentCount: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMessage: string | null;
  subscribeLoading: boolean;
  onClose?: () => void;
  onUpdateSubscription: (subId: string, count: number) => Promise<boolean | void>;
}

export function SubscriptionModifyForm({
  activeSub,
  currentPlan,
  currentPlanName,
  currentEquipmentCount,
  isAdmin,
  acceptedTos,
  setAcceptedTos,
  paymentMessage,
  subscribeLoading,
  onUpdateSubscription,
}: SubscriptionModifyFormProps) {
  const { t } = useTranslation();

  const isIncreaseCount = currentEquipmentCount > (activeSub.equipment_count || 1);
  const requiresPayment = !isAdmin && isIncreaseCount;
  const isSamePlanAndCount =
    currentPlan?.id === activeSub.plan && currentEquipmentCount === activeSub.equipment_count;

  if (isSamePlanAndCount) {
    return (
      <div className="space-y-3">
        <div className="bg-muted/40 border border-border rounded p-3">
          <p className="text-xs font-semibold text-foreground">
            {t("plans.alreadyOnThisPlan") || "You are already on this plan with the same device count."}
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-normal">
            {t("plans.alreadyOnThisPlanDesc") ||
              "To make changes, adjust the device count above or select a different plan tier."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-muted/40 border border-border rounded p-3">
        <p className="text-xs font-semibold text-foreground">
          {t("plans.subscriptionModification") || "Subscription Modification"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-normal">
          {t("plans.subscriptionModificationDesc", {
            name: currentPlanName,
            count: currentEquipmentCount,
          })}
        </p>
      </div>

      {!isAdmin && (
        <div className="flex items-start gap-2 p-2 bg-muted/40 rounded border border-border my-2">
          <Checkbox
            id="tos-checkbox-modify"
            checked={acceptedTos}
            onCheckedChange={(checked) => setAcceptedTos(checked === true)}
            className="mt-0.5"
          />
          <label
            htmlFor="tos-checkbox-modify"
            className="text-xs text-muted-foreground cursor-pointer select-none font-medium leading-normal"
          >
            {t("plans.agreeToTermsPrefix")}{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline hover:opacity-80 transition-opacity font-semibold"
            >
              {t("plans.termsOfServiceLink")}
            </a>
          </label>
        </div>
      )}

      {requiresPayment ? (
        <div className="mt-2 border-t border-border pt-3 space-y-3">
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-border">
              <span className="font-semibold text-foreground flex items-center gap-1.5 font-heading">
                <Shield className="h-3.5 w-3.5 text-primary" />
                {t("plans.secureCheckout") || "Secure Instant Checkout"}
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">
                PayPal &bull; Cards
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              {t("plans.addDevicesPaymentNotice") ||
                "Adding more devices requires a PayPal payment to activate the additional licenses immediately."}
            </p>

            <div
              id="paypal-upgrade-button-container"
              className="w-full min-h-27.5 relative z-0"
            >
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>{t("plans.loadingPayPal") || "Loading PayPal Checkout..."}</span>
              </div>
            </div>

            {paymentMessage && (
              <p className="text-xs text-foreground font-semibold mt-1.5">{paymentMessage}</p>
            )}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => onUpdateSubscription(activeSub.id, currentEquipmentCount)}
          disabled={subscribeLoading}
          className="w-full h-7 text-xs font-semibold cursor-pointer"
        >
          {subscribeLoading
            ? t("plans.updatingStatus") || "Updating..."
            : t("plans.updateSubscription") || "Update Subscription"}
        </Button>
      )}
    </div>
  );
}

export default SubscriptionModifyForm;
