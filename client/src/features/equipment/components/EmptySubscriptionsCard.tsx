import { memo } from "react";
import { Laptop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/Page";

export interface EmptySubscriptionsCardProps {
  onBrowsePlans: () => void;
}

/**
 * High-Density Empty Subscriptions Card Sub-component.
 * Displayed when non-admin client has 0 active support subscriptions.
 */
export const EmptySubscriptionsCard = memo(function EmptySubscriptionsCard({
  onBrowsePlans,
}: EmptySubscriptionsCardProps) {
  const { t } = useTranslation();
  return (
    <Page.EmptyState
      icon={Laptop}
      title={t("devices.noActiveSubscriptions")}
      description={t("devices.noActiveSubscriptionsDesc")}
      primaryAction={{
        label: t("devices.browseSupportPlans"),
        onClick: onBrowsePlans,
      }}
    />
  );
});
