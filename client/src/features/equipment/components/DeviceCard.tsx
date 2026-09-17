import { memo } from "react";
import { Laptop, BadgeCheck, Cloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SubscriptionEquipment } from "@shared/contracts";
import { Card, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CopyableSerial, CopyableDeviceId } from "./CopyableBadge";
import { DeviceActionsCell } from "./DeviceActionsCell";

export interface DeviceCardProps {
  equip: Partial<SubscriptionEquipment>;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenVaultModal?: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRevoke: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRepair: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
  onDeployClient?: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployAgent?: (equip: Partial<SubscriptionEquipment>) => void;
}

/**
 * High-End Tiled Card Component representing an individual device slot.
 */
export const DeviceCard = memo(function DeviceCard({
  equip,
  onOpenNcModal,
  onOpenVaultModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
  onDeployAgent,
}: DeviceCardProps) {
  const { t } = useTranslation();
  const isActive = equip.status === "ACTIVE";
  const slotNum = equip.slot_index !== undefined ? equip.slot_index + 1 : 1;

  return (
    <Card className="p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-2 bg-muted text-muted-foreground rounded-md border border-border shrink-0">
            <Laptop className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate font-heading">
                {isActive ? equip.device_name || t("devices.unnamedDevice") : t("devices.pendingUnboundSlot")}
              </h3>
              {isActive && equip.agent_last_seen_at && (
                <span
                  title={t("devices.agentVerifiedTooltip")}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0"
                >
                  <BadgeCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                {t("devices.slotNumber", { num: slotNum })}
              </p>
              {equip.plan && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border uppercase font-mono">
                  {equip.plan}
                </span>
              )}
              {equip.tenant_name && (
                <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border truncate max-w-28">
                  {equip.tenant_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <span
          className={cn(
            "shrink-0 text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded border",
            isActive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          )}
        >
          {isActive ? "ACTIVE" : t("devices.statusPendingActivation")}
        </span>
      </div>

      <div className="text-xs text-muted-foreground space-y-1.5 flex-1">
        {isActive ? (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">{t("devices.tableDeviceDetails")}:</span>
              <CopyableSerial serial={equip.device_serial} />
            </div>
            {equip.nextcloud_username && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">{t("devices.tableCloudBackup")}:</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Cloud className="h-3 w-3" />
                  {t("devices.configured")}
                </span>
              </div>
            )}
            {equip.client_name && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">{t("devices.tableClientTenant")}:</span>
                <span className="text-foreground truncate max-w-35 font-medium">{equip.client_name}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic leading-relaxed">{t("devices.pendingUnboundSlot")}</p>
        )}
      </div>

      <CardFooter className="p-0 border-none flex items-center justify-between gap-2 pt-2 border-t border-border text-[10px] text-muted-foreground mt-auto">
        <CopyableDeviceId
          id={equip.id}
          labelPrefix={t("devices.idLabel")}
          className="text-[10px] break-all max-w-[calc(100%-70px)]"
        />
        <DeviceActionsCell
          equip={equip}
          onOpenNcModal={onOpenNcModal}
          onOpenVaultModal={onOpenVaultModal}
          onOpenScheduleMaint={onOpenScheduleMaint}
          onRequestRevoke={onRequestRevoke}
          onRequestRepair={onRequestRepair}
          onOpenActivateWithOtp={onOpenActivateWithOtp}
          onDeployClient={onDeployClient}
          onDeployAgent={onDeployAgent}
        />
      </CardFooter>
    </Card>
  );
});
