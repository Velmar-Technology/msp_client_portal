import { Check, X, Edit } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/planService";
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
  onAdjustEquipmentCount: (planId: string, delta: number) => void;
  getPlanName: (name: string | Record<string, string>) => string;
  getPlanDescription: (desc: string | Record<string, string> | null | undefined) => string;
  getFeatureText: (text: string | Record<string, string>) => string;
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

  return (
    <div
      onClick={() => onSelect(plan.id)}
      className={`relative bg-zinc-50/40 dark:bg-zinc-900/10 border rounded-lg p-4.5 flex flex-col justify-between transition-all duration-200 cursor-pointer text-zinc-900 dark:text-zinc-50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] ${
        isSelected
          ? "border-zinc-900 dark:border-[#3fa3ff] ring-1 ring-zinc-900 dark:ring-[#3fa3ff] bg-zinc-50/90 dark:bg-zinc-900/40"
          : "border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700/80"
      } ${isPlanDisabled ? "opacity-65 bg-zinc-100/30 border-dashed" : ""}`}
    >
      {/* Disabled Badge */}
      {isPlanDisabled && (
        <div className="absolute top-4.0 left-[25.0%]">
          <span className="bg-red-500/10 text-red-700 border border-red-500/20 dark:text-red-400 dark:border-red-500/10 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider">
            {t("plans.disabledStatus") || "Disabled"}
          </span>
        </div>
      )}

      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <span className="bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border border-zinc-900 dark:border-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            {t("plans.recommended")}
          </span>
        </div>
      )}

      {/* Admin Edit Trigger */}
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(plan);
          }}
          className="absolute top-2.5 right-2.5 bg-white hover:bg-zinc-50 dark:text-black dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 border border-zinc-200/60 dark:border-zinc-700/60 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer text-zinc-650 flex items-center gap-1 z-10"
        >
          <Edit className="h-3 w-3" />
          {t("plans.editAction") || "Edit"}
        </button>
      )}

      {/* Active Status Badge */}
      {!isAdmin && activeSubscriptions.some((sub) => sub.plan === plan.id) && (
        <span className="absolute top-2.5 right-2.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold animate-pulse z-10">
          {t("plans.activeStatus") || "Active"}
        </span>
      )}

      <div>
        <span className="inline-block mb-2 px-1.5 py-0.2 border border-zinc-200 dark:border-zinc-800 rounded font-mono text-[9px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {getTierLabel(plan.id)}
        </span>

        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-0.5 tracking-tight">
          {getPlanName(plan.name)}
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3.5 font-normal leading-normal">
          {getPlanDescription(plan.description)}
        </p>

        <div className="mb-4">
          <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
            ${Number.isInteger(priceVal) ? priceVal : priceVal.toFixed(2)}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{t("plans.perMonth")}</span>
          {billingCycle === "annual" ? (
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium">
              {t("plans.billedAnnually", { price: (plan.price * 12 * 0.8).toFixed(2) })}
            </div>
          ) : (
            <div className="text-[10px] opacity-0 select-none mt-0.5">Placeholder</div>
          )}
        </div>

        <div className="space-y-2 flex-1">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-1.5">
              {feature.included ? (
                <Check className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
              ) : (
                <X className="h-3.5 w-3.5 text-zinc-300 dark:text-zinc-750 shrink-0 mt-0.5" />
              )}
              <span
                className={`text-xs ${
                  feature.included
                    ? "text-zinc-500 dark:text-zinc-250 font-normal"
                    : "text-zinc-400 dark:text-zinc-600 font-normal"
                }`}
              >
                {getFeatureText(feature.text)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {/* Equipment Count Selector inside Card */}
        <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-zinc-800/40 rounded border border-zinc-200/50 dark:border-zinc-800/50 p-2 mb-2.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("plans.equipmentCount")}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, -1);
              }}
              className="w-5.5 h-5.5 border border-zinc-250/70 dark:border-zinc-700 rounded flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              −
            </button>
            <span className="w-6 text-center text-xs font-semibold font-mono">{equipmentCount}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdjustEquipmentCount(plan.id, 1);
              }}
              className="w-5.5 h-5.5 border border-zinc-250/70 dark:border-zinc-700 rounded flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold cursor-pointer text-zinc-700 dark:text-zinc-300"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          className={`w-full py-1.5 rounded text-xs font-semibold transition-all cursor-pointer border ${
            isSelected
              ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 hover:opacity-90"
              : "border-zinc-200 text-zinc-800 hover:bg-zinc-100/50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900/50"
          }`}
        >
          {isSelected
            ? `${t("plans.selected")}: ${getPlanName(plan.name)}`
            : `${t("plans.select")} ${getPlanName(plan.name)}`}
        </button>
      </div>
    </div>
  );
}
