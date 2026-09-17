import { memo } from "react";
import {
  MoreHorizontal,
  Cloud,
  ChevronRight,
  Calendar,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Terminal,
  ToolCase,
  Laptop,
  KeyRound,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEntitlements } from "@/hooks/useEntitlements";
import { FEATURE_CODES } from "@/constants/subscriptions";
import type { SubscriptionEquipment } from "@shared/contracts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface DeviceActionsCellProps {
  equip: Partial<SubscriptionEquipment>;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenVaultModal?: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRevoke: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRepair: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
  onDeleteAdminDevice?: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployClient?: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployAgent?: (equip: Partial<SubscriptionEquipment>) => void;
}

/**
 * Memoized actions cell rendering direct trigger and rich dropdown menu for a device slot.
 */
export const DeviceActionsCell = memo(function DeviceActionsCell({
  equip,
  onOpenNcModal,
  onOpenVaultModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
  onDeployAgent,
}: DeviceActionsCellProps) {
  const { t } = useTranslation();
  const { hasPlanFeature } = useEntitlements();

  const isActive = equip.status === "ACTIVE";
  const isVaultEntitled = hasPlanFeature(equip.plan, FEATURE_CODES.PASSWORD_MANAGER);

  return (
    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
      {isActive ? (
        <Button
          type="button"
          variant="outline"
          title={t("maintenance.scheduleBtn")}
          size="sm"
          onClick={() => onOpenScheduleMaint(equip)}
          className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
        >
          <ToolCase className="h-3 w-3" />
          <ChevronRight className="h-3 w-3" />
        </Button>
      ) : (
        equip.subscription_id !== undefined &&
        equip.slot_index !== undefined && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenActivateWithOtp(equip.subscription_id!, equip.slot_index!)}
            className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer"
          >
            <span>{t("devices.activateDevice") || "Activate"}</span>
            <ChevronRight className="h-3 w-3" />
          </Button>
        )
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("common.actions", "Actions")}
            className="h-7 w-7 cursor-pointer"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-card text-foreground border border-border">
          <DropdownMenuLabel className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            {t("devices.actionsLabel")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />

          {/* Quick Deploy Agent Action Available on all valid slots */}
          {equip.subscription_id && equip.slot_index !== undefined && onDeployAgent && (
            <DropdownMenuItem onClick={() => onDeployAgent(equip)} className="text-xs cursor-pointer text-foreground">
              <Terminal className="h-3.5 w-3.5 mr-1" />
              {t("devices.deployMspAgent", "Deploy MSP Agent")}
            </DropdownMenuItem>
          )}

          {isActive ? (
            <>
              {equip.nextcloud_username && (
                <DropdownMenuItem onClick={() => onOpenNcModal(equip)} className="text-xs cursor-pointer">
                  <Cloud className="h-3.5 w-3.5 mr-1" />
                  {t("devices.actionNextcloudInfo")}
                </DropdownMenuItem>
              )}
              {isActive && onOpenVaultModal && (
                <DropdownMenuItem
                  onClick={() => onOpenVaultModal(equip)}
                  className="text-xs cursor-pointer flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <KeyRound className="h-3.5 w-3.5 mr-1 shrink-0" />
                    <span className="truncate">{t("equipment.vault.actionMenu", "Device Password Vault")}</span>
                  </div>
                  {!isVaultEntitled && (
                    <span
                      data-testid="vault-upgrade-lock"
                      className="ml-auto inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0"
                    >
                      <Lock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                      <span>{t("nav.upgradeBadge", "Upgrade")}</span>
                    </span>
                  )}
                </DropdownMenuItem>
              )}
              {equip.nextcloud_username &&
                equip.subscription_id &&
                equip.slot_index !== undefined &&
                onDeployClient && (
                  <DropdownMenuItem onClick={() => onDeployClient(equip)} className="text-xs cursor-pointer">
                    <Laptop className="h-3.5 w-3.5 mr-1" />
                    {t("devices.deployClient")}
                  </DropdownMenuItem>
                )}
              <DropdownMenuItem onClick={() => onOpenScheduleMaint(equip)} className="text-xs cursor-pointer">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {t("maintenance.scheduleBtn")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRequestRepair(equip)} className="text-xs cursor-pointer">
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                {t("devices.actionRepair", "Re-pair Device")}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                onClick={() => onRequestRevoke(equip)}
                className="text-xs text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                {equip.client_role === "ADMIN"
                  ? t("devices.actionDelete", "Delete Device")
                  : t("devices.actionDeactivate", "Deactivate Device")}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {equip.subscription_id !== undefined && equip.slot_index !== undefined && (
                <DropdownMenuItem
                  onClick={() => onOpenActivateWithOtp(equip.subscription_id!, equip.slot_index!)}
                  className="text-xs cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {t("devices.activateDevice")}
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
