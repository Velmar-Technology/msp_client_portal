import { invoiceRepository } from '../repositories/InvoiceRepository';
import { userRepository } from '../repositories/UserRepository';
import { tenantRepository } from '../repositories/TenantRepository';
import { AppError } from '../utils/AppError';
import { Invoice, UserRole, InvoiceStatus } from '../types';
import { paypalService } from './PaypalService';
import { notificationService } from './NotificationService';
import { generateInvoicePdf } from '../utils/pdfGenerator';

export class InvoiceService {
  async getClientInvoices(tenantId: string, userRole: UserRole, page = 1, limit = 20): Promise<{ invoices: Invoice[]; total: number }> {
    const offset = (page - 1) * limit;
    if (userRole === UserRole.ADMIN) {
      const invoices = await invoiceRepository.findAll(limit, offset);
      const total = await invoiceRepository.count();
      return { invoices, total };
    } else {
      const invoices = await invoiceRepository.findByTenant(tenantId, limit, offset);
      const total = await invoiceRepository.countByTenant(tenantId);
      return { invoices, total };
    }
  }

  async getInvoiceById(id: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await invoiceRepository.findById(id);
    if (!invoice) throw AppError.notFound('Invoice not found');
    if (userRole === UserRole.CLIENT && invoice.tenant_id !== tenantId) {
      throw AppError.forbidden('Access denied');
    }
    return invoice;
  }

  async createPaypalOrder(id: string, tenantId: string, userRole: UserRole): Promise<{ orderId: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    if (invoice.status === InvoiceStatus.PAID) {
      throw AppError.badRequest('Invoice is already paid');
    }
    const order = await paypalService.createOrder(invoice);
    return { orderId: order.id };
  }

  async capturePaypalOrder(id: string, paypalOrderId: string, tenantId: string, userRole: UserRole): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice;
    }

    const captureResult = await paypalService.captureOrder(paypalOrderId);
    if (captureResult.status !== 'COMPLETED') {
      throw AppError.badRequest('PayPal payment was not completed');
    }

    const updatedInvoice = await invoiceRepository.updateStatus(id, InvoiceStatus.PAID);
    if (!updatedInvoice) {
      throw AppError.internal('Failed to update invoice status in database');
    }

    // Trigger in-app notification
    await notificationService.createInAppNotification({
      userId: invoice.client_id,
      title: 'Payment Received',
      message: `Your payment of $${Number(invoice.total).toFixed(2)} for invoice ${invoice.invoice_number} has been processed successfully.`,
      link: '/billing',
      type: 'INVOICE_PAID',
      tenantId: invoice.tenant_id,
    });

    return updatedInvoice;
  }

  async downloadInvoice(id: string, tenantId: string, userRole: UserRole, lang?: string): Promise<{ pdfBuffer: Buffer; invoiceNumber: string }> {
    const invoice = await this.getInvoiceById(id, tenantId, userRole);

    const client = await userRepository.findById(invoice.client_id);
    if (!client) throw AppError.notFound('Client not found');

    const tenant = await tenantRepository.findById(invoice.tenant_id);
    if (!tenant) throw AppError.notFound('Tenant not found');

    const finalLang = lang || client.language || 'en_US';

    const pdfBuffer = generateInvoicePdf(
      invoice,
      client.name,
      client.email,
      tenant.name,
      finalLang
    );

    return {
      pdfBuffer,
      invoiceNumber: invoice.invoice_number,
    };
  }
}

export const invoiceService = new InvoiceService();

