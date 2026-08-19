import { Invoice, UserRole } from '@shared/types';
import { ForbiddenError } from '@shared/errors';

export class InvoiceAccessPolicy {
  assertAccess(invoice: Invoice, tenantId: string, userRole: UserRole): void {
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw new ForbiddenError('Access denied');
    }
  }

  assertAdmin(userRole: UserRole, message = 'Only administrators can perform this action'): void {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenError(message);
    }
  }
}

export const invoiceAccessPolicy = new InvoiceAccessPolicy();
