import { Router } from 'express';
import { equipmentController } from '../controllers/EquipmentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/equipment/my-devices — Get active devices for the authenticated client */
router.get('/my-devices', (req, res, next) =>
  equipmentController.getMyDevices(req, res, next)
);

/** GET /api/v1/equipment/subscriptions/:subId/slots — Get equipment slots */
router.get('/subscriptions/:subId/slots', (req, res, next) =>
  equipmentController.getSlots(req, res, next)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/otp — Generate OTP code */
router.post('/subscriptions/:subId/slots/:slotIndex/otp', (req, res, next) =>
  equipmentController.generateOTP(req, res, next)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/activate — Activate equipment */
router.post('/subscriptions/:subId/slots/:slotIndex/activate', (req, res, next) =>
  equipmentController.activateSlot(req, res, next)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/deactivate — Deactivate equipment */
router.post('/subscriptions/:subId/slots/:slotIndex/deactivate', (req, res, next) =>
  equipmentController.deactivateSlot(req, res, next)
);

export default router;
