import { Request, Response } from 'express';
import { authService } from '@modules/auth/services/AuthService';
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput, RefreshTokenInput, GoogleAuthInput } from '@shared/dtos/auth.dto';


/**
 * Controller handling public authentication endpoints (register, login, oauth, token refresh, OTP verification).
 */
export class AuthController {
  /**
   * Handles user registration request and returns created user details.
   *
   * @param req - Express request containing RegisterInput body
   * @param res - Express response returning HTTP 201 with registration status
   */
  async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterInput;
    const result = await authService.register(data);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Account created successfully',
    });
  }

  /**
   * Handles Google OAuth authentication and account provisioning.
   *
   * @param req - Express request containing GoogleAuthInput body
   * @param res - Express response returning authenticated user profile and token pair
   */
  async googleAuth(req: Request, res: Response): Promise<void> {
    const data = req.body as GoogleAuthInput;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const result = await authService.googleAuth(data, ipAddress);
    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Handles password-based user authentication.
   *
   * @param req - Express request containing LoginInput body
   * @param res - Express response returning authenticated user profile and session tokens
   */
  async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginInput;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const result = await authService.login(data, ipAddress);
    res.json({
      success: true,
      data: result,
    });
  }

  /**
   * Handles refresh token rotation to provide new JWT session tokens.
   *
   * @param req - Express request containing RefreshTokenInput body
   * @param res - Express response returning new access and refresh tokens
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenInput;
    const tokens = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: tokens,
    });
  }

  /**
   * Dispatches a password recovery token email to the user.
   *
   * @param req - Express request containing ForgotPasswordInput body
   * @param res - Express response confirming email dispatch
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);
    res.json({
      success: true,
      message: 'Password reset link has been sent to your email.',
    });
  }

  /**
   * Resets account password using a validated password reset token.
   *
   * @param req - Express request containing ResetPasswordInput body
   * @param res - Express response confirming password change
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, password);
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  }

  /**
   * Verifies user email address via one-time password (OTP).
   *
   * @param req - Express request containing email and OTP code
   * @param res - Express response confirming email verification
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const { email, otp } = req.body as { email: string; otp: string };
    await authService.verifyEmail(email, otp);
    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
    });
  }
}

export const authController = new AuthController();
