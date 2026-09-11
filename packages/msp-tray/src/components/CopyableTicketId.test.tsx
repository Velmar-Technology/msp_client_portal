import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CopyableTicketId } from './CopyableTicketId';

describe('CopyableTicketId', () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText.mockResolvedValue(undefined),
      },
    });
  });

  it('renders truncated ticket ID with default prefix', () => {
    render(<CopyableTicketId id="c4a8b79e-1234-5678-9abc-def012345678" />);
    expect(screen.getByText('#c4a8b79e')).toBeTruthy();
  });

  it('copies full ticket ID to clipboard on click and prevents event bubbling', async () => {
    const parentClick = vi.fn();
    const fullId = 'c4a8b79e-1234-5678-9abc-def012345678';

    render(
      <div onClick={parentClick}>
        <CopyableTicketId id={fullId} />
      </div>
    );

    const button = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith(fullId);
    expect(parentClick).not.toHaveBeenCalled();
    expect(button.getAttribute('title')).toBe('Ticket ID copied!');
  });

  it('supports custom prefix and full display length', () => {
    render(<CopyableTicketId id="t-4819" prefix="" displayLength={0} />);
    expect(screen.getByText('t-4819')).toBeTruthy();
  });
});
