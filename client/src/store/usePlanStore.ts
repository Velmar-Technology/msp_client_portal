import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { planService } from "@/features/subscriptions";
import type { Plan, PlanFilters } from "@/features/subscriptions";

export interface PlanState {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  fetchPlans: (filters?: PlanFilters) => Promise<void>;
  createPlan: (
    data: Omit<Plan, 'created_at' | 'updated_at'>
  ) => Promise<void>;
  updatePlan: (
    id: string,
    data: Partial<Omit<Plan, 'id' | 'created_at' | 'updated_at'>>
  ) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
}

/**
 * Service plan management store for catalog browsing and administrative tier configuration.
 */
export const usePlanStore = create<PlanState>()(
  devtools(
    (set) => ({
      plans: [],
      loading: false,
      error: null,

      fetchPlans: async (filters?: PlanFilters) => {
        set({ loading: true, error: null }, false, 'plans/fetch_request');
        try {
          const plans = await planService.getAll({ limit: 100, ...filters });
          set({ plans, loading: false }, false, 'plans/fetch_success');
        } catch (err) {
          const error = err as Error;
          set(
            { loading: false, error: error.message || 'Failed to fetch plans' },
            false,
            'plans/fetch_failure'
          );
          throw err;
        }
      },

      createPlan: async (data) => {
        set({ loading: true, error: null }, false, 'plans/create_request');
        try {
          const newPlan = await planService.create(data);
          set(
            (state) => ({
              plans: [...state.plans, newPlan],
              loading: false,
            }),
            false,
            'plans/create_success'
          );
        } catch (err) {
          const error = err as Error;
          set(
            { loading: false, error: error.message || 'Failed to create plan' },
            false,
            'plans/create_failure'
          );
          throw err;
        }
      },

      updatePlan: async (id, data) => {
        set({ loading: true, error: null }, false, 'plans/update_request');
        try {
          const updatedPlan = await planService.update(id, data);
          set(
            (state) => ({
              plans: state.plans.map((p) => (p.id === id ? updatedPlan : p)),
              loading: false,
            }),
            false,
            'plans/update_success'
          );
        } catch (err) {
          const error = err as Error;
          set(
            { loading: false, error: error.message || 'Failed to update plan' },
            false,
            'plans/update_failure'
          );
          throw err;
        }
      },

      deletePlan: async (id) => {
        set({ loading: true, error: null }, false, 'plans/delete_request');
        try {
          const updatedPlan = await planService.delete(id);
          set(
            (state) => ({
              plans: state.plans.map((p) => (p.id === id ? updatedPlan : p)),
              loading: false,
            }),
            false,
            'plans/delete_success'
          );
        } catch (err) {
          const error = err as Error;
          set(
            { loading: false, error: error.message || 'Failed to delete plan' },
            false,
            'plans/delete_failure'
          );
          throw err;
        }
      },
    }),
    { name: 'PlanStore' }
  )
);
