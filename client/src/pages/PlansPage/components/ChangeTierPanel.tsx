import { useEffect } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import { SubscriptionModifyForm } from "./SubscriptionModifyForm";

interface ChangeTierPanelProps {
  subscription: Subscription;
  plans: Plan[];
  currentPlan: Plan | undefined;
  currentEquipmentCount: number;
  onSelectPlan: (planId: string) => void;
  onSyncEquipmentCount: (planId: string, count: number) => void;
  onAdjustEquipmentCount: (planId: string, delta: number) => void;
  onClose: () => void;
  onUpdateSubscription: (subId: string, count: number) => Promise<void>;
  subscribeLoading: boolean;
  acceptedTos: boolean;
  setAcceptedTos: (val: boolean) => void;
  paymentMessage: string | null;
  getPlanName: (name: string | Record<string, string>) => string;
}

export function ChangeTierPanel({
  subscription,
  plans,
  currentPlan,
  currentEquipmentCount,
  onSelectPlan,
  onSyncEquipmentCount,
  onAdjustEquipmentCount,
  onClose,
  onUpdateSubscription,
  subscribeLoading,
  acceptedTos,
  setAcceptedTos,
  paymentMessage,
  getPlanName,
}: ChangeTierPanelProps) {
  const { t } = useTranslation();

  useEffect(() => {
    onSelectPlan(subscription.plan);
    onSyncEquipmentCount(subscription.plan, subscription.equipment_count);
  }, [subscription.id, subscription.plan, subscription.equipment_count, onSelectPlan, onSyncEquipmentCount]);

  if (!currentPlan) return null;

  return (
    <div className="bg-card border border-primary ring-1 ring-primary rounded-lg p-4 shadow-xs mb-5 max-w-xl mx-auto text-foreground">
      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading">
            {t("plans.changeTierTitle")}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{subscription.service_name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("plans.cancel")}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="tier-change-plan-select"
            className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
          >
            {t("plans.selectNewTier")}
          </label>
          <select
            id="tier-change-plan-select"
            value={currentPlan.id}
            onChange={(e) => onSelectPlan(e.target.value)}
            className="w-full h-8.5 px-2 border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring bg-background text-foreground"
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {getPlanName(plan.name)} — ${plan.price}/mo
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between bg-muted/40 rounded border border-border px-2.5 py-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("plans.changeTierDevices")}
          </span>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded px-1 py-0.5">
            <button
              type="button"
              aria-label={t("plans.removeDevice") || "Remove Device"}
              onClick={() => onAdjustEquipmentCount(currentPlan.id, -1)}
              className="w-4.5 h-4.5 rounded flex items-center justify-center hover:bg-muted transition-colors text-xs font-semibold cursor-pointer text-foreground"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-5 text-center text-xs font-semibold font-mono text-foreground">
              {currentEquipmentCount}
            </span>
            <button
              type="button"
              aria-label={t("plans.addDevice") || "Add Device"}
              onClick={() => onAdjustEquipmentCount(currentPlan.id, 1)}
              className="w-4.5 h-4.5 rounded flex items-center justify-center hover:bg-muted transition-colors text-xs font-semibold cursor-pointer text-foreground"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <SubscriptionModifyForm
          activeSub={subscription}
          currentPlan={currentPlan}
          currentPlanName={getPlanName(currentPlan.name)}
          currentEquipmentCount={currentEquipmentCount}
          isAdmin={false}
          acceptedTos={acceptedTos}
          setAcceptedTos={setAcceptedTos}
          paymentMessage={paymentMessage}
          subscribeLoading={subscribeLoading}
          onUpdateSubscription={onUpdateSubscription}
        />
      </div>
    </div>
  );
}

export default ChangeTierPanel;
