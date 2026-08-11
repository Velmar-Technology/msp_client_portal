import { Invoice, UserRole } from '../types';
import { AppError } from '../utils/AppError';

export class InvoiceAccessPolicy {
  assertAccess(invoice: Invoice, tenantId: string, userRole: UserRole): void {
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw AppError.forbidden('Access denied');
    }
  }

  assertAdmin(userRole: UserRole, message = 'Only administrators can perform this action'): void {
    if (userRole !== UserRole.ADMIN) {
      throw AppError.forbidden(message);
    }
  }
}

export const invoiceAccessPolicy = new InvoiceAccessPolicy();
