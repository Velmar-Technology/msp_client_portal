import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Subscription } from "@/features/subscriptions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface SubscriptionSelectorProps {
  subscriptions: Subscription[];
  selectedId: string;
  onChange: (id: string) => void;
}

/**
 * Compact Subscription Selector sub-component for switching between multiple client subscriptions.
 */
export const SubscriptionSelector = memo(function SubscriptionSelector({
  subscriptions,
  selectedId,
  onChange,
}: SubscriptionSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="active-sub-select-devices"
        className="text-[10px] uppercase font-bold text-muted-foreground select-none shrink-0"
      >
        {t("nav.subscriptions", "Subscription")}
      </label>
      <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
        <Select value={selectedId} onValueChange={onChange}>
          <SelectTrigger
            id="active-sub-select-devices"
            aria-label={t("devices.selectSubscription")}
            size="default"
            className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5 w-48 sm:w-56"
          >
            <SelectValue placeholder={t("devices.selectSubscription")} />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {subscriptions.map((sub) => (
              <SelectItem key={sub.id} value={sub.id} className="text-xs font-medium cursor-pointer">
                {t("devices.subOptionLabel", {
                  name: sub.service_name,
                  devicesStr: t("devices.devicesCount", { count: sub.equipment_count }),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});
