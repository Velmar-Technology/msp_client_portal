import { Check, X, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  onEdit: (plan: Plan) => void;
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

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`relative bg-zinc-50/50 dark:bg-zinc-950 dark:border-zinc-800 border rounded-lg p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 cursor-pointer text-zinc-900 dark:text-zinc-50 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md ${
        isSelected
          ? "border-zinc-900 dark:border-sky-500 ring-1 ring-zinc-900 dark:ring-sky-500/50 bg-zinc-100/60 dark:bg-zinc-900/50"
          : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
      } ${isPlanDisabled ? "opacity-60 bg-zinc-100/40 border-dashed" : ""}`}
    >
      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-zinc-900 dark:border-zinc-100 shadow-sm">
            {t("plans.recommended")}
          </span>
        </div>
      )}

      {/* Top Bar: Tier Badge & Badges/Actions */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-block px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-white/60 dark:bg-zinc-900/60">
              {getTierLabel(plan.id)}
            </span>
            {isPlanDisabled && (
              <span className="bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400 dark:border-red-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                {t("plans.disabledStatus") || "Disabled"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isCurrentlyActive && (
              <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
                {t("plans.activeStatus") || "Active"}
              </span>
            )}

            {isAdmin && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(plan);
                  }}
                  className="bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Edit className="h-3 w-3" />
                  {t("plans.editAction") || "Edit"}
                </button>
                {onDelete && !isPlanDisabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(plan.id);
                    }}
                    className="bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    title={t("plans.softDelete") || "Soft Delete"}
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("plans.deleteAction") || "Delete"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug">
          {getPlanName(plan.name)}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-2.5 leading-normal line-clamp-2">
          {getPlanDescription(plan.description)}
        </p>

        {/* Price Display */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
              ${Number.isInteger(priceVal) ? priceVal : priceVal.toFixed(2)}
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{t("plans.perMonth")}</span>
          </div>
          {billingCycle === "annual" && (
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
              {t("plans.billedAnnually", { price: (plan.price * 12 * 0.8).toFixed(2) })}
            </p>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-1.5 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {feature.included ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <X className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-700 shrink-0 mt-0.5" />
              )}
              <span
                className={`text-[11px] sm:text-xs leading-normal ${
                  feature.included
                    ? "text-zinc-700 dark:text-zinc-300 font-normal"
                    : "text-zinc-400 dark:text-zinc-600 font-normal line-through opacity-75"
                }`}
              >
                {getFeatureText(feature)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions Area */}
      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 space-y-2">
        {/* Equipment Stepper */}
        <div className="flex items-center justify-between bg-zinc-100/60 dark:bg-zinc-800/40 rounded border border-zinc-200/60 dark:border-zinc-800/60 px-2.5 py-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("plans.equipmentCount")}
          </span>
          <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 rounded px-1 py-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, -1);
              }}
              className="w-4.5 h-4.5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              −
            </button>
            <span className="w-5 text-center text-xs font-semibold font-mono">{equipmentCount}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, 1);
              }}
              className="w-4.5 h-4.5 rounded flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
