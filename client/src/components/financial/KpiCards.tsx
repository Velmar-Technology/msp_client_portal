import type { KpiCardData } from "@/hooks/useFinancialDashboard";
import { useTranslation } from "react-i18next";
import { DollarSign, TrendingUp, CreditCard, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface KpiCardsProps {
  kpis: KpiCardData[];
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const { t } = useTranslation();

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    revenue: DollarSign,
    mrr: TrendingUp,
    expenses: CreditCard,
    margin: Percent,
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const IconComponent = iconMap[kpi.key] || DollarSign;
        const TrendIcon = kpi.isPositiveTrend ? ArrowUpRight : ArrowDownRight;

        return (
          <div
            key={kpi.key}
            className="group rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs transition-all duration-200 hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {t(`financial.${kpi.titleKey}`)}
              </span>
              <div className="rounded-md bg-zinc-50 p-1.5 text-zinc-600 transition-colors group-hover:bg-zinc-100 dark:bg-zinc-900/50 dark:text-zinc-400 dark:group-hover:bg-zinc-900">
                <IconComponent className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-2.5 flex items-baseline justify-between">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {kpi.value}
              </h2>
              
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                  kpi.isPositiveTrend
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                <TrendIcon className="h-2.5 w-2.5 shrink-0" />
                {kpi.trend}
              </span>
            </div>

            <p className="mt-1 text-[9px] text-zinc-400 dark:text-zinc-500">
              {t("financial.vsLastMonth")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
