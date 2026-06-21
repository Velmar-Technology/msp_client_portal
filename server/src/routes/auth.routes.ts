import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { validate } from '../middleware/validationMiddleware';
import { LoginDTO, RegisterDTO, ForgotPasswordDTO, ResetPasswordDTO, RefreshTokenDTO, GoogleAuthDTO } from '../dtos/auth.dto';

const router = Router();

/** POST /api/v1/auth/register — Create a new account */
router.post('/register', validate(RegisterDTO), (req, res) => authController.register(req, res));

/** POST /api/v1/auth/google — Authenticate/register via Google OAuth */
router.post('/google', validate(GoogleAuthDTO), (req, res) => authController.googleAuth(req, res));

/** POST /api/v1/auth/login — Authenticate and get tokens */
router.post('/login', validate(LoginDTO), (req, res) => authController.login(req, res));

/** POST /api/v1/auth/refresh — Refresh access token */
router.post('/refresh', validate(RefreshTokenDTO), (req, res) => authController.refreshToken(req, res));

/** POST /api/v1/auth/forgot-password — Request password reset */
router.post('/forgot-password', validate(ForgotPasswordDTO), (req, res) => authController.forgotPassword(req, res));

/** POST /api/v1/auth/reset-password — Reset password with token */
router.post('/reset-password', validate(ResetPasswordDTO), (req, res) => authController.resetPassword(req, res));

export default router;
