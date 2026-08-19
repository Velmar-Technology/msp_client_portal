import { Router, Request, Response, NextFunction } from 'express';
import invoiceRoutes from '../routes/invoice.routes';
import expenseRoutes from '../routes/expense.routes';
import subscriptionRoutes from '../routes/subscription.routes';
import equipmentRoutes from '../routes/equipment.routes';
import ticketRoutes from '../routes/ticket.routes';
import authRoutes from '../routes/auth.routes';
import userRoutes from '../routes/user.routes';
import alertRoutes from '../routes/alert.routes';
import rmmRoutes from '../routes/rmm.routes';
import maintenanceRoutes from '../routes/maintenance.routes';
import planRoutes from '../routes/plan.routes';
import systemRoutes from '../routes/system.routes';
import notificationRoutes from '../routes/notification.routes';
import notificationPreferenceRoutes from '../routes/notificationPreference.routes';
import { NotFoundError } from '@shared/errors';

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

/**
 * Middleware ensuring standard Gateway Header propagation on all cluster requests.
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
