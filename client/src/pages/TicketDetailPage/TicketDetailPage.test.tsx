import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TicketDetailPage } from '@/features/tickets';

describe('TicketDetailPage legacy re-export', () => {
  it('exports TicketDetailPage component from gateway', () => {
    expect(TicketDetailPage).toBeDefined();
  });
});
