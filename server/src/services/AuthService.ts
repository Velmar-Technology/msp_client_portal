import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/UserRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { hashPassword, comparePassword } from '../utils/passwordUtils';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { AuthTokens, JwtPayload, UserRole } from '../types';
import { LoginInput, RegisterInput, GoogleAuthInput } from '../dtos/auth.dto';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';


import { sendOTPWhatsApp } from '../utils/whatsappService';

export class AuthService {
  /**
   * Register a new user account.
   */
  async register(data: RegisterInput): Promise<{ user: { id: string; email: string; name: string; role: UserRole; language: string; tenantId: string; avatarUrl: string | null; clientType: string; phoneNumber: string | null }, message: string }> {
    // Check for existing user
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Generate and validate subdomain
    const subdomain = data.tenantName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 100);

    if (!subdomain) {
      throw AppError.badRequest('Company name must contain at least one alphanumeric character');
    }

    // Check for existing tenant name or subdomain
    const existingTenantBySubdomain = await tenantRepository.findBySubdomain(subdomain);
    if (existingTenantBySubdomain) {
      throw AppError.conflict('A company with this name or subdomain is already registered');
    }

    const existingTenantByName = await tenantRepository.findByName(data.tenantName);
    if (existingTenantByName) {
      throw AppError.conflict('A company with this name or subdomain is already registered');
    }

    // Create a new Tenant
    const tenant = await tenantRepository.create(data.tenantName, subdomain);

