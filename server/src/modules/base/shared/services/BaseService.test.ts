import { describe, it, expect } from 'vitest';
import { BaseService } from './BaseService';

class ConcreteService extends BaseService {
  public testParsePagination(query?: { page?: unknown; limit?: unknown }, defaultLimit?: number, maxLimit?: number) {
    return this.parsePagination(query, defaultLimit, maxLimit);
  }

  public testBuildPaginationMeta(total: number, page: number, limit: number) {
    return this.buildPaginationMeta(total, page, limit);
  }
}

describe('BaseService Utilities (ADR-018)', () => {
  const service = new ConcreteService();

  describe('parsePagination', () => {
    it('uses defaults when query is undefined or empty', () => {
      const parsed = service.testParsePagination(undefined);
      expect(parsed).toEqual({ page: 1, limit: 20, offset: 0 });
    });

    it('correctly calculates offset for page 3 with limit 15', () => {
      const parsed = service.testParsePagination({ page: '3', limit: '15' });
      expect(parsed).toEqual({ page: 3, limit: 15, offset: 30 });
    });

    it('caps limit at maxLimit', () => {
      const parsed = service.testParsePagination({ page: 1, limit: 500 }, 20, 50);
      expect(parsed.limit).toBe(50);
    });

    it('gracefully handles non-numeric or negative inputs', () => {
      const parsed = service.testParsePagination({ page: '-5', limit: 'abc' });
      expect(parsed).toEqual({ page: 1, limit: 20, offset: 0 });
    });
  });

  describe('buildPaginationMeta', () => {
    it('calculates totalPages and navigation flags accurately', () => {
      const meta = service.testBuildPaginationMeta(95, 2, 20);
      expect(meta).toEqual({
        total: 95,
        page: 2,
        limit: 20,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('handles first page navigation flags', () => {
      const meta = service.testBuildPaginationMeta(10, 1, 20);
      expect(meta.hasNext).toBe(false);
      expect(meta.hasPrev).toBe(false);
      expect(meta.totalPages).toBe(1);
    });
  });
});
