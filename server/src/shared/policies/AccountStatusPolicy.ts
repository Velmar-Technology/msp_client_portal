import { AccountStatus, UserContext, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

/**
 * Access policy enforcing tenant and account operational state boundaries per the Non-Payment Suspension Scale.
 *
 * @see Section 9.3 (Non-Payment Suspension Scale: Day 5 Read-Only, Day 15 Suspension, Day 30 Purge)
 */
export class AccountStatusPolicy {
  /**
   * Checks whether the given account status is in Read-Only mode.
   *
   * @param status - Account status enum or string
   * @returns True if READ_ONLY
   */
  isReadOnly(status?: AccountStatus | string | null): boolean {
    return status === AccountStatus.READ_ONLY;
  }

  /**
   * Checks whether the given account status is Suspended.
   *
   * @param status - Account status enum or string
   * @returns True if SUSPENDED
   */
  isSuspended(status?: AccountStatus | string | null): boolean {
    return status === AccountStatus.SUSPENDED;
  }

  /**
   * Checks whether the given account status is Purged.
   *
   * @param status - Account status enum or string
   * @returns True if PURGED
   */
  isPurged(status?: AccountStatus | string | null): boolean {
    return status === AccountStatus.PURGED;
  }

  /**
   * Asserts that the authenticated user context is permitted to execute data mutations and file uploads.
   * Blocks clients whose accounts are in READ_ONLY, SUSPENDED, or PURGED state.
   *
   * @param ctx - UserContext or user metadata
   * @throws {ForbiddenError} When account is in Read-Only, Suspended, or Purged state
   */
  assertWriteAllowed(ctx: UserContext | { accountStatus?: AccountStatus; role?: UserRole }): void {
    if (ctx.role === UserRole.ADMIN || ctx.role === UserRole.TECHNICIAN) {
      return;
    }

    const status = ctx.accountStatus;
    if (status === AccountStatus.READ_ONLY) {
      throw new ForbiddenError(
        'Your account is in Read-Only mode due to overdue invoices. Modifying or uploading new files and data is restricted.'
      );
    }
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenError(
        'Your account has been suspended due to overdue invoices. Platform and support access is restricted.'
      );
    }
    if (status === AccountStatus.PURGED) {
      throw new ForbiddenError(
        'Your account data has been permanently purged due to extended non-payment per Section 9.3.'
      );
    }
  }

  /**
   * Asserts that the caller is permitted to access general platform and support services.
   * Blocks clients whose accounts are SUSPENDED or PURGED.
   *
   * @param ctx - UserContext or user metadata
   * @throws {ForbiddenError} When account is Suspended or Purged
   */
  assertPlatformAccessAllowed(ctx: UserContext | { accountStatus?: AccountStatus; role?: UserRole }): void {
    if (ctx.role === UserRole.ADMIN || ctx.role === UserRole.TECHNICIAN) {
      return;
    }

    const status = ctx.accountStatus;
    if (status === AccountStatus.SUSPENDED) {
      throw new ForbiddenError(
        'Account access and support services are suspended due to unpaid invoices. Please settle outstanding invoices.'
      );
    }
    if (status === AccountStatus.PURGED) {
      throw new ForbiddenError(
        'Account access has been terminated and data purged due to non-payment.'
      );
    }
  }
}

export const accountStatusPolicy = new AccountStatusPolicy();
