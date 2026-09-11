import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import * as tauriService from '../services/tauri';

vi.mock('../services/tauri', () => ({
  logClientEvent: vi.fn().mockResolvedValue(undefined),
  openTrayLogDir: vi.fn().mockResolvedValue(undefined),
}));

const ThrowingComponent = () => {
  throw new Error('Simulated Render Crash');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child-content">Normal Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeTruthy();
    expect(tauriService.logClientEvent).not.toHaveBeenCalled();
  });

  it('catches render errors and calls logClientEvent with error details', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Support Assistant Encountered an Error')).toBeTruthy();
    expect(screen.getByText('Simulated Render Crash')).toBeTruthy();
    expect(tauriService.logClientEvent).toHaveBeenCalledWith(
      'error',
      'React Unhandled Exception: Simulated Render Crash',
      expect.stringContaining('ComponentStack:')
    );
  });

  it('calls openTrayLogDir when Open Logs button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    const openLogsBtn = screen.getByRole('button', { name: /open logs/i });
    fireEvent.click(openLogsBtn);

    expect(tauriService.openTrayLogDir).toHaveBeenCalled();
  });
});
