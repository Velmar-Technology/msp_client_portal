import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { authService } from '../api/authService';
import enTranslations from '@/locales/en_US.json';

let mockLanguage = 'en_US';

const mockT = (key: string, options?: any) => {
  const parts = key.split('.');
   
  let current: any = enTranslations;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  if (typeof current === 'string') {
    if (options && typeof options === 'object') {
      let res = current;
      for (const k of Object.keys(options)) {
        res = res.replace(`{{${k}}}`, options[k]);
      }
      return res;
    }
    return current;
  }
  return key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      get language() {
        return mockLanguage;
      },
      changeLanguage: (lng: string) => {
        mockLanguage = lng;
        return Promise.resolve();
      },
    },
  }),
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

const mockLogin = vi.fn();
const mockVerifyEmail = vi.fn();
const mockLoginWithGoogle = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
    verifyEmail: mockVerifyEmail,
    loginWithGoogle: mockLoginWithGoogle,
  }),
}));

vi.mock('../api/authService', () => ({
  authService: {
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
    getCurrentUser: vi.fn().mockReturnValue(null),
    isAuthenticated: vi.fn().mockReturnValue(false),
  },
}));

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverMock;
  global.ResizeObserver = ResizeObserverMock;
}

describe('LoginPage Password Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders login page with forgot password link', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(enTranslations.login.welcome)).toBeInTheDocument();
    expect(screen.getByText(enTranslations.login.forgotPassword)).toBeInTheDocument();
  });

  test('opens forgot password dialog when clicking forgot password link', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    const forgotBtn = screen.getByText(enTranslations.login.forgotPassword);
    fireEvent.click(forgotBtn);

    await waitFor(() => {
      expect(screen.getByText(enTranslations.passwordReset.forgotPasswordTitle)).toBeInTheDocument();
      expect(screen.getByText(enTranslations.passwordReset.sendResetLink)).toBeInTheDocument();
    });
  });

  test('submits forgot password form and displays success state', async () => {
    vi.mocked(authService.forgotPassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/login?openModal=forgot-password']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(enTranslations.passwordReset.forgotPasswordTitle)).toBeInTheDocument();

    const emailInput = document.querySelector('#forgot-email') as HTMLInputElement;
    expect(emailInput).toBeInTheDocument();
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByText(enTranslations.passwordReset.sendResetLink);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(mockToast.success).toHaveBeenCalledWith(enTranslations.passwordReset.requestSuccessToast);
      expect(screen.getByText(enTranslations.passwordReset.resetEmailSentTitle)).toBeInTheDocument();
    });
  });

  test('displays error message when email does not exist in database on forgot password', async () => {
    vi.mocked(authService.forgotPassword).mockRejectedValueOnce({
      response: { data: { message: 'No account found with this email address' } },
    });

    render(
      <MemoryRouter initialEntries={['/login?openModal=forgot-password']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    const emailInput = document.querySelector('#forgot-email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } });

    const submitBtn = screen.getByText(enTranslations.passwordReset.sendResetLink);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('No account found with this email address')).toBeInTheDocument();
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  test('renders reset password dialog when opened with token in link', async () => {
    render(
      <MemoryRouter initialEntries={['/login?openModal=reset-password&token=test-reset-token-123']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(enTranslations.passwordReset.resetPasswordTitle)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(enTranslations.passwordReset.newPasswordPlaceholder)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(enTranslations.passwordReset.confirmNewPasswordPlaceholder)).toBeInTheDocument();
    });
  });

  test('displays missing link warning when reset password modal opened without token', async () => {
    render(
      <MemoryRouter initialEntries={['/login?openModal=reset-password']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(enTranslations.passwordReset.missingLinkError)).toBeInTheDocument();
      expect(screen.getByText(enTranslations.passwordReset.requestNewLink)).toBeInTheDocument();
    });
  });

  test('validates and submits new password in reset password dialog with token in link', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter initialEntries={['/login?openModal=reset-password&token=valid-token']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    const newPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.newPasswordPlaceholder);
    const confirmPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.confirmNewPasswordPlaceholder);

    fireEvent.change(newPassInput, { target: { value: 'SuperSecret123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'SuperSecret123!' } });

    const submitBtn = screen.getByText(enTranslations.passwordReset.resetSubmitButton);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith('valid-token', 'SuperSecret123!', 'SuperSecret123!');
      expect(mockToast.success).toHaveBeenCalledWith(enTranslations.passwordReset.successToast);
    });
  });

  test('validates password complexity with zod and displays error for weak password', async () => {
    render(
      <MemoryRouter initialEntries={['/login?openModal=reset-password&token=valid-token']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    const newPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.newPasswordPlaceholder);
    const confirmPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.confirmNewPasswordPlaceholder);

    // Missing uppercase letter
    fireEvent.change(newPassInput, { target: { value: 'lowercase123' } });
    fireEvent.change(confirmPassInput, { target: { value: 'lowercase123' } });

    const submitBtn = screen.getByText(enTranslations.passwordReset.resetSubmitButton);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(enTranslations.passwordReset.passwordUppercase)).toBeInTheDocument();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });

  test('validates password confirmation equality with zod and displays error', async () => {
    render(
      <MemoryRouter initialEntries={['/login?openModal=reset-password&token=valid-token']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    const newPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.newPasswordPlaceholder);
    const confirmPassInput = screen.getByPlaceholderText(enTranslations.passwordReset.confirmNewPasswordPlaceholder);

    fireEvent.change(newPassInput, { target: { value: 'ValidPass123!' } });
    fireEvent.change(confirmPassInput, { target: { value: 'MismatchPass123!' } });

    const submitBtn = screen.getByText(enTranslations.passwordReset.resetSubmitButton);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(enTranslations.passwordReset.passwordMismatch)).toBeInTheDocument();
      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });
});
