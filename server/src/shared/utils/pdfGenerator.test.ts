import { describe, it, expect } from 'vitest';
import { generateInvoicePdf } from './pdfGenerator';
import { Invoice, InvoiceStatus } from '@shared/types';

describe('PDF Generator', () => {
  const mockInvoice: Invoice = {
    id: 'inv-123',
    invoice_number: 'INV-TEST-999',
    client_id: 'client-123',
    amount: 100.00,
    tax_amount: 18.00,
    total: 118.00,
    status: InvoiceStatus.PENDING,
    invoice_date: new Date('2026-07-02'),
    due_date: new Date('2026-07-16'),
    tenant_id: 'tenant-123',
    created_at: new Date('2026-07-02'),
  };

  it('should generate a valid PDF structure', () => {
    const pdfBuffer = generateInvoicePdf(
      mockInvoice,
      'John Doe',
      'john@example.com',
      'Test Company',
      'en_US'
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfString = pdfBuffer.toString('binary');

    // Check PDF header
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);

    // Check PDF objects and catalog
    expect(pdfString).toContain('1 0 obj');
    expect(pdfString).toContain('<< /Type /Catalog /Pages 2 0 R >>');
    expect(pdfString).toContain('xref');
    expect(pdfString).toContain('trailer');
    expect(pdfString).toContain('%%EOF');

    // Check that custom invoice data is present
    expect(pdfString).toContain('INV-TEST-999');
    expect(pdfString).toContain('John Doe');
    expect(pdfString).toContain('john@example.com');
    expect(pdfString).toContain('Test Company');
  });

  it('should support Spanish locale translation', () => {
    const pdfBuffer = generateInvoicePdf(
      mockInvoice,
      'John Doe',
      'john@example.com',
      'Test Company',
      'es_DO'
    );

    const pdfString = pdfBuffer.toString('binary');
    expect(pdfString).toContain('FACTURA');
    expect(pdfString).toContain('No. Factura:');
    expect(pdfString).toContain('Pendiente');
  });
});
