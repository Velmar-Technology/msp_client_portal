import { Router } from 'express';
import { userController } from '@modules/auth/controllers/UserController';
import { authMiddleware } from '@shared/middleware/authMiddleware';
import { rbacMiddleware } from '@shared/middleware/rbacMiddleware';
import { validate } from '@shared/middleware/validationMiddleware';
import {
  UpdateProfileDTO,
  ChangePasswordDTO,
  UpdateUserRoleDTO,
  UpdateUserStatusDTO,
  BulkUpdateUserRoleDTO,
  BulkUpdateUserStatusDTO,
  UpdateUserClientTypeDTO,
  BulkUpdateUserClientTypeDTO,
  BulkDeleteUsersDTO,
} from '@shared/dtos/user.dto';
import { UserRole } from '@shared/types';
import { upload } from '@shared/middleware/uploadMiddleware';

const router = Router();

router.use(authMiddleware);

// ---- Admin User Management (placed before /me and /:id to avoid route conflicts) ----

/** GET /api/v1/users/stats — User statistics breakdown (Admin only) */
router.get(
  '/stats',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.getStats(req, res),
);

/** DELETE /api/v1/users/bulk — Bulk delete users (Admin only) */
router.delete(
  '/bulk',
  rbacMiddleware(UserRole.ADMIN),
  validate(BulkDeleteUsersDTO),
  (req, res) => userController.bulkDelete(req, res),
);

/** PATCH /api/v1/users/bulk/status — Bulk update user active status (Admin only) */
router.patch(
  '/bulk/status',
  rbacMiddleware(UserRole.ADMIN),
  validate(BulkUpdateUserStatusDTO),
  (req, res) => userController.bulkToggleStatus(req, res),
);

/** PATCH /api/v1/users/bulk/role — Bulk update user role (Admin only) */
router.patch(
  '/bulk/role',
  rbacMiddleware(UserRole.ADMIN),
  validate(BulkUpdateUserRoleDTO),
  (req, res) => userController.bulkUpdateRole(req, res),
);

/** PATCH /api/v1/users/bulk/client-type — Bulk update user client type (Admin only) */
router.patch(
  '/bulk/client-type',
  rbacMiddleware(UserRole.ADMIN),
  validate(BulkUpdateUserClientTypeDTO),
  (req, res) => userController.bulkUpdateClientType(req, res),
);

/** GET /api/v1/users — List all users with filters (Admin only) */
router.get(
  '/',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.getAllUsers(req, res),
);

/** DELETE /api/v1/users/:id — Delete user (Admin only) */
router.delete(
  '/:id',
  rbacMiddleware(UserRole.ADMIN),
  (req, res) => userController.deleteUser(req, res),
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

/** PATCH /api/v1/users/:id/client-type — Update user client type (Admin only) */
router.patch(
  '/:id/client-type',
  rbacMiddleware(UserRole.ADMIN),
  validate(UpdateUserClientTypeDTO),
  (req, res) => userController.updateClientType(req, res),
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

/** POST /api/v1/users/me/api-key — Generate API key for current user */
router.post('/me/api-key', (req, res) => userController.generateApiKey(req, res));

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
