import { Invoice, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

/**
 * Policy enforcing invoice access boundaries and administrative authorizations.
 */
export class InvoiceAccessPolicy {
  /**
   * Asserts that a user has permission to view an invoice based on role and tenant matching.
   *
   * @param invoice - Invoice entity
   * @param tenantId - User's tenant UUID
   * @param userRole - UserRole enum
   * @throws {ForbiddenError} When a client attempts to view a cross-tenant invoice
   */
  assertAccess(invoice: Invoice, tenantId: string, userRole: UserRole): void {
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
  }

  /**
   * Asserts that the authenticated user holds an ADMIN role.
   *
   * @param userRole - UserRole enum
   * @param message - Custom error message (optional)
   * @throws {ForbiddenError} When user is not an administrator
   */
  assertAdmin(userRole: UserRole, message = 'Only administrators can perform this action'): void {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError(message);
    }
  }
}

export const invoiceAccessPolicy = new InvoiceAccessPolicy();
