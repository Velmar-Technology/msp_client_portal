import { logger } from '@shared/utils/logger';

/**
 * Standard pagination query options parsed from HTTP requests.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Standard pagination metadata envelope returned in list responses.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Abstract Base Service providing standardized pagination parsing,
 * structured logging, and common domain operation utilities.
 *
 * @see ADR-017
 * @see ADR-018
 */
export abstract class BaseService {
  protected readonly logger = logger;

  /**
   * Parses and sanitizes untrusted HTTP query parameters into typed pagination coordinates.
   *
   * @param query - Request query object containing optional `page` and `limit`
   * @param defaultLimit - Fallback page size (defaults to 20)
   * @param maxLimit - Ceiling on page size to prevent denial of service (defaults to 100)
   * @returns Sanitized PaginationParams object with page, limit, and computed offset
   */
  protected parsePagination(
    query?: { page?: unknown; limit?: unknown },
    defaultLimit = 20,
    maxLimit = 100
  ): PaginationParams {
    const rawPage = Number(query?.page);
    const rawLimit = Number(query?.limit);

    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    let limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : defaultLimit;

    if (limit > maxLimit) {
      limit = maxLimit;
    }

    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Generates pagination envelope metadata for API responses.
   *
   * @param total - Total count of matching records across all pages
   * @param page - Current 1-indexed page number
   * @param limit - Page size limit
   * @returns PaginationMeta envelope
   */
  protected buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
    const totalPages = Math.ceil(total / Math.max(limit, 1)) || 1;
    return {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
