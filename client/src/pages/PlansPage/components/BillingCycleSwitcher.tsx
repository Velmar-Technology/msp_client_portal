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
    <div className="bg-zinc-150/70 dark:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-700/50 p-0.5 rounded-md flex items-center gap-0.5 w-fit shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
      <button
        type="button"
        onClick={() => setBillingCycle("monthly")}
        className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer ${
          billingCycle === "monthly"
            ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border border-zinc-200/40 dark:border-zinc-850/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 border border-transparent"
        }`}
      >
        {t("plans.monthlyButtonLabel")}
      </button>
      <button
        type="button"
        onClick={() => setBillingCycle("annual")}
        className={`px-3 py-1 rounded-sm text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
          billingCycle === "annual"
            ? "bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 border border-zinc-200/40 dark:border-zinc-850/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 border border-transparent"
        }`}
      >
        {t("plans.annualButtonLabel")}
        <span
          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
            billingCycle === "annual" 
              ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950" 
              : "bg-zinc-200 text-zinc-650 dark:bg-zinc-750 dark:text-zinc-350"
          }`}
        >
          {t("plans.saveLabel")} 20%
        </span>
      </button>
    </div>
  );
}
