import { Router, Request, Response, NextFunction } from 'express';
import { invoiceRoutes, expenseRoutes } from '@modules/billing';
import { subscriptionRoutes, planRoutes } from '@modules/subscriptions';
import { equipmentRoutes } from '@modules/equipment';
import { ticketRoutes } from '@modules/tickets';
import { authRoutes, userRoutes, authzRoutes } from '@modules/auth';
import { rmmRoutes, alertRoutes, maintenanceRoutes } from '@modules/rmm';
import { systemRoutes } from '@modules/system';
import { notificationRoutes, notificationPreferenceRoutes } from '@modules/notifications';
import { crmRoutes } from '@modules/crm';
import { navRoutes } from '@modules/nav';

/**
 * Express router acting as the API Gateway Layer Cluster Dispatcher.
 * Maps path clusters (e.g., /billing, /workspaces) to internal microservice/domain routers
 * while enforcing uniform header propagation (X-User-Id, X-Tenant-Id).
 */
export const gatewayClusterRouter = Router();

// ---- Route Gateway Cluster Routing ----

// 1. Billing Cluster (/billing/*, /invoices/*, /expenses/*)
gatewayClusterRouter.use('/billing/invoices', invoiceRoutes);
gatewayClusterRouter.use('/billing/expenses', expenseRoutes);

// 2. Workspaces Cluster (/workspaces/subscriptions/*, /workspaces/equipment/*)
gatewayClusterRouter.use('/workspaces/subscriptions', subscriptionRoutes);
gatewayClusterRouter.use('/workspaces/equipment', equipmentRoutes);

// 3. Directly mapped standard domain routes
gatewayClusterRouter.use('/auth', authRoutes);
gatewayClusterRouter.use('/tickets', ticketRoutes);
gatewayClusterRouter.use('/users', userRoutes);
gatewayClusterRouter.use('/subscriptions', subscriptionRoutes);
gatewayClusterRouter.use('/invoices', invoiceRoutes);
gatewayClusterRouter.use('/notifications', notificationRoutes);
gatewayClusterRouter.use('/notification-preferences', notificationPreferenceRoutes);
gatewayClusterRouter.use('/plans', planRoutes);
gatewayClusterRouter.use('/system', systemRoutes);
gatewayClusterRouter.use('/equipment', equipmentRoutes);
gatewayClusterRouter.use('/expenses', expenseRoutes);
gatewayClusterRouter.use('/maintenance', maintenanceRoutes);
gatewayClusterRouter.use('/alerts', alertRoutes);
gatewayClusterRouter.use('/rmm', rmmRoutes);
gatewayClusterRouter.use('/crm', crmRoutes);
gatewayClusterRouter.use('/nav', navRoutes);
gatewayClusterRouter.use('/authz', authzRoutes);

/**
 * Middleware ensuring standard Gateway Header (`X-User-Id`, `X-Tenant-Id`) propagation on all cluster requests.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 */
export function gatewayHeaderPropagatorMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.user?.userId && !req.headers['x-user-id']) {
    req.headers['x-user-id'] = req.user.userId;
  }
  if (req.user?.tenantId && !req.headers['x-tenant-id']) {
    req.headers['x-tenant-id'] = req.user.tenantId;
  }
  next();
}
