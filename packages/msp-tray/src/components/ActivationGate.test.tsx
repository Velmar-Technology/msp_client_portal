import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActivationGate } from './ActivationGate';

describe('ActivationGate Component', () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText.mockResolvedValue(undefined),
      },
    });
  });

  it('renders formatted 6-digit PIN and instructions', () => {
    render(
      <ActivationGate
        pairingCode="839201"
        pairingCodeExpiresAt={new Date(Date.now() + 10 * 60 * 1000).toISOString()}
        onRefreshCode={vi.fn()}
      />
    );

    expect(screen.getByText('Workstation Activation Required')).toBeTruthy();
    expect(screen.getByText('839 - 201')).toBeTruthy();
    expect(screen.getByText(/Expires in/)).toBeTruthy();
  });

  it('copies PIN to clipboard when Copy PIN button is clicked', async () => {
    render(
      <ActivationGate
        pairingCode="123456"
        pairingCodeExpiresAt={new Date(Date.now() + 5 * 60 * 1000).toISOString()}
        onRefreshCode={vi.fn()}
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Copy PIN/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(mockWriteText).toHaveBeenCalledWith('123456');
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  it('calls onRefreshCode when New PIN button is clicked', async () => {
    const onRefreshMock = vi.fn().mockResolvedValue(undefined);
    render(
      <ActivationGate
        pairingCode="654321"
        pairingCodeExpiresAt={new Date(Date.now() + 5 * 60 * 1000).toISOString()}
        onRefreshCode={onRefreshMock}
      />
    );

    const refreshBtn = screen.getByRole('button', { name: /New PIN/i });
    await act(async () => {
      fireEvent.click(refreshBtn);
    });

    expect(onRefreshMock).toHaveBeenCalledTimes(1);
  });

  it('indicates code expiration when expiresAt is in the past', () => {
    render(
      <ActivationGate
        pairingCode="999888"
        pairingCodeExpiresAt={new Date(Date.now() - 60 * 1000).toISOString()}
        onRefreshCode={vi.fn()}
      />
    );

    expect(screen.getByText('Code has expired')).toBeTruthy();
  });
});
