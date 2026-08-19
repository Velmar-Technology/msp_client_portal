import { Request, Response } from 'express';
import { ValidationError } from '@shared/errors';
import { invoiceService } from '@modules/billing/services/InvoiceService';
import { UserRole } from '@shared/types';

export class InvoiceController {
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

  async getById(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.getInvoiceById(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole,
    );
    res.json({ success: true, data: invoice });
  }

  async createPaypalOrder(req: Request, res: Response): Promise<void> {
    const result = await invoiceService.createPaypalOrder(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: result });
  }

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

  async markAsPaid(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.markAsPaid(
      req.params.id as string,
      req.user!.tenantId,
      req.user!.role as UserRole
    );
    res.json({ success: true, data: invoice });
  }

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
}

export const invoiceController = new InvoiceController();

