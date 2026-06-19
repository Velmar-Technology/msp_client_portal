import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/UserRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { AuthTokens, JwtPayload, UserRole } from '../types';
import { LoginInput, RegisterInput } from '../dtos/auth.dto';

export class AuthService {
  /**
   * Register a new user account.
   */
  async register(data: RegisterInput): Promise<{ user: { id: string; email: string; name: string; role: UserRole; language: string; tenantId: string }; tokens: AuthTokens }> {
    // Check for existing user
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Create a new Tenant
    const subdomain = data.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 100);
    const tenant = await tenantRepository.create(data.tenantName, subdomain);

    // Hash password and create user linked to the new tenant
    const password_hash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      name: data.name,
      password_hash,
      role: UserRole.CLIENT,
      tenant_id: tenant.id,
    });

    logger.info('New user and tenant registered', { userId: user.id, email: user.email, tenantId: tenant.id });

    // Generate tokens including tenantId
    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language, tenantId: user.tenant_id },
      tokens,
    };
  }

  /**
   * Authenticate user with email and password.
   */
  async login(data: LoginInput): Promise<{ user: { id: string; email: string; name: string; role: UserRole; language: string; tenantId: string }; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw AppError.forbidden('Account has been deactivated');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    logger.info('User logged in', { userId: user.id, email: user.email, tenantId: user.tenant_id });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language, tenantId: user.tenant_id },
      tokens,
    };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw AppError.unauthorized('Invalid refresh token');
      }

      return this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id,
      });
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Initiate password reset flow (stub — sends email with token).
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      logger.debug('Password reset requested for non-existent email', { email });
      return;
    }

    // Generate reset token (in production, store in DB with expiry)
    const resetToken = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: '1h' });

    logger.info('Password reset token generated', { userId: user.id, token: resetToken });
    // TODO: Send email with reset link containing the token
  }

  /**
   * Reset password using a valid reset token.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string };
      const password_hash = await hashPassword(newPassword);
      await userRepository.updatePassword(decoded.userId, password_hash);
      logger.info('Password reset successfully', { userId: decoded.userId });
    } catch {
      throw AppError.badRequest('Invalid or expired reset token');
    }
  }

  /**
   * Generate JWT access and refresh tokens.
   */
  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
    });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
