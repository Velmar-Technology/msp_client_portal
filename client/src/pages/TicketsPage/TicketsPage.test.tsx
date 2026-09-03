import { describe, it, expect } from 'vitest';
import { TicketsPage } from '@/features/tickets';

describe('TicketsPage legacy re-export', () => {
  it('exports TicketsPage component from gateway', () => {
    expect(TicketsPage).toBeDefined();
  });
});
