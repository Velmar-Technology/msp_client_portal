import type { KpiCardData } from "../hooks/useFinancialDashboard";
import { useTranslation } from "react-i18next";
import { DollarSign, TrendingUp, CreditCard, Percent } from "lucide-react";
import { SummaryCard } from "@/components/shared";

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

        return (
          <SummaryCard
            key={kpi.key}
            icon={<IconComponent className="h-3.5 w-3.5" />}
            title={t(`financial.${kpi.titleKey}`)}
            value={kpi.value}
            trend={kpi.trend}
            isPositiveTrend={kpi.isPositiveTrend}
            subtitle={t("financial.vsLastMonth")}
          />
        );
      })}
    </div>
  );
}
