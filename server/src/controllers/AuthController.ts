import { Request, Response } from 'express';
import { authService } from '../services/AuthService';
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput, RefreshTokenInput, GoogleAuthInput } from '../dtos/auth.dto';


export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const data = req.body as RegisterInput;
    const result = await authService.register(data);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Account created successfully',
    });
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    const data = req.body as GoogleAuthInput;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const result = await authService.googleAuth(data, ipAddress);
    res.json({
      success: true,
      data: result,
    });
  }

  async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginInput;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const result = await authService.login(data, ipAddress);
    res.json({
      success: true,
      data: result,
    });
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenInput;
    const tokens = await authService.refreshToken(refreshToken);
    res.json({
      success: true,
      data: tokens,
    });
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, password } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, password);
    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  }
}

export const authController = new AuthController();
