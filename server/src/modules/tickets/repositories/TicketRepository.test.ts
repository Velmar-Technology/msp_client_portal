import { describe, it, expect } from 'vitest';
import { TicketIdParamDTO } from '@shared/dtos/ticket.dto';
import { ticketRepository } from './TicketRepository';

describe('TicketIdParamDTO Validation', () => {
  it('rejects non-UUID strings such as human ticket codes (e.g. TCK-94821)', () => {
    const result = TicketIdParamDTO.safeParse({ id: 'TCK-94821' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe('Ticket ID Invalid');
    }
  });

  it('rejects empty or arbitrary strings', () => {
    expect(TicketIdParamDTO.safeParse({ id: '' }).success).toBe(false);
    expect(TicketIdParamDTO.safeParse({ id: 'invalid-id-123' }).success).toBe(false);
  });

  it('accepts valid UUID strings', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = TicketIdParamDTO.safeParse({ id: validUuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(validUuid);
    }
  });
});

describe('TicketRepository Defense-in-Depth', () => {
  it('returns null when findById is called with an invalid UUID string without querying db', async () => {
    const result = await ticketRepository.findById('TCK-94821');
    expect(result).toBeNull();
  });

  it('returns null when updateStatus is called with an invalid UUID string', async () => {
    const result = await ticketRepository.updateStatus('invalid-id', 'RESOLVED' as any);
    expect(result).toBeNull();
  });

  it('returns null when assignTechnician is called with an invalid UUID string', async () => {
    const result = await ticketRepository.assignTechnician('invalid-id', 'invalid-tech-id');
    expect(result).toBeNull();
  });

  it('returns empty array when getAttachments is called with an invalid UUID string', async () => {
    const result = await ticketRepository.getAttachments('invalid-id');
    expect(result).toEqual([]);
  });

  it('returns empty array when getAttachmentsByResponses is called with an invalid UUID string', async () => {
    const result = await ticketRepository.getAttachmentsByResponses('invalid-id');
    expect(result).toEqual([]);
  });
});
