import { memo } from "react";
import { Laptop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="p-8 shadow-xs border-border flex flex-col items-center justify-center text-center space-y-3 max-w-md mx-auto">
      <span className="p-3 bg-muted text-muted-foreground rounded-full border border-border inline-flex">
        <Laptop className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground font-heading">{t("devices.noActiveSubscriptions")}</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t("devices.noActiveSubscriptionsDesc")}</p>
      </div>
      <Button
        type="button"
        size="default"
        onClick={onBrowsePlans}
        className="h-8 px-4 text-xs font-semibold cursor-pointer"
      >
        {t("devices.browseSupportPlans")}
      </Button>
    </Card>
  );
});
