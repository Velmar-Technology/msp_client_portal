import type { ServerModuleManifest } from '@shared/registry/moduleManifest.types';
import invoiceRoutes from './routes/invoice.routes';
import expenseRoutes from './routes/expense.routes';

/**
 * Self-registering backend manifest for the Billing domain (ADR-017 / BL-401 / BL-701 / BL-802).
 * Mounts invoice and expense cluster dispatchers.
 */
export const moduleManifest: ServerModuleManifest = {
  id: 'billing',
  routes: [
    {
      prefix: '/invoices',
      router: invoiceRoutes,
    },
    {
      prefix: '/expenses',
      router: expenseRoutes,
    },
    {
      prefix: '/billing/invoices',
      router: invoiceRoutes,
    },
    {
      prefix: '/billing/expenses',
      router: expenseRoutes,
    },
  ],
};
