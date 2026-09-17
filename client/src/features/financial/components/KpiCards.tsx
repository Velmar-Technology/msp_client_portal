import type { KpiCardData } from "../hooks/useFinancialDashboard";
import { useTranslation } from "react-i18next";
import { DollarSign, TrendingUp, CreditCard, Percent } from "lucide-react";
import { Page } from "@/components/Page";

interface KpiCardsProps {
  kpis: KpiCardData[];
}

export const KPI_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  revenue: DollarSign,
  mrr: TrendingUp,
  expenses: CreditCard,
  margin: Percent,
};

export function KpiCards({ kpis }: KpiCardsProps) {
  const { t } = useTranslation();

  return (
    <Page.Dashboard cols={4} gap="sm">
      {kpis.map((kpi) => {
        const IconComponent = KPI_ICON_MAP[kpi.key] || DollarSign;

        return (
          <Page.DashboardKpi
            key={kpi.key}
            icon={IconComponent}
            title={t(`financial.${kpi.titleKey}`)}
            value={kpi.value}
            trend={{
              value: kpi.trend,
              direction: kpi.isNeutralTrend ? "neutral" : kpi.isPositiveTrend ? "up" : "down",
              isPositive: kpi.isPositiveTrend,
            }}
            subtitle={t("financial.vsLastMonth")}
          />
        );
      })}
    </Page.Dashboard>
  );
}

