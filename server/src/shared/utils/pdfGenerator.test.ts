import { describe, it, expect } from 'vitest';
import { generateInvoicePdf, CustomerBillingInfo, InvoiceWithLineItems } from './pdfGenerator';
import { InvoiceStatus } from '@shared/types';

describe('PDF Generator (PDFKit)', () => {
  const mockInvoice: InvoiceWithLineItems = {
    id: 'inv-123',
    invoice_number: 'INV-TEST-999',
    client_id: 'client-123',
    amount: 100.0,
    tax_amount: 18.0,
    total: 118.0,
    status: InvoiceStatus.PENDING,
    invoice_date: new Date('2026-07-02'),
    due_date: new Date('2026-07-16'),
    tenant_id: 'tenant-123',
    created_at: new Date('2026-07-02'),
  };

  const fullCustomerInfo: CustomerBillingInfo = {
    name: 'John Doe',
    email: 'john@example.com',
    tenantName: 'Acme Enterprise Inc',
    phoneNumber: '+1 (809) 555-1234',
    clientType: 'ENTERPRISE',
    clientId: 'client-123',
  };

  it('should generate a valid PDF buffer with full customer metadata', async () => {
    const pdfBuffer = await generateInvoicePdf(
      mockInvoice,
      fullCustomerInfo,
      'john@example.com',
      'Acme Enterprise Inc',
      'en_US'
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const pdfString = pdfBuffer.toString('latin1');
    expect(pdfString.startsWith('%PDF-')).toBe(true);
    expect(pdfString).toContain('%%EOF');
  });

  it('should generate valid PDF with multiple detailed line items', async () => {
    const invoiceWithLines: InvoiceWithLineItems = {
      ...mockInvoice,
      line_items: [
        {
          description: 'Managed IT Workstation Support (Standard Tier)',
          quantity: 5,
          unit_price: 20.0,
          amount: 100.0,
        },
        {
          description: 'Cloud Backup & Anti-Virus Add-on',
          quantity: 5,
          unit_price: 10.0,
          amount: 50.0,
        },
      ],
      amount: 150.0,
      tax_amount: 27.0,
      total: 177.0,
    };

    const pdfBuffer = await generateInvoicePdf(
      invoiceWithLines,
      fullCustomerInfo,
      'john@example.com',
      'Acme Enterprise Inc',
      'en_US'
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);
    const pdfString = pdfBuffer.toString('latin1');
    expect(pdfString.startsWith('%PDF-')).toBe(true);
    expect(pdfString).toContain('%%EOF');
  });

  it('should generate valid PDF for Spanish locale (es_DO)', async () => {
    const customerDO: CustomerBillingInfo = {
      name: 'Juan Perez',
      email: 'juan@empresa.do',
      tenantName: 'Empresa Dominicana SRL',
      phoneNumber: '+1 (849) 555-9876',
      clientType: 'COMMERCIAL',
      clientId: 'client-do-1',
    };

    const pdfBuffer = await generateInvoicePdf(
      mockInvoice,
      customerDO,
      'juan@empresa.do',
      'Empresa Dominicana SRL',
      'es_DO'
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(500);
    const pdfString = pdfBuffer.toString('latin1');
    expect(pdfString.startsWith('%PDF-')).toBe(true);
    expect(pdfString).toContain('%%EOF');
  });

  it('should handle PAID, OVERDUE, and CANCELLED status styling without error', async () => {
    const paidInvoice: InvoiceWithLineItems = {
      ...mockInvoice,
      status: InvoiceStatus.PAID,
    };
    const paidBuffer = await generateInvoicePdf(
      paidInvoice,
      'John Doe',
      'john@example.com',
      'Test Company',
      'en_US'
    );
    expect(paidBuffer).toBeInstanceOf(Buffer);
    expect(paidBuffer.length).toBeGreaterThan(500);

    const overdueInvoice: InvoiceWithLineItems = {
      ...mockInvoice,
      status: InvoiceStatus.OVERDUE,
    };
    const overdueBuffer = await generateInvoicePdf(
      overdueInvoice,
      'John Doe',
      'john@example.com',
      'Test Company',
      'es_DO'
    );
    expect(overdueBuffer).toBeInstanceOf(Buffer);
    expect(overdueBuffer.length).toBeGreaterThan(500);

    const cancelledInvoice: InvoiceWithLineItems = {
      ...mockInvoice,
      status: InvoiceStatus.CANCELLED,
    };
    const cancelledBuffer = await generateInvoicePdf(
      cancelledInvoice,
      fullCustomerInfo,
      'john@example.com',
      'Test Company',
      'en_US'
    );
    expect(cancelledBuffer).toBeInstanceOf(Buffer);
    expect(cancelledBuffer.length).toBeGreaterThan(500);
  });
});
