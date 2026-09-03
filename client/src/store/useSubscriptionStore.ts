import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { subscriptionService } from "@/features/subscriptions";
import type { Subscription } from "@/features/subscriptions";
import { userService } from "@/features/users";
import type { AuthUser } from "@/store/useAuthStore";

export interface SubscriptionState {
  activeSubscriptions: Subscription[];
  subscribeLoading: boolean;
  equipmentCounts: Record<string, number>;
  clients: AuthUser[];
  selectedClientId: string;

  fetchActiveSubscriptions: () => Promise<void>;
  fetchClients: () => Promise<void>;
  setSubscribeLoading: (loading: boolean) => void;
  setEquipmentCounts: (counts: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setSelectedClientId: (id: string) => void;
}

/**
 * Global subscription and equipment allocation store.
 * Manages active subscription instances, per-tier hardware counts, and client selection.
 */
export const useSubscriptionStore = create<SubscriptionState>()(
  devtools(
    (set) => ({
      activeSubscriptions: [],
      subscribeLoading: false,
      equipmentCounts: {},
      clients: [],
      selectedClientId: '',

      fetchActiveSubscriptions: async () => {
        try {
          const subs = await subscriptionService.getAll();
          const active = subs.filter((sub) => sub.status === 'ACTIVE');

          const counts: Record<string, number> = {};
          active.forEach((sub) => {
            counts[sub.plan] = sub.equipment_count;
          });

          set(
            (state) => ({
              activeSubscriptions: active,
              equipmentCounts: { ...state.equipmentCounts, ...counts },
            }),
            false,
            'subscriptions/fetch_active',
          );
        } catch (err) {
          console.error('Failed to fetch active subscriptions:', err);
        }
      },

      fetchClients: async () => {
        try {
          const data = await userService.getClients();
          const clients = data || [];
          set(
            {
              clients,
              selectedClientId: clients.length > 0 ? clients[0].id : 'unregistered',
            },
            false,
            'subscriptions/fetch_clients',
          );
        } catch (err) {
          console.error('Failed to fetch clients:', err);
        }
      },

      setSubscribeLoading: (loading) =>
        set({ subscribeLoading: loading }, false, 'subscriptions/set_loading'),

      setEquipmentCounts: (counts) =>
        set(
          (state) => ({
            equipmentCounts:
              typeof counts === 'function' ? counts(state.equipmentCounts) : { ...state.equipmentCounts, ...counts },
          }),
          false,
          'subscriptions/set_equipment_counts',
        ),

      setSelectedClientId: (id) =>
        set({ selectedClientId: id }, false, 'subscriptions/set_selected_client'),
    }),
    { name: 'SubscriptionStore' },
  ),
);
