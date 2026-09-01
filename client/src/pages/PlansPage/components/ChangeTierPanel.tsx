import { useEffect } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label={t("plans.cancel")}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="tier-change-plan-select"
            className="block text-[10px] text-muted-foreground mb-1 font-semibold uppercase tracking-wider"
          >
            {t("plans.selectNewTier")}
          </label>
          <Select
            value={currentPlan.id}
            onValueChange={(val) => onSelectPlan(val)}
          >
            <SelectTrigger id="tier-change-plan-select" aria-label={t("plans.selectNewTier")} size="default" className="w-full text-xs">
              <SelectValue placeholder={t("plans.selectNewTier")} />
            </SelectTrigger>
            <SelectContent>
              {plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {getPlanName(plan.name)} — ${plan.price}/mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between bg-muted/40 rounded border border-border px-2.5 py-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("plans.changeTierDevices")}
          </span>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded px-1 py-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("plans.removeDevice") || "Remove Device"}
              onClick={() => onAdjustEquipmentCount(currentPlan.id, -1)}
              className="cursor-pointer text-foreground"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-5 text-center text-xs font-semibold font-mono text-foreground">
              {currentEquipmentCount}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={t("plans.addDevice") || "Add Device"}
              onClick={() => onAdjustEquipmentCount(currentPlan.id, 1)}
              className="cursor-pointer text-foreground"
            >
              <Plus className="h-3 w-3" />
            </Button>
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
