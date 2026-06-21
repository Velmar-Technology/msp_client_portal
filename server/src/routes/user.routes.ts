import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { UpdateProfileDTO, ChangePasswordDTO } from '../dtos/user.dto';
import { UserRole } from '../types';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

/** GET /api/v1/users/me — Get current user profile */
router.get('/me', (req, res) => userController.getProfile(req, res));

/** PATCH /api/v1/users/me — Update current user profile */
router.patch('/me', validate(UpdateProfileDTO), (req, res) => userController.updateProfile(req, res));

/** POST /api/v1/users/me/avatar — Upload and set profile picture */
router.post('/me/avatar', upload.single('avatar'), (req, res) => userController.uploadAvatar(req, res));

/** PUT /api/v1/users/me/password — Change current user password */
router.put('/me/password', validate(ChangePasswordDTO), (req, res) => userController.changePassword(req, res));

/** GET /api/v1/users/technicians — List technicians (Admin/Tech only) */
router.get(
  '/technicians',
  rbacMiddleware(UserRole.ADMIN, UserRole.TECHNICIAN),
  (req, res) => userController.getTechnicians(req, res),
);

export default router;
