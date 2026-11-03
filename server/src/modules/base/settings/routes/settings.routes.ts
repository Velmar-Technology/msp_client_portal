import { Router } from 'express';
import { settingsController } from '../controllers/SettingsController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { requirePermission } from '@shared/middleware/requirePermission';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/base/settings — List tenant settings */
router.get('/', requirePermission('settings:read'), (req, res) =>
  settingsController.getSettings(req, res)
);

/** GET /api/v1/base/settings/:key — Retrieve setting value */
router.get('/:key', requirePermission('settings:read'), (req, res) =>
  settingsController.getSettingByKey(req, res)
);

/** PUT /api/v1/base/settings/:key — Update or create setting */
router.put('/:key', requirePermission('settings:manage'), (req, res) =>
  settingsController.updateSetting(req, res)
);

/** DELETE /api/v1/base/settings/:key — Remove setting */
router.delete('/:key', requirePermission('settings:manage'), (req, res) =>
  settingsController.deleteSetting(req, res)
);

export default router;
