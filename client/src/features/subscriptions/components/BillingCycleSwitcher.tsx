import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { BillingCycle } from "../types";

export interface BillingCycleSwitcherProps {
  billingCycle: BillingCycle;
  setBillingCycle: (cycle: BillingCycle) => void;
}

export function BillingCycleSwitcher({
  billingCycle,
  setBillingCycle,
}: BillingCycleSwitcherProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-muted border border-border p-0.5 rounded-lg flex items-center gap-0.5 w-fit shadow-xs">
      <Button
        type="button"
        size="sm"
        variant={billingCycle === "monthly" ? "secondary" : "ghost"}
        onClick={() => setBillingCycle("monthly")}
        className="h-7 px-3 text-xs font-semibold cursor-pointer"
      >
        {t("plans.monthlyButtonLabel")}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={billingCycle === "annual" ? "secondary" : "ghost"}
        onClick={() => setBillingCycle("annual")}
        className="h-7 px-3 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
      >
        <span>{t("plans.annualButtonLabel")}</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
            billingCycle === "annual"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {t("plans.saveLabel")} 20%
        </span>
      </Button>
    </div>
  );
}

export default BillingCycleSwitcher;
