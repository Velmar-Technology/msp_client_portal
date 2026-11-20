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
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-2">
      <div className="flex justify-between items-start pb-2 border-b border-border">
        <div>
          <p className="font-semibold text-foreground font-heading">{planName}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {billingCycle === "annual" ? t("plans.annualButtonLabel") : t("plans.planMonthly")} •{" "}
            {currentEquipmentCount}x {t("plans.equipmentCountSuffix")}
          </p>
        </div>
        <span className="font-semibold text-foreground font-mono">${subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-muted-foreground py-0.5">
        <span>{t("plans.taxes")}</span>
        <span className="font-mono">${tax.toFixed(2)}</span>
      </div>

      <div className="border-t border-border pt-2 flex justify-between items-center text-sm font-semibold">
        <span className="text-foreground">{t("plans.total")}</span>
        <span className="text-primary font-bold font-mono">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default OrderSummary;
