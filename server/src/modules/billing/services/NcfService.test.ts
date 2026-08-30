import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NcfService } from './NcfService';
import { InvoiceRepository } from '@modules/billing/repositories/InvoiceRepository';

describe('NcfService', () => {
  let invoiceRepoMock: Partial<InvoiceRepository>;
  let ncfService: NcfService;

  beforeEach(() => {
    invoiceRepoMock = {
      findLatestNcf: vi.fn().mockResolvedValue(null),
      findByNcf: vi.fn().mockResolvedValue(null),
    };
    ncfService = new NcfService(invoiceRepoMock as InvoiceRepository);
  });

  describe('isValidNcf', () => {
    it('validates Series B01 (11 chars: B01 + 8 digits)', () => {
      expect(ncfService.isValidNcf('B0100000001')).toBe(true);
      expect(ncfService.isValidNcf('B0100000123')).toBe(true);
    });

    it('validates Electronic Series E31 (13 chars: E31 + 10 digits)', () => {
      expect(ncfService.isValidNcf('E310000000001')).toBe(true);
    });

    it('rejects invalid patterns', () => {
      expect(ncfService.isValidNcf('INV-2025-001')).toBe(false);
      expect(ncfService.isValidNcf('B01123')).toBe(false);
      expect(ncfService.isValidNcf('B0200000001')).toBe(false);
      expect(ncfService.isValidNcf(null)).toBe(false);
      expect(ncfService.isValidNcf(undefined)).toBe(false);
    });
  });

  describe('shouldIssueNcf', () => {
    it('returns true when valid company RNC is provided', () => {
      expect(ncfService.shouldIssueNcf('1-01-00001-5')).toBe(true);
      expect(ncfService.shouldIssueNcf('101000015')).toBe(true);
    });

    it('returns false when invalid or missing RNC is provided', () => {
      expect(ncfService.shouldIssueNcf('101000019')).toBe(false);
      expect(ncfService.shouldIssueNcf('')).toBe(false);
      expect(ncfService.shouldIssueNcf(null)).toBe(false);
    });
  });

  describe('generateNextNcf', () => {
    it('starts at B0100000001 when no previous NCF exists', async () => {
      vi.mocked(invoiceRepoMock.findLatestNcf!).mockResolvedValue(null);
      vi.mocked(invoiceRepoMock.findByNcf!).mockResolvedValue(null);

      const ncf = await ncfService.generateNextNcf();
      expect(ncf).toBe('B0100000001');
    });

    it('increments sequence based on latest NCF', async () => {
      vi.mocked(invoiceRepoMock.findLatestNcf!).mockResolvedValue('B0100000042');
      vi.mocked(invoiceRepoMock.findByNcf!).mockResolvedValue(null);

      const ncf = await ncfService.generateNextNcf();
      expect(ncf).toBe('B0100000043');
    });

    it('skips collided NCFs until an unused number is found', async () => {
      vi.mocked(invoiceRepoMock.findLatestNcf!).mockResolvedValue('B0100000005');
      vi.mocked(invoiceRepoMock.findByNcf!)
        .mockResolvedValueOnce({ id: 'existing' } as any) // B0100000006 exists
        .mockResolvedValueOnce(null); // B0100000007 free

      const ncf = await ncfService.generateNextNcf();
      expect(ncf).toBe('B0100000007');
    });
  });

  describe('assignNcfIfEligible', () => {
    it('generates NCF when client has valid RNC', async () => {
      vi.mocked(invoiceRepoMock.findLatestNcf!).mockResolvedValue(null);
      vi.mocked(invoiceRepoMock.findByNcf!).mockResolvedValue(null);

      const result = await ncfService.assignNcfIfEligible('1-01-00001-5');
      expect(result).toBe('B0100000001');
    });

    it('returns null when client does not supply a valid RNC', async () => {
      const result = await ncfService.assignNcfIfEligible('invalid-rnc');
      expect(result).toBeNull();
    });
  });
});
