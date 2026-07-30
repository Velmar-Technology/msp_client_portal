import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from "@/services/api";
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

// Mock localStorage to avoid refresh token logic errors in 401 interceptor
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });

// We can mock the axios adapter to simulate a network error
api.defaults.adapter = async (config) => {
  if (config.url === '/400') {
    return Promise.reject({
      response: { status: 400, data: { message: 'Some generic error' } },
      config,
    });
  }
  if (config.url === '/401') {
    return Promise.reject({
      response: { status: 401, data: { message: 'Unauthorized' } },
      config,
    });
  }
  if (config.url === '/409') {
    return Promise.reject({
      response: { status: 409, data: { message: 'An account with this email already exists' } },
      config,
    });
  }
  return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config } as unknown as AxiosResponse;
};

describe('api global response interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show toast.error for generic backend errors (e.g. 400)', async () => {
    try {
      await api.get('/400');
    } catch {
      // Expected to throw
    }
    expect(toast.error).toHaveBeenCalledWith('Some generic error');
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('should not show toast.error for 401 Unauthorized (handled by refresh/redirect interceptor)', async () => {
    try {
      await api.get('/401');
    } catch {
      // Expected to throw
    }
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should not show toast.error for custom handled errors (e.g. "already exists")', async () => {
    try {
      await api.get('/409');
    } catch {
      // Expected to throw
    }
    expect(toast.error).not.toHaveBeenCalled();
  });
});
