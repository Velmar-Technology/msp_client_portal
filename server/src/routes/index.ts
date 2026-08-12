import { Router } from 'express';
import { NotFoundError } from '@shared/errors';
import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import userRoutes from './user.routes';
import subscriptionRoutes from './subscription.routes';
import invoiceRoutes from './invoice.routes';
import notificationRoutes from './notification.routes';
import notificationPreferenceRoutes from './notificationPreference.routes';
import planRoutes from './plan.routes';
import systemRoutes from './system.routes';
import equipmentRoutes from './equipment.routes';
import expenseRoutes from './expense.routes';
import maintenanceRoutes from './maintenance.routes';
import alertRoutes from './alert.routes';
import rmmRoutes from './rmm.routes';

const router = Router();

// Mount all route groups
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/users', userRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/notification-preferences', notificationPreferenceRoutes);
router.use('/plans', planRoutes);
router.use('/system', systemRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/expenses', expenseRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/alerts', alertRoutes);
router.use('/rmm', rmmRoutes);



// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Velmar Technology SRL MSP API is running',
    timestamp: new Date().toISOString(),
  });
});

// Catch-all 404 for unknown API routes
router.use((_req, _res, next) => {
  next(new NotFoundError('The requested API endpoint was not found'));
});

export default router;
