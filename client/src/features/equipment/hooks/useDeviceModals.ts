import { useState } from 'react';
import type { SubscriptionEquipment } from '@shared/contracts';

interface ModalState<T = void> {
  isOpen: boolean;
  payload: T | null;
}

function useModalState<T = void>(): ModalState<T> & {
  open: (payload: T) => void;
  close: () => void;
} {
  const [state, setState] = useState<ModalState<T>>({ isOpen: false, payload: null });
  return {
    ...state,
    open: (payload: T) => setState({ isOpen: true, payload }),
    close: () => setState({ isOpen: false, payload: null }),
  };
}

/**
 * Centralized modal state management for the Devices page.
 * Each modal exposes `isOpen`, `payload`, `open(payload)`, and `close()`.
 */
export function useDeviceModals() {
  const revoke = useModalState<Partial<SubscriptionEquipment>>();
  const repair = useModalState<Partial<SubscriptionEquipment>>();
  const activateOtp = useModalState<{ subId: string; slotIndex: number }>();
  const addDevice = useModalState();
  const deleteDevice = useModalState<Partial<SubscriptionEquipment>>();
  const nextcloud = useModalState<Partial<SubscriptionEquipment>>();
  const maintenance = useModalState<Partial<SubscriptionEquipment>>();
  const deployAgent = useModalState<Partial<SubscriptionEquipment>>();
  const vault = useModalState<Partial<SubscriptionEquipment>>();

  return { revoke, repair, activateOtp, addDevice, deleteDevice, nextcloud, maintenance, deployAgent, vault };
}
