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
 * Styled with an ElevenLabs pill aesthetic while preserving exact Radix Select semantics and a11y labels.
 */
export const SubscriptionSelector = memo(function SubscriptionSelector({
  subscriptions,
  selectedId,
  onChange,
}: SubscriptionSelectorProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center">
      <Select value={selectedId} onValueChange={onChange}>
        <SelectTrigger
          id="active-sub-select-devices"
          aria-label={t("devices.selectSubscription")}
          size="default"
          className="h-7 px-3 rounded-full text-xs font-medium border border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-2xs gap-1.5 w-auto max-w-xs"
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
  );
});
