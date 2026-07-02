import { Router } from 'express';
import { userController } from '../controllers/UserController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';
import { validate } from '../middleware/validationMiddleware';
import { UpdateProfileDTO, ChangePasswordDTO, UpdateUserRoleDTO, UpdateUserStatusDTO } from '../dtos/user.dto';
import { UserRole } from '../types';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

// ---- Admin User Management (placed before /me to avoid route conflicts) ----

/** GET /api/v1/users/stats — User statistics breakdown (Admin only) */
router.get(
  '/stats',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.getStats(req, res),
);

/** GET /api/v1/users — List all users with filters (Admin only) */
router.get(
  '/',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.getAllUsers(req, res),
);

/** PATCH /api/v1/users/:id/role — Update user role (Admin only) */
router.patch(
  '/:id/role',
  rbacMiddleware(UserRole.ADMIN),
  validate(UpdateUserRoleDTO),
  (req, res) => userController.updateRole(req, res),
);

/** PATCH /api/v1/users/:id/status — Toggle user active status (Admin only) */
router.patch(
  '/:id/status',
  rbacMiddleware(UserRole.ADMIN),
  validate(UpdateUserStatusDTO),
  (req, res) => userController.toggleStatus(req, res),
);

// ---- Existing User Routes ----

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

/** GET /api/v1/users/clients — List clients (Admin only) */
router.get(
  '/clients',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.getClients(req, res),
);

export default router;
