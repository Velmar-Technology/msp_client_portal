import { describe, it, expect } from 'vitest';
import { AccountStatusPolicy } from './AccountStatusPolicy';
import { AccountStatus, UserContext, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

describe('AccountStatusPolicy', () => {
  const policy = new AccountStatusPolicy();

  describe('state checks', () => {
    it('correctly identifies states', () => {
      expect(policy.isReadOnly(AccountStatus.READ_ONLY)).toBe(true);
      expect(policy.isReadOnly(AccountStatus.ACTIVE)).toBe(false);

      expect(policy.isSuspended(AccountStatus.SUSPENDED)).toBe(true);
      expect(policy.isSuspended(AccountStatus.ACTIVE)).toBe(false);

      expect(policy.isPurged(AccountStatus.PURGED)).toBe(true);
      expect(policy.isPurged(AccountStatus.ACTIVE)).toBe(false);
    });
  });

  describe('assertWriteAllowed', () => {
    it('allows write operations for ACTIVE client', () => {
      const ctx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.ACTIVE,
      };
      expect(() => policy.assertWriteAllowed(ctx)).not.toThrow();
    });

    it('throws ForbiddenError for READ_ONLY client', () => {
      const ctx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.READ_ONLY,
      };
      expect(() => policy.assertWriteAllowed(ctx)).toThrow(ForbiddenError);
    });

    it('throws ForbiddenError for SUSPENDED client', () => {
      const ctx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.SUSPENDED,
      };
      expect(() => policy.assertWriteAllowed(ctx)).toThrow(ForbiddenError);
    });

    it('throws ForbiddenError for PURGED client', () => {
      const ctx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.PURGED,
      };
      expect(() => policy.assertWriteAllowed(ctx)).toThrow(ForbiddenError);
    });

    it('always permits ADMIN and TECHNICIAN regardless of account status', () => {
      const adminCtx: UserContext = {
        userId: 'admin',
        role: UserRole.ADMIN,
        tenantId: 't1',
        accountStatus: AccountStatus.READ_ONLY,
      };
      const techCtx: UserContext = {
        userId: 'tech',
        role: UserRole.TECHNICIAN,
        tenantId: 't1',
        accountStatus: AccountStatus.SUSPENDED,
      };

      expect(() => policy.assertWriteAllowed(adminCtx)).not.toThrow();
      expect(() => policy.assertWriteAllowed(techCtx)).not.toThrow();
    });
  });

  describe('assertPlatformAccessAllowed', () => {
    it('allows platform access for ACTIVE and READ_ONLY clients', () => {
      const activeCtx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.ACTIVE,
      };
      const readOnlyCtx: UserContext = {
        userId: 'u2',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.READ_ONLY,
      };

      expect(() => policy.assertPlatformAccessAllowed(activeCtx)).not.toThrow();
      expect(() => policy.assertPlatformAccessAllowed(readOnlyCtx)).not.toThrow();
    });

    it('throws ForbiddenError for SUSPENDED and PURGED clients', () => {
      const suspendedCtx: UserContext = {
        userId: 'u1',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.SUSPENDED,
      };
      const purgedCtx: UserContext = {
        userId: 'u2',
        role: UserRole.CLIENT,
        tenantId: 't1',
        accountStatus: AccountStatus.PURGED,
      };

      expect(() => policy.assertPlatformAccessAllowed(suspendedCtx)).toThrow(ForbiddenError);
      expect(() => policy.assertPlatformAccessAllowed(purgedCtx)).toThrow(ForbiddenError);
    });
  });
});
