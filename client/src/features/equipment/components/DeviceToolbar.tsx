import { memo } from "react";
import { Search, Plus, Laptop } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subscription } from "@/features/subscriptions";
import { SubscriptionSelector } from "./SubscriptionSelector";

export interface DeviceToolbarProps {
  isAdmin: boolean;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  activeSubscriptions: Subscription[];
  selectedSubscriptionId?: string;
  activeSubId?: string;
  onSelectSubscription: (id: string) => void;
  uniqueClients: { id: string; name: string }[];
  selectedClient?: string;
  onSelectClient: (client: string) => void;
  clientFilterOptions: { value: string; label: string }[];
  selectedPlan?: string;
  onSelectPlan: (plan: string) => void;
  planFilterOptions: { value: string; label: string }[];
  selectedStatus?: string;
  onSelectStatus: (status: string) => void;
  statusFilterOptions: { value: string; label: string }[];
  firstAvailableSlot: { subscription_id: string; slot_index: number } | null;
  onOpenAddDevice: () => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
}

/**
 * Filter and Search toolbar for the DevicesPage dashboard.
 */
export const DeviceToolbar = memo(function DeviceToolbar({
  isAdmin,
  searchTerm,
  onSearchChange,
  activeSubscriptions,
  selectedSubscriptionId,
  activeSubId,
  onSelectSubscription,
  uniqueClients,
  selectedClient,
  onSelectClient,
  clientFilterOptions,
  selectedPlan,
  onSelectPlan,
  planFilterOptions,
  selectedStatus,
  onSelectStatus,
  statusFilterOptions,
  firstAvailableSlot,
  onOpenAddDevice,
  onOpenActivateWithOtp,
}: DeviceToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
      <InputGroup className="w-full sm:w-72 h-8">
        <InputGroupInput
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={isAdmin ? t("devices.adminSearchPlaceholder") : t("devices.searchPlaceholder")}
        />
        <InputGroupAddon>
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>

      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Subscription Selector for Multi-Subscription Clients */}
          {activeSubscriptions.length > 1 && !isAdmin && (
            <SubscriptionSelector
              subscriptions={activeSubscriptions}
              selectedId={selectedSubscriptionId || activeSubId || ""}
              onChange={onSelectSubscription}
            />
          )}

          {/* Client Filter for Admins */}
          {isAdmin && uniqueClients.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="devices-client-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("devices.tableClientTenant")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select value={selectedClient || "all"} onValueChange={onSelectClient}>
                  <SelectTrigger
                    id="devices-client-filter"
                    aria-label={t("devices.filterAllClients")}
                    size="default"
                    className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("devices.filterAllClients")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("devices.filterAllClients")}
                    </SelectItem>
                    {clientFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Plan Filter for Admins */}
          {isAdmin && planFilterOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="devices-plan-filter"
                className="text-[10px] uppercase font-bold text-muted-foreground select-none"
              >
                {t("devices.tablePlanService")}
              </label>
              <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
                <Select value={selectedPlan || "all"} onValueChange={onSelectPlan}>
                  <SelectTrigger
                    id="devices-plan-filter"
                    aria-label={t("devices.filterAllPlans")}
                    size="default"
                    className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                  >
                    <SelectValue placeholder={t("devices.filterAllPlans")} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                      {t("devices.filterAllPlans")}
                    </SelectItem>
                    {planFilterOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="devices-status-filter"
              className="text-[10px] uppercase font-bold text-muted-foreground select-none"
            >
              {t("devices.tableStatus")}
            </label>
            <div className="flex items-center bg-muted p-0.5 rounded-md border border-border">
              <Select value={selectedStatus || "all"} onValueChange={onSelectStatus}>
                <SelectTrigger
                  id="devices-status-filter"
                  aria-label={t("devices.tableStatus")}
                  size="default"
                  className="h-8 px-2.5 rounded text-xs font-semibold bg-card text-foreground shadow-xs border-0 focus:ring-0 cursor-pointer gap-1.5"
                >
                  <SelectValue placeholder={t("devices.filterAllStatuses")} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-xs font-medium cursor-pointer">
                    {t("devices.filterAllStatuses")}
                  </SelectItem>
                  {statusFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium cursor-pointer">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Primary Actions */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button
              type="button"
              size="default"
              onClick={onOpenAddDevice}
              className="h-8 px-3 text-xs font-semibold gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("devices.addDevice", "Add Device")}</span>
            </Button>
          ) : (
            firstAvailableSlot && (
              <Button
                type="button"
                size="default"
                variant="outline"
                onClick={() =>
                  onOpenActivateWithOtp(firstAvailableSlot.subscription_id, firstAvailableSlot.slot_index)
                }
                className="h-8 px-3 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>{t("devices.activateDevice", "Activate Device")}</span>
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
});
