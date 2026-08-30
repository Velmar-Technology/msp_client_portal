import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoicePdfService } from './InvoicePdfService';
import { InvoiceStatus, UserRole } from '@shared/types';
import { InvoiceWithLineItems } from '@shared/utils/pdfGenerator';
import { NotFoundError } from '@shared/errors';

describe('InvoicePdfService', () => {
  let userRepoMock: any;
  let tenantRepoMock: any;
  let subRepoMock: any;
  let planRepoMock: any;
  let service: InvoicePdfService;

  const mockInvoice: InvoiceWithLineItems = {
    id: 'inv-uuid-1',
    invoice_number: 'INV-2026-001',
    client_id: 'user-uuid-1',
    tenant_id: 'tenant-uuid-1',
    amount: 150.0,
    tax_amount: 27.0,
    total: 177.0,
    status: InvoiceStatus.PENDING,
    invoice_date: new Date('2026-08-01'),
    due_date: new Date('2026-08-15'),
    created_at: new Date('2026-08-01'),
  };

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: UserRole.CLIENT,
    language: 'en_US',
    phone_number: '+1 (849) 555-4321',
    client_type: 'COMMERCIAL',
  };

  const mockTenant = {
    id: 'tenant-uuid-1',
    name: 'Acme Global Corp',
  };

  const mockSubscription = {
    id: 'sub-1',
    service_name: 'Managed Workstation Protection',
    plan: 'enterprise',
    equipment_count: 3,
    created_at: new Date('2026-08-01'),
  };

  const mockPlan = {
    id: 'enterprise',
    name: {
      en_US: 'Enterprise IT Fleet Protection',
      es_DO: 'Protección de Flota TI Empresarial',
    },
    description: {
      en_US: '24/7 endpoint monitoring, automated patching, EDR security, and priority SLAs',
      es_DO: 'Monitoreo 24/7 de endpoints, parches automatizados, seguridad EDR y SLAs prioritarios',
    },
    price: 50,
  };

  beforeEach(() => {
    userRepoMock = {
      findById: vi.fn().mockResolvedValue(mockUser),
    };
    tenantRepoMock = {
      findById: vi.fn().mockResolvedValue(mockTenant),
    };
    subRepoMock = {
      findByClient: vi.fn().mockResolvedValue([mockSubscription]),
    };
    planRepoMock = {
      findById: vi.fn().mockResolvedValue(mockPlan),
    };
    service = new InvoicePdfService(userRepoMock, tenantRepoMock, subRepoMock, planRepoMock);
  });

  it('should generate PDF buffer successfully and enrich subscription & product plan descriptions when none provided', async () => {
    const result = await service.generatePdf(mockInvoice);

    expect(userRepoMock.findById).toHaveBeenCalledWith('user-uuid-1');
    expect(tenantRepoMock.findById).toHaveBeenCalledWith('tenant-uuid-1');
    expect(subRepoMock.findByClient).toHaveBeenCalledWith('user-uuid-1', 'tenant-uuid-1');
    expect(planRepoMock.findById).toHaveBeenCalledWith('enterprise');
    expect(result.invoiceNumber).toBe('INV-2026-001');
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pdfBuffer.length).toBeGreaterThan(500);
  });

  it('should preserve existing line items when already provided on invoice', async () => {
    const invoiceWithCustomLines: InvoiceWithLineItems = {
      ...mockInvoice,
      line_items: [
        {
          description: 'Emergency On-Site Server Diagnostic',
          quantity: 2,
          unit_price: 75.0,
          amount: 150.0,
        },
      ],
    };

    const result = await service.generatePdf(invoiceWithCustomLines);

    expect(subRepoMock.findByClient).not.toHaveBeenCalled();
    expect(planRepoMock.findById).not.toHaveBeenCalled();
    expect(result.invoiceNumber).toBe('INV-2026-001');
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pdfBuffer.length).toBeGreaterThan(500);
  });

  it('should support explicit preferred language parameter override with localized product plan description', async () => {
    const result = await service.generatePdf(mockInvoice, 'es_DO');

    expect(planRepoMock.findById).toHaveBeenCalledWith('enterprise');
    expect(result.invoiceNumber).toBe('INV-2026-001');
    expect(result.pdfBuffer).toBeInstanceOf(Buffer);
    expect(result.pdfBuffer.length).toBeGreaterThan(500);
  });

  it('should throw NotFoundError if client user does not exist', async () => {
    userRepoMock.findById.mockResolvedValue(null);

    await expect(service.generatePdf(mockInvoice)).rejects.toThrow(NotFoundError);
    await expect(service.generatePdf(mockInvoice)).rejects.toThrow('Client not found');
  });

  it('should throw NotFoundError if tenant does not exist', async () => {
    tenantRepoMock.findById.mockResolvedValue(null);

    await expect(service.generatePdf(mockInvoice)).rejects.toThrow(NotFoundError);
    await expect(service.generatePdf(mockInvoice)).rejects.toThrow('Tenant not found');
  });
});
