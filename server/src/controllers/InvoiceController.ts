import { Request, Response } from 'express';
import { invoiceService } from '../services/InvoiceService';
import { UserRole } from '../types';

export class InvoiceController {
  async getAll(req: Request, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const { invoices, total } = await invoiceService.getClientInvoices(req.user!.userId, page, limit);

    res.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const invoice = await invoiceService.getInvoiceById(
      req.params.id as string,
      req.user!.userId,
      req.user!.role as UserRole,
    );
    res.json({ success: true, data: invoice });
  }
}

export const invoiceController = new InvoiceController();
