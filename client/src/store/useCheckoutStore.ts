import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Subscription } from "@/features/subscriptions";

export type CheckoutAction = 'add_device' | 'remove_device' | 'cancel' | 'pay';

export interface CheckoutState {
  checkoutOpen: boolean;
  checkoutAction: CheckoutAction | null;
  checkoutSubscription: Subscription | null;
  checkoutDeviceDelta: number;
  paymentMessage: string | null;

  openCheckout: (action: CheckoutAction, subscription: Subscription) => void;
  closeCheckout: () => void;
  setCheckoutDeviceDelta: (delta: number) => void;
  setPaymentMessage: (message: string | null) => void;
}

/**
 * Global checkout and modal workflow state store.
 * Coordinates modal visibility, subscription modifications, and device delta adjustments.
 */
export const useCheckoutStore = create<CheckoutState>()(
  devtools(
    (set) => ({
      checkoutOpen: false,
      checkoutAction: null,
      checkoutSubscription: null,
      checkoutDeviceDelta: 1,
      paymentMessage: null,

      openCheckout: (action, subscription) =>
        set(
          {
            checkoutOpen: true,
            checkoutAction: action,
            checkoutSubscription: subscription,
            checkoutDeviceDelta: 1,
            paymentMessage: null,
          },
          false,
          'checkout/open',
        ),

      closeCheckout: () =>
        set(
          {
            checkoutOpen: false,
            checkoutAction: null,
            checkoutSubscription: null,
            checkoutDeviceDelta: 1,
            paymentMessage: null,
          },
          false,
          'checkout/close',
        ),

      setCheckoutDeviceDelta: (delta) =>
        set({ checkoutDeviceDelta: delta }, false, 'checkout/set_device_delta'),

      setPaymentMessage: (message) =>
        set({ paymentMessage: message }, false, 'checkout/set_payment_message'),
    }),
    { name: 'CheckoutStore' },
  ),
);
