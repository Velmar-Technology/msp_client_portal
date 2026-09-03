import { Request, Response } from 'express';
import { ValidationError } from '@shared/errors';
import { invoiceService } from '@modules/billing/services/InvoiceService';
import { nonPaymentSuspensionService } from '@modules/billing/services/NonPaymentSuspensionService';
import { UserRole } from '@shared/types';

/**
 * Controller handling HTTP requests for invoice listing, PayPal order creation/capture,
 * admin mark-as-paid, cancellations, PDF streaming, and financial statistics.
 */
export class InvoiceController {
  /**
   * Handles paginated invoice listing for current tenant or all invoices for admin.
   *
   * @param req - Express request with pagination query params
   * @param res - Express response returning invoice list and pagination metadata
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { invoices, total } = await invoiceService.getClientInvoices(
      req.user!.tenantId,
      req.user!.role as UserRole,
      page,
      limit
    );

    res.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /**
   * Handles retrieving a single invoice by UUID.
   *
   * @param req - Express request with invoice ID in params
   * @param res - Express response returning invoice entity
   */
  async getById(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.getInvoiceById(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole,
    );
    res.json({ success: true, data: invoice });
  }

  /**
   * Handles initiating a PayPal checkout order for an unpaid invoice.
   *
   * @param req - Express request with invoice ID in params
   * @param res - Express response returning PayPal order ID
   */
  async createPaypalOrder(req: Request, res: Response): Promise<void> {
    const result = await invoiceService.createPaypalOrder(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: result });
  }

  /**
   * Handles capturing an authorized PayPal order and finalizing invoice settlement.
   *
   * @param req - Express request with invoice ID in params and orderId in body
   * @param res - Express response returning settled invoice
   */
  async capturePaypalOrder(req: Request, res: Response): Promise<void> {
    const { orderId } = req.body;
    const invoice = await invoiceService.capturePaypalOrder(
      req.params.id as string,
      orderId as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: invoice });
  }

  /**
   * Handles manual payment confirmation by an administrator.
   *
   * @param req - Express request with invoice ID in params
   * @param res - Express response returning settled invoice
   */
  async markAsPaid(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.markAsPaid(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: invoice });
  }

  /**
   * Handles invoice cancellation requests.
   *
   * @param req - Express request with invoice ID in params and optional reason in body
   * @param res - Express response returning cancelled invoice
   */
  async cancel(req: Request, res: Response): Promise<void> {
    const reason = req.body?.reason as string | undefined;
    const invoice = await invoiceService.cancelInvoice(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole,
      req.user!.userId,
      reason
    );
    res.json({ success: true, data: invoice });
  }

  /**
   * Handles streaming the rendered binary PDF document for an invoice.
   *
   * @param req - Express request with invoice ID in params and optional lang query param
   * @param res - Express response streaming application/pdf buffer
   */
  async download(req: Request, res: Response): Promise<void> {
    const lang = req.query.lang as string;
    const { pdfBuffer, invoiceNumber } = await invoiceService.downloadInvoice(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole,
      lang
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  }

  /**
   * Handles calculating and returning high-level financial KPIs and charts.
   *
   * @param req - Express request with range query param
   * @param res - Express response returning financial stats dataset
   * @throws {ValidationError} When range parameter is invalid
   */
  async getFinancialStats(req: Request, res: Response): Promise<void> {
    const range = (req.query.range as '30_days' | 'quarter' | 'year') || '30_days';
    if (!['30_days', 'quarter', 'year'].includes(range)) {
      throw new ValidationError('Invalid range parameter');
    }
    const stats = await invoiceService.getFinancialStats(
      req.user!.tenantId,
      req.user!.role as UserRole,
      range
    );
    res.json({ success: true, data: stats });
  }

  /**
   * Handles requesting a 24-hour emergency grace extension for the tenant's password vault (BL-702).
   *
   * @param req - Express request with optional reason in body
   * @param res - Express response returning grace extension status
   */
  async requestVaultGrace(req: Request, res: Response): Promise<void> {
    const reason = req.body?.reason;
    const result = await nonPaymentSuspensionService.requestVaultGraceExtension(
      req.user!.userId,
      req.user!.tenantId,
      reason
    );
    res.json({ success: true, data: result });
  }
}

export const invoiceController = new InvoiceController();

