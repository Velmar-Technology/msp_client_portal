import { useTranslation } from "react-i18next";

export interface OrderSummaryProps {
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
