import { Router } from 'express';
import { equipmentController } from '@modules/equipment/controllers/EquipmentController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import { ActivateWithOtpDTO } from '@shared/dtos/equipment.dto';
import { UserRole } from '@shared/types';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/equipment/admin/devices — Get all devices for all clients (Admin only) */
router.get('/admin/devices', rbacMiddleware(UserRole.ADMIN), (req, res) =>
  equipmentController.getAllDevicesForAdmin(req, res)
);

/** POST /api/v1/equipment/admin/devices — Add a device directly for admin/tenant without needing a subscription */
router.post('/admin/devices', rbacMiddleware(UserRole.ADMIN), (req, res) =>
  equipmentController.addAdminDevice(req, res)
);

/** DELETE /api/v1/equipment/admin/devices/:id — Delete an admin-owned equipment record */
router.delete('/admin/devices/:id', rbacMiddleware(UserRole.ADMIN), (req, res) =>
  equipmentController.deleteAdminDevice(req, res)
);

/** GET /api/v1/equipment/my-devices — Get active devices for the authenticated client */
router.get('/my-devices', (req, res) =>
  equipmentController.getMyDevices(req, res)
);

/** POST /api/v1/equipment/activate-with-otp — Activate a slot by entering a generated OTP code */
router.post('/activate-with-otp', validate(ActivateWithOtpDTO, 'body'), (req, res) =>
  equipmentController.activateWithOtp(req, res)
);

/** GET /api/v1/equipment/subscriptions/:subId/slots — Get equipment slots */
router.get('/subscriptions/:subId/slots', (req, res) =>
  equipmentController.getSlots(req, res)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/otp — Generate OTP code */
router.post('/subscriptions/:subId/slots/:slotIndex/otp', rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN), (req, res) =>
  equipmentController.generateOTP(req, res)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/activate — Activate equipment */
router.post('/subscriptions/:subId/slots/:slotIndex/activate', (req, res) =>
  equipmentController.activateSlot(req, res)
);

/** POST /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/deactivate — Deactivate equipment */
router.post('/subscriptions/:subId/slots/:slotIndex/deactivate', (req, res) =>
  equipmentController.deactivateSlot(req, res)
);

/** GET /api/v1/equipment/subscriptions/:subId/slots/:slotIndex/nextcloud — Get Nextcloud info for a slot */
router.get('/subscriptions/:subId/slots/:slotIndex/nextcloud', (req, res) =>
  equipmentController.getSlotNextcloudInfo(req, res)
);

export default router;
