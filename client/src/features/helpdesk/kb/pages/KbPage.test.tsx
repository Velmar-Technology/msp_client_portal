import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KbPage } from './KbPage';

describe('KbPage', () => {
  it('renders the Knowledge Base FAQ page heading and support CTA link to /helpdesk/tickets', () => {
    render(
      <MemoryRouter initialEntries={['/helpdesk/kb']}>
        <KbPage />
      </MemoryRouter>
    );
    expect(screen.getByText('help.title')).toBeDefined();
    const ticketLink = screen.getByRole('link', { name: /help\.createSupportTicket/i });
    expect(ticketLink.getAttribute('href')).toBe('/helpdesk/tickets');
  });
});
