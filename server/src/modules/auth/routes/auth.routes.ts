import { Router } from 'express';
import { authController } from '@modules/auth/controllers/AuthController';
import { validate } from '@shared/middleware/validationMiddleware';
import { LoginDTO, RegisterDTO, ForgotPasswordDTO, ResetPasswordDTO, GoogleAuthDTO, VerifyEmailDTO } from '@shared/dtos/auth.dto';
import {
  authLoginRateLimiter,
  authRegisterRateLimiter,
  authPasswordResetRateLimiter,
  authVerificationRateLimiter,
} from '@modules/auth/middleware/authRateLimiterMiddleware';

const router = Router();

/** POST /api/v1/auth/register — Create a new account */
router.post('/register', authRegisterRateLimiter, validate(RegisterDTO), (req, res) => authController.register(req, res));

/** POST /api/v1/auth/google — Authenticate/register via Google OAuth */
router.post('/google', authLoginRateLimiter, validate(GoogleAuthDTO), (req, res) => authController.googleAuth(req, res));

/** POST /api/v1/auth/login — Authenticate and get tokens */
router.post('/login', authLoginRateLimiter, validate(LoginDTO), (req, res) => authController.login(req, res));

/** POST /api/v1/auth/refresh — Refresh access token */
router.post('/refresh', (req, res) => authController.refreshToken(req, res));

/** POST /api/v1/auth/forgot-password — Request password reset */
router.post('/forgot-password', authPasswordResetRateLimiter, validate(ForgotPasswordDTO), (req, res) => authController.forgotPassword(req, res));

/** POST /api/v1/auth/reset-password — Reset password with token */
router.post('/reset-password', authPasswordResetRateLimiter, validate(ResetPasswordDTO), (req, res) => authController.resetPassword(req, res));

/** POST /api/v1/auth/verify-email — Verify user email */
router.post('/verify-email', authVerificationRateLimiter, validate(VerifyEmailDTO), (req, res) => authController.verifyEmail(req, res));

export default router;
