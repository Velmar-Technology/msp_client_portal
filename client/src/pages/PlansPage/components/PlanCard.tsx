import { Check, X, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { Plan, PlanFeature } from "@/services/planService";
import type { Subscription } from "@/services/subscriptionService";

interface PlanCardProps {
  plan: Plan;
  selectedPlan: string;
  billingCycle: "monthly" | "annual";
  equipmentCount: number;
  isAdmin: boolean;
  activeSubscriptions: Subscription[];
  onSelect: (planId: string) => void;
  onEdit?: (plan: Plan) => void;
  onDelete?: (planId: string) => void;
  onAdjustEquipmentCount: (planId: string, delta: number) => void;
  getPlanName: (name: string | Record<string, string>) => string;
  getPlanDescription: (desc: string | Record<string, string> | null | undefined) => string;
  getFeatureText: (featureOrText: PlanFeature | string | Record<string, string>) => string;
  getTierLabel: (planId: string) => string;
}

export function PlanCard({
  plan,
  selectedPlan,
  billingCycle,
  equipmentCount,
  isAdmin,
  activeSubscriptions,
  onSelect,
  onEdit,
  onDelete,
  onAdjustEquipmentCount,
  getPlanName,
  getPlanDescription,
  getFeatureText,
  getTierLabel,
}: PlanCardProps) {
  const { t } = useTranslation();
  const isSelected = selectedPlan === plan.id;
  const isPlanDisabled = plan.active === false;

  const priceVal = billingCycle === "annual" ? plan.price * 0.8 : plan.price;
  const isCurrentlyActive = !isAdmin && activeSubscriptions.some((sub) => sub.plan === plan.id);

  const CLIENT_TYPE_LABEL_KEYS: Record<string, string> = {
    CLIENT: "plans.clientTypes.standard",
    ENTERPRISE: "plans.clientTypes.enterprise",
    STUDENT: "plans.clientTypes.student",
    OTHER: "plans.clientTypes.other",
  };
  const clientTypeLabelKey =
    CLIENT_TYPE_LABEL_KEYS[plan.client_type || "CLIENT"] || "plans.clientTypes.other";

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`relative bg-card border rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer text-foreground shadow-xs hover:shadow-md ${
        isSelected
          ? "border-primary ring-1 ring-primary bg-primary/5"
          : "border-border hover:border-border/80"
      } ${isPlanDisabled ? "opacity-60 bg-muted/40 border-dashed" : ""}`}
    >
      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-primary shadow-xs">
            {t("plans.recommended")}
          </span>
        </div>
      )}

      {/* Top Bar: Tier Badge & Badges/Actions */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-block px-1.5 py-0.5 border border-border rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
              {getTierLabel(plan.id)}
            </span>
            <span className="inline-block px-1.5 py-0.5 border border-border rounded text-[9px] font-semibold tracking-wide text-muted-foreground bg-muted/50">
              {t(clientTypeLabelKey)}
            </span>
            {isPlanDisabled && (
              <span className="bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                {t("plans.disabledStatus") || "Disabled"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentlyActive && (
              <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
                {t("plans.activeStatus") || "Active"}
              </span>
            )}

            {isAdmin && onEdit && (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onEdit(plan);
                  }}
                  className="h-6 px-1.5 py-0 text-[10px] font-medium cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Edit className="h-3 w-3" />
                  {t("plans.editAction") || "Edit"}
                </Button>
                {onDelete && !isPlanDisabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onDelete(plan.id);
                    }}
                    className="h-6 px-1.5 py-0 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-[10px] font-medium cursor-pointer flex items-center gap-1 shrink-0"
                    title={t("plans.softDelete") || "Soft Delete"}
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("plans.deleteAction") || "Delete"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm sm:text-base font-bold text-foreground font-heading tracking-tight leading-snug">
          {getPlanName(plan.name)}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 mb-2.5 leading-normal line-clamp-2">
          {getPlanDescription(plan.description)}
        </p>

        {/* Price Display */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              ${Number.isInteger(priceVal) ? priceVal : priceVal.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{t("plans.perMonth")}</span>
          </div>
          {billingCycle === "annual" && (
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              {t("plans.billedAnnually", { price: (plan.price * 12 * 0.8).toFixed(2) })}
            </p>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-1.5 pt-1 border-t border-border">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {feature.included ? (
                <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              ) : (
                <X className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
              )}
              <span
                className={`text-[11px] sm:text-xs leading-normal ${
                  feature.included
                    ? "text-foreground font-normal"
                    : "text-muted-foreground font-normal line-through opacity-75"
                }`}
              >
                {getFeatureText(feature)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions Area */}
      <div className="mt-3 pt-2 border-t border-border space-y-2">
        {/* Equipment Stepper */}
        <div className="flex items-center justify-between bg-muted/40 rounded border border-border px-2.5 py-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("plans.equipmentCount")}
          </span>
          <div className="flex items-center gap-1.5 bg-card border border-border rounded px-1 py-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, -1);
              }}
              className="h-5 w-5 rounded text-xs font-semibold cursor-pointer"
            >
              −
            </Button>
            <span className="w-5 text-center text-xs font-semibold font-mono text-foreground">{equipmentCount}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, 1);
              }}
              className="h-5 w-5 rounded text-xs font-semibold cursor-pointer"
            >
              +
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlanCard;
