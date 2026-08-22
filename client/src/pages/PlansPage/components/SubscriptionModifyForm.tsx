import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface SubscriptionModifyFormProps {
  activeSub: Subscription;
  currentPlan: Plan;
  currentPlanName: string;
  currentEquipmentCount: number;
  isAdmin: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMessage: string | null;
  subscribeLoading: boolean;
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

  const isIncreaseCount = currentEquipmentCount > activeSub.equipment_count;
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
        <div className="mt-2 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2 leading-normal">
            {t("plans.addDevicesPaymentNotice") ||
              "Adding more devices requires a PayPal payment to activate the additional licenses immediately."}
          </p>
          <div
            id="paypal-upgrade-button-container"
            className="my-1.5 min-h-25 flex items-center justify-center bg-muted/20 rounded-md p-3 border border-border border-dashed"
          >
            <span className="text-xs text-muted-foreground">
              {t("plans.loadingPayPal") || "Loading PayPal Checkout..."}
            </span>
          </div>
          {paymentMessage && (
            <p className="text-xs text-foreground font-semibold mt-1.5">{paymentMessage}</p>
          )}
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
