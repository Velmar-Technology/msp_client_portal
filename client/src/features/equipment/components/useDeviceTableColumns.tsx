import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Cloud } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SubscriptionEquipment } from "@shared/contracts";
import { DataTableColumnHeader } from "@/components/ui/data-table";
import { CopyableSerial, CopyableDeviceId } from "./CopyableBadge";
import { DeviceActionsCell } from "./DeviceActionsCell";

export interface DeviceTableColumnsOptions {
  isAdmin: boolean;
  onOpenNcModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenVaultModal: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenScheduleMaint: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRevoke: (equip: Partial<SubscriptionEquipment>) => void;
  onRequestRepair: (equip: Partial<SubscriptionEquipment>) => void;
  onOpenActivateWithOtp: (subId: string, slotIndex: number) => void;
  onDeployClient: (equip: Partial<SubscriptionEquipment>) => void;
  onDeployAgent: (equip: Partial<SubscriptionEquipment>) => void;
  setDeviceToDelete: (equip: Partial<SubscriptionEquipment> | null) => void;
}

/**
 * Hook providing DataTable ColumnDef array for the Device Inventory table.
 */
export function useDeviceTableColumns({
  isAdmin,
  onOpenNcModal,
  onOpenVaultModal,
  onOpenScheduleMaint,
  onRequestRevoke,
  onRequestRepair,
  onOpenActivateWithOtp,
  onDeployClient,
  onDeployAgent,
  setDeviceToDelete,
}: DeviceTableColumnsOptions): ColumnDef<Partial<SubscriptionEquipment>>[] {
  const { t } = useTranslation();

  return useMemo<ColumnDef<Partial<SubscriptionEquipment>>[]>(() => {
    const cols: ColumnDef<Partial<SubscriptionEquipment>>[] = [];

    // Add Client/Tenant column if Admin
    if (isAdmin) {
      cols.push({
        id: "clientInfo",
        accessorFn: (row) => row.client_name || row.tenant_name || "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableClientTenant")} />,
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground font-heading">
                {equip.client_name || t("devices.unknownClient")}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {equip.tenant_name || t("devices.unknownTenant")}
              </p>
              {equip.client_email && (
                <p className="text-[9px] text-muted-foreground truncate max-w-35" title={equip.client_email}>
                  {equip.client_email}
                </p>
              )}
            </div>
          );
        },
      });
    }

    // Add Plan column if Admin
    if (isAdmin) {
      cols.push({
        id: "planInfo",
        accessorFn: (row) => row.plan || "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tablePlanService")} />,
        cell: ({ row }) => {
          const equip = row.original;
          return (
            <div className="space-y-0.5">
              <span className="inline-block bg-muted text-foreground border border-border px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase">
                {equip.plan || t("devices.notAvailable")}
              </span>
            </div>
          );
        },
      });
    }

    // Add Status
    cols.push({
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableStatus")} />,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return status === "ACTIVE" ? (
          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold">
            ACTIVE
          </span>
        ) : (
          <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold">
            {t("devices.statusPendingActivation")}
          </span>
        );
      },
    });

    // Add Device Details
    cols.push({
      id: "deviceDetails",
      accessorFn: (row) => row.device_name || "",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableDeviceDetails")} />,
      cell: ({ row }) => {
        const equip = row.original;
        if (equip.status === "ACTIVE") {
          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-foreground font-heading">
                  {equip.device_name || t("devices.unnamedDevice")}
                </p>
                {equip.agent_last_seen_at && (
                  <span
                    title={t("devices.agentVerifiedTooltip")}
                    className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide"
                  >
                    <BadgeCheck className="w-3 h-3" />
                    {t("devices.agentVerified")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono flex-wrap">
                <CopyableSerial serial={equip.device_serial} />
                {equip.id && (
                  <CopyableDeviceId
                    id={equip.id}
                    labelPrefix={t("devices.idLabel")}
                    className="border border-border/50 bg-muted/30"
                  />
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground italic">{t("devices.pendingUnboundSlot")}</p>
            {equip.id && (
              <CopyableDeviceId
                id={equip.id}
                labelPrefix={t("devices.idLabel")}
                className="border border-border/50 bg-muted/30"
              />
            )}
          </div>
        );
      },
    });

    // Add Cloud Backup Account
    cols.push({
      id: "backupAccount",
      accessorFn: (row) => (row.status === "ACTIVE" && row.nextcloud_username ? 1 : 0),
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("devices.tableCloudBackup")} />,
      cell: ({ row }) => {
        const equip = row.original;
        if (equip.status === "ACTIVE" && equip.nextcloud_username) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold">
                <Cloud className="h-3 w-3" />
                {t("devices.configured")}
              </span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    });

    // Add Actions
    cols.push({
      id: "actions",
      enableSorting: false,
      header: () => (
        <div className="text-right">
          <span className="uppercase text-[10px] text-muted-foreground font-bold tracking-wider">
            {t("devices.tableActions")}
          </span>
        </div>
      ),
      cell: ({ row }) => {
        const equip = row.original;
        return (
          <DeviceActionsCell
            equip={equip}
            onOpenNcModal={onOpenNcModal}
            onOpenVaultModal={onOpenVaultModal}
            onOpenScheduleMaint={onOpenScheduleMaint}
            onRequestRevoke={equip.client_role === "ADMIN" ? setDeviceToDelete : onRequestRevoke}
            onRequestRepair={onRequestRepair}
            onOpenActivateWithOtp={onOpenActivateWithOtp}
            onDeployClient={onDeployClient}
            onDeployAgent={onDeployAgent}
          />
        );
      },
    });

    return cols;
  }, [
    t,
    isAdmin,
    onOpenNcModal,
    onOpenVaultModal,
    onOpenScheduleMaint,
    onRequestRevoke,
    onRequestRepair,
    onOpenActivateWithOtp,
    onDeployClient,
    onDeployAgent,
    setDeviceToDelete,
  ]);
}
