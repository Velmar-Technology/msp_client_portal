import { Router } from 'express';
import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import userRoutes from './user.routes';
import subscriptionRoutes from './subscription.routes';
import invoiceRoutes from './invoice.routes';

const router = Router();

// Mount all route groups
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/users', userRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/invoices', invoiceRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'MSP Help Desk API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
