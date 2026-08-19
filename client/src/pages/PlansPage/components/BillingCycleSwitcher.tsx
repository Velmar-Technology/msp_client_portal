import { useTranslation } from "react-i18next";

interface BillingCycleSwitcherProps {
  billingCycle: "monthly" | "annual";
  setBillingCycle: (cycle: "monthly" | "annual") => void;
}

export function BillingCycleSwitcher({
  billingCycle,
  setBillingCycle,
}: BillingCycleSwitcherProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-muted border border-border p-0.5 rounded-md flex items-center gap-0.5 w-fit shadow-xs">
      <button
        type="button"
        onClick={() => setBillingCycle("monthly")}
        className={`px-3 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer ${
          billingCycle === "monthly"
            ? "bg-card text-foreground border border-border shadow-xs"
            : "text-muted-foreground hover:text-foreground border border-transparent"
        }`}
      >
        {t("plans.monthlyButtonLabel")}
      </button>
      <button
        type="button"
        onClick={() => setBillingCycle("annual")}
        className={`px-3 py-1 rounded-xs text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
          billingCycle === "annual"
            ? "bg-card text-foreground border border-border shadow-xs"
            : "text-muted-foreground hover:text-foreground border border-transparent"
        }`}
      >
        {t("plans.annualButtonLabel")}
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
            billingCycle === "annual" 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted-foreground/20 text-muted-foreground"
          }`}
        >
          {t("plans.saveLabel")} 20%
        </span>
      </button>
    </div>
  );
}

export default BillingCycleSwitcher;
