import { memo } from "react";
import { Laptop, Cloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SubscriptionEquipment } from "@shared/contracts";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  GlowCard,
  GlowCardHeader,
  GlowCardIcon,
  GlowCardTitleGroup,
  GlowCardTitle,
  GlowCardStatus,
  GlowCardStatusDot,
  GlowCardAction,
  GlowCardContent,
  GlowCardDivider,
  GlowCardFooter,
  GlowCardBadge,
  type GlowCardVariant,
} from "@/components/ui/glow-card";
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
  onOpenRMMDashboard?: (equip: Partial<SubscriptionEquipment>) => void;
}

/**
 * Signature High-End Equipment Card with status-aware top-left gradient border
 * highlight, ambient backlight bloom, and 3-dot action menu.
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
  onOpenRMMDashboard,
}: DeviceCardProps) {
  const { t, i18n } = useTranslation();
  const isActive = equip.status === "ACTIVE";
  const isOnline =
    isActive &&
    (equip.agent_status === "ONLINE" ||
      (equip.agent_status !== "OFFLINE" &&
        Boolean(
          equip.agent_last_seen_at &&
            Date.now() - new Date(equip.agent_last_seen_at).getTime() <= 15 * 60 * 1000
        )));
  const isOffline = isActive && !isOnline;
  const slotNum = equip.slot_index !== undefined ? equip.slot_index + 1 : 1;

  // Determine glow variant and status dot color based on endpoint telemetry
  const variant: GlowCardVariant = !isActive
    ? "amber"
    : isOffline
    ? "rose"
    : "emerald";

  const dotColor = !isActive
    ? "amber"
    : isOffline
    ? "rose"
    : "emerald";

  return (
    <GlowCard variant={variant} className="h-full">
      {/* Header: Icon, Device Title & Telemetry Status, Top-Right 3-Dot Kebab Menu */}
      <GlowCardHeader>
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <GlowCardIcon>
            <Laptop className="h-5 w-5" />
          </GlowCardIcon>

          <GlowCardTitleGroup>
            <GlowCardTitle>
              {isActive
                ? equip.device_name || t("devices.unnamedDevice")
                : t("devices.pendingUnboundSlot")}
            </GlowCardTitle>

            <GlowCardStatus>
              <GlowCardStatusDot color={dotColor} pulse={isOnline} />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                {isActive
                  ? isOnline
                    ? t("devices.statusOnline", "ONLINE")
                    : t("devices.statusOffline", "OFFLINE")
                  : t("devices.statusPendingActivation", "PENDING")}
              </span>
              <span>•</span>
              <span>{t("devices.slotNumber", { num: slotNum })}</span>
              {equip.plan && (
                <>
                  <span>•</span>
                  <span className="font-mono uppercase text-[10px]">{equip.plan}</span>
                </>
              )}
            </GlowCardStatus>
          </GlowCardTitleGroup>
        </div>

        <GlowCardAction>
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
            onOpenRMMDashboard={onOpenRMMDashboard}
            showPrimaryButton={false}
          />
        </GlowCardAction>
      </GlowCardHeader>

      {/* Middle Specs & Description Area */}
      <GlowCardContent>
        {isActive ? (
          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground font-medium">
                {t("devices.tableDeviceDetails")}:
              </span>
              <CopyableSerial serial={equip.device_serial} />
            </div>

            {equip.nextcloud_username && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  {t("devices.tableCloudBackup")}:
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  <Cloud className="h-3 w-3" />
                  {t("devices.configured")}
                </span>
              </div>
            )}

            {(equip.client_name || equip.tenant_name) && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  {t("devices.tableClientTenant")}:
                </span>
                <span className="text-foreground truncate max-w-36 font-medium">
                  {equip.client_name || equip.tenant_name}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic leading-relaxed py-1">
            {t("devices.pendingUnboundSlot")}
          </p>
        )}
      </GlowCardContent>

      <GlowCardDivider />

      {/* Footer: Bottom Left ID Badge & Bottom Right Last Seen Timestamp */}
      <GlowCardFooter>
        <GlowCardBadge>
          <CopyableDeviceId
            id={equip.id}
            labelPrefix={t("devices.idLabel")}
            className="text-[10px] break-all max-w-[calc(100%-10px)]"
          />
        </GlowCardBadge>

        <span className="text-[11px] font-mono text-muted-foreground/80 shrink-0">
          {equip.agent_last_seen_at
            ? formatRelativeTime(equip.agent_last_seen_at, i18n.language)
            : isActive
            ? t("common.active", "Active")
            : t("common.ready", "Ready")}
        </span>
      </GlowCardFooter>
    </GlowCard>
  );
});