    // Hash password and create user linked to the new tenant
    const password_hash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      name: data.name,
      password_hash,
      role: UserRole.CLIENT,
      tenant_id: tenant.id,
      client_type: data.clientType,
      phone_number: data.phoneNumber,
    });

    logger.info('New user and tenant registered', { userId: user.id, email: user.email, tenantId: tenant.id });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // OTP expires in 15 mins
    
    await userRepository.setOTP(user.id, otp, expiresAt);
    logger.info('Email/WhatsApp verification OTP generated', { userId: user.id, otp });

    // If phone number was provided, send OTP via WhatsApp
    if (data.phoneNumber) {
      try {
        await sendOTPWhatsApp(data.phoneNumber, otp);
        logger.info('WhatsApp verification OTP sent', { userId: user.id, phoneNumber: data.phoneNumber });
      } catch (err: any) {
        logger.error('Failed to send WhatsApp OTP', { userId: user.id, error: err?.message });
      }
    }

    const message = data.phoneNumber
      ? 'Registration successful. Please check your WhatsApp / email to verify your account.'
      : 'Registration successful. Please check your email to verify your account.';

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language, tenantId: user.tenant_id, avatarUrl: user.avatar_url, clientType: user.client_type, phoneNumber: user.phone_number ?? null },
      message,
    };
  }

  /**
   * Authenticate user with email and password.
   */
  async login(data: LoginInput, ipAddress: string): Promise<{ user: { id: string; email: string; name: string; role: UserRole; language: string; tenantId: string; avatarUrl: string | null; lastLoginAt: string | null; lastLoginIp: string | null; clientType: string; phoneNumber: string | null }; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(data.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.is_active) {
      throw AppError.forbidden('Account has been deactivated');
    }

    if (!user.email_verified) {
      throw AppError.forbidden('Please verify your email address before logging in');
    }

    const isValid = await comparePassword(data.password, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Capture previous login data before updating
    const previousLoginAt = user.last_login_at ? user.last_login_at.toISOString() : null;
    const previousLoginIp = user.last_login_ip;

    // Update last login timestamp and IP
    await userRepository.updateLastLogin(user.id, ipAddress);

    logger.info('User logged in', { userId: user.id, email: user.email, tenantId: user.tenant_id });

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language, tenantId: user.tenant_id, avatarUrl: user.avatar_url, lastLoginAt: previousLoginAt, lastLoginIp: previousLoginIp, clientType: user.client_type, phoneNumber: user.phone_number ?? null },
      tokens,
    };
  }

  /**
   * Authenticate or register a user with Google OAuth.
   */
  async googleAuth(data: GoogleAuthInput, ipAddress: string): Promise<{
    user: { id: string; email: string; name: string; role: UserRole; language: string; tenantId: string; avatarUrl: string | null; lastLoginAt: string | null; lastLoginIp: string | null; clientType: string; phoneNumber: string | null };
    tokens: AuthTokens;
    isNewUser: boolean;
  }> {
    let email: string;
    let name: string;

    if (data.idToken.startsWith('mock-google-token-')) {
      if (env.NODE_ENV === 'production') {
        throw AppError.badRequest('Mock Google login is only allowed in development');
      }
      const parts = data.idToken.split('-');
      email = parts[3] || 'mock@example.com';
      name = parts[4] || 'Mock User';
    } else {
      if (!env.GOOGLE_CLIENT_ID) {
        throw AppError.internal('Google client ID is not configured');
      }
      const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
      try {
        const ticket = await client.verifyIdToken({
          idToken: data.idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.name) {
          throw AppError.unauthorized('Invalid Google ID Token payload');
        }
        email = payload.email;
        name = payload.name;
      } catch (error: any) {
        logger.error('Google token verification failed', { error: error.message });
        throw AppError.unauthorized('Invalid Google ID Token');
      }
    }

    // Check if user exists
    let user = await userRepository.findByEmail(email);
    let isNewUser = false;

    // Capture previous login data before updating
    const previousLoginAt = user?.last_login_at ? user.last_login_at.toISOString() : null;
    const previousLoginIp = user?.last_login_ip ?? null;

    if (!user) {
      isNewUser = true;
      // Register new user: create tenant and user
      const rawTenantName = data.tenantName || `${name}'s Workspace`;
      const baseSubdomain = rawTenantName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 90) || `tenant-${Date.now()}`;

      // Automatically resolve subdomain collisions
      let subdomain = baseSubdomain;
      let existingTenant = await tenantRepository.findBySubdomain(subdomain);
      let suffix = 1;
      while (existingTenant) {
        subdomain = `${baseSubdomain}-${suffix}`;
        existingTenant = await tenantRepository.findBySubdomain(subdomain);
        suffix++;
      }

      const tenant = await tenantRepository.create(rawTenantName, subdomain);

      // Generate a secure random password
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const password_hash = await hashPassword(randomPassword);

      user = await userRepository.create({
        email,
        name,
        password_hash,
        role: UserRole.CLIENT,
        tenant_id: tenant.id,
      });

      // Automatically verify email for Google OAuth users
      await userRepository.verifyEmail(user.id);

      logger.info('New user registered via Google OAuth', { userId: user.id, email: user.email, tenantId: tenant.id });
    } else {
      if (!user.is_active) {
        throw AppError.forbidden('Account has been deactivated');
      }
      logger.info('User logged in via Google OAuth', { userId: user.id, email: user.email, tenantId: user.tenant_id });
    }

    // Update last login timestamp and IP
    await userRepository.updateLastLogin(user.id, ipAddress);

    const tokens = this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, language: user.language, tenantId: user.tenant_id, avatarUrl: user.avatar_url, lastLoginAt: previousLoginAt, lastLoginIp: previousLoginIp, clientType: user.client_type, phoneNumber: user.phone_number ?? null },
      tokens,
      isNewUser,
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

      if (!user.email_verified) {
        throw AppError.forbidden('Please verify your email address');
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
   * Verify user's email using a valid OTP.
   */
  async verifyEmail(email: string, otp: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw AppError.badRequest('Invalid email or OTP');
    }

    if (user.email_verified) {
      throw AppError.badRequest('Email is already verified');
    }

    if (!user.otp_code || user.otp_code !== otp) {
      throw AppError.badRequest('Invalid OTP');
    }

    if (!user.otp_expires || user.otp_expires < new Date()) {
      throw AppError.badRequest('OTP has expired');
    }

    await userRepository.verifyEmail(user.id);
    logger.info('Email verified successfully via OTP', { userId: user.id });
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
