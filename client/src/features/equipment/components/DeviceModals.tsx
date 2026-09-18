import { memo, Suspense } from "react";
import type { SubscriptionEquipment } from "@shared/contracts";
import type { Subscription } from "@/features/subscriptions";
import { FEATURE_CODES } from "@/constants/subscriptions";
import { ChunkErrorBoundary } from "@/components/shared/ChunkErrorBoundary";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Modals
import { NextcloudInfoModal } from "./NextcloudInfoModal";
import { DeviceVaultModal } from "./DeviceVaultModal";
import { DeployAgentModal } from "./DeployAgentModal";
import { ActivateWithOtpModal } from "./ActivateWithOtpModal";
import { AddAdminDeviceModal } from "./AddAdminDeviceModal";

const ScheduleMaintenanceModal = lazyWithRetry(() =>
  import("@/features/rmm").then((m) => ({
    default: m.ScheduleMaintenanceModal,
  })),
);

const DeviceRmmModal = lazyWithRetry(() =>
  import("./DeviceRmmModal").then((m) => ({
    default: m.DeviceRmmModal,
  })),
);

export interface DeviceModalsProps {
  isAdmin: boolean;
  hasPlanFeature: (plan?: string | null, feature?: string) => boolean;
  // Device RMM Modal
  isRmmModalOpen?: boolean;
  rmmModalEquip?: Partial<SubscriptionEquipment> | null;
  onCloseRmmModal?: () => void;
  // Schedule Maintenance
  isMaintModalOpen: boolean;
  maintModalEquip: Partial<SubscriptionEquipment> | null;
  onCloseMaintModal: () => void;
  onMaintSuccess: () => void;
  // Activate with OTP
  activateOtpModalOpen: boolean;
  activateOtpLoading: boolean;
  onCloseActivateWithOtp: () => void;
  onActivateWithOtp: (otp: string, deviceName: string, deviceSerial: string) => void | Promise<void>;
  activateTargetSubId?: string | null;
  activateTargetSlotIdx?: number | null;
  // Add Admin Device
  addDeviceModalOpen: boolean;
  addDeviceLoading: boolean;
  onCloseAddDevice: () => void;
  onAddAdminDevice: (data: { deviceName: string; deviceSerial?: string; tenantId?: string; otp: string }) => void | Promise<void>;
  uniqueClients: { id: string; name: string }[];
  // Nextcloud Info
  isNcModalOpen: boolean;
  ncModalEquip: Partial<SubscriptionEquipment> | null;
  onCloseNcModal: () => void;
  activeSub?: Subscription;
  selectedSubscriptionId?: string;
  // Device Vault
  isVaultModalOpen: boolean;
  vaultModalEquip: Partial<SubscriptionEquipment> | null;
  onCloseVaultModal: () => void;
  // Deploy Agent
  isDeployAgentOpen: boolean;
  deployAgentEquip: Partial<SubscriptionEquipment> | null;
  onCloseDeployAgent: () => void;
}

/**
 * Encapsulates the 6 feature modals associated with device slot management,
 * wrapped in defensive ChunkErrorBoundary and Suspense wrappers.
 */
export const DeviceModals = memo(function DeviceModals({
  isAdmin,
  hasPlanFeature,
  isRmmModalOpen,
  rmmModalEquip,
  onCloseRmmModal,
  isMaintModalOpen,
  maintModalEquip,
  onCloseMaintModal,
  onMaintSuccess,
  activateOtpModalOpen,
  activateOtpLoading,
  onCloseActivateWithOtp,
  onActivateWithOtp,
  activateTargetSubId,
  activateTargetSlotIdx,
  addDeviceModalOpen,
  addDeviceLoading,
  onCloseAddDevice,
  onAddAdminDevice,
  uniqueClients,
  isNcModalOpen,
  ncModalEquip,
  onCloseNcModal,
  activeSub,
  selectedSubscriptionId,
  isVaultModalOpen,
  vaultModalEquip,
  onCloseVaultModal,
  isDeployAgentOpen,
  deployAgentEquip,
  onCloseDeployAgent,
}: DeviceModalsProps) {
  return (
    <>
      {/* Schedule Maintenance Modal */}
      {isMaintModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ScheduleMaintenanceModal
              equipment={maintModalEquip}
              isOpen={isMaintModalOpen}
              onClose={onCloseMaintModal}
              onSuccess={onMaintSuccess}
              isAdminOrTech={isAdmin}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Standalone Activate with Code Modal */}
      {activateOtpModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <ActivateWithOtpModal
              isOpen={activateOtpModalOpen}
              loading={activateOtpLoading}
              onClose={onCloseActivateWithOtp}
              onActivate={onActivateWithOtp}
              subscriptionId={activateTargetSubId}
              slotIndex={activateTargetSlotIdx}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Admin Add Device Modal */}
      {isAdmin && addDeviceModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <AddAdminDeviceModal
              isOpen={addDeviceModalOpen}
              loading={addDeviceLoading}
              onClose={onCloseAddDevice}
              onSubmit={onAddAdminDevice}
              tenantOptions={uniqueClients}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Nextcloud Info Modal */}
      {isNcModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <NextcloudInfoModal
              isOpen={isNcModalOpen}
              onClose={onCloseNcModal}
              subId={ncModalEquip?.subscription_id || activeSub?.id || selectedSubscriptionId || null}
              slotIndex={ncModalEquip?.slot_index ?? null}
              fallbackUsername={ncModalEquip?.nextcloud_username}
              fallbackDeviceName={ncModalEquip?.device_name}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Device Password Vault Modal */}
      {isVaultModalOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <DeviceVaultModal
              isOpen={isVaultModalOpen}
              onClose={onCloseVaultModal}
              equipmentId={vaultModalEquip?.id || null}
              deviceName={vaultModalEquip?.device_name || vaultModalEquip?.agent_hostname}
              isLocked={!hasPlanFeature(vaultModalEquip?.plan, FEATURE_CODES.PASSWORD_MANAGER)}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Deploy MSP Agent Modal */}
      {isDeployAgentOpen && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <DeployAgentModal isOpen={isDeployAgentOpen} onClose={onCloseDeployAgent} equip={deployAgentEquip} />
          </Suspense>
        </ChunkErrorBoundary>
      )}

      {/* Device RMM Dashboard Modal */}
      {isRmmModalOpen && onCloseRmmModal && (
        <ChunkErrorBoundary>
          <Suspense fallback={null}>
            <DeviceRmmModal
              isOpen={isRmmModalOpen}
              onClose={onCloseRmmModal}
              equip={rmmModalEquip || null}
            />
          </Suspense>
        </ChunkErrorBoundary>
      )}
    </>
  );
});
