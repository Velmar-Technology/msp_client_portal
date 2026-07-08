// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientError, parseClientError, setupAxiosErrorInterceptor } from '../../adapters/axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

function createMockAxiosError(overrides: Record<string, any> = {}) {
  return {
    isAxiosError: true,
    response: {
      status: 400,
      data: {
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Bad input',
        correlationId: 'err_abc123',
        details: { fields: [{ field: 'name', message: 'required' }] },
      },
      ...overrides.response,
    },
    message: 'Request failed with status code 400',
    config: { _retry: false, headers: {} } as InternalAxiosRequestConfig,
    ...overrides,
  };
}

describe('ClientError', () => {
  it('sets properties from constructor', () => {
    const err = new ClientError('oops', 'SOME_CODE', 'cid_123', false, { extra: true });
    expect(err.message).toBe('oops');
    expect(err.code).toBe('SOME_CODE');
    expect(err.correlationId).toBe('cid_123');
    expect(err.isNetworkError).toBe(false);
    expect(err.details).toEqual({ extra: true });
    expect(err.name).toBe('ClientError');
  });

  it('marks network errors', () => {
    const err = new ClientError('network down', 'NETWORK_ERROR', 'N/A', true);
    expect(err.isNetworkError).toBe(true);
  });
});

describe('parseClientError', () => {
  it('parses a valid SerializedErrorPayload from an AxiosError', () => {
    const axiosError = createMockAxiosError();
    const err = parseClientError(axiosError);

    expect(err).toBeInstanceOf(ClientError);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.message).toBe('Bad input');
    expect(err.correlationId).toBe('err_abc123');
    expect(err.isNetworkError).toBe(false);
  });

  it('falls back to UNKNOWN_API_ERROR when payload does not match schema', () => {
    const axiosError = createMockAxiosError({
      response: { status: 500, data: { unexpected: 'shape' } },
    });
    const err = parseClientError(axiosError);

    expect(err.code).toBe('UNKNOWN_API_ERROR');
    expect(err.details?.rawData).toEqual({ unexpected: 'shape' });
  });

  it('returns NETWORK_ERROR when there is no response', () => {
    const axiosError = { isAxiosError: true, message: 'Network Error', response: undefined };
    const err = parseClientError(axiosError);

    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.isNetworkError).toBe(true);
  });

  it('returns UNKNOWN_ERROR for non-Axios input', () => {
    const err = parseClientError(new Error('random'));
    expect(err.code).toBe('UNKNOWN_ERROR');
  });

  it('returns UNKNOWN_ERROR for string input', () => {
    const err = parseClientError('just a string');
    expect(err.code).toBe('UNKNOWN_ERROR');
  });
});

describe('setupAxiosErrorInterceptor', () => {
  let instance: AxiosInstance;
  let interceptorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    interceptorSpy = vi.fn();
    instance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: interceptorSpy },
      },
    } as unknown as AxiosInstance;
  });

  it('registers a response interceptor', () => {
    setupAxiosErrorInterceptor(instance);
    expect(interceptorSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
  });

  it('passes through successful responses', async () => {
    setupAxiosErrorInterceptor(instance);
    const resolveFn = interceptorSpy.mock.calls[0][0];
    const response = { data: 'ok' } as AxiosResponse;

    expect(resolveFn(response)).toBe(response);
  });

  it('calls onUnauthorized for UNAUTHORIZED_ERROR', async () => {
    const onUnauthorized = vi.fn();
    setupAxiosErrorInterceptor(instance, { onUnauthorized });

    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError({
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED_ERROR', message: 'Unauthorized', correlationId: 'err_001' },
      },
    });

    await rejectFn(axiosError).catch(() => {});
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('calls onUnauthorized for UNAUTHORIZED', async () => {
    const onUnauthorized = vi.fn();
    setupAxiosErrorInterceptor(instance, { onUnauthorized });

    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError({
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized', correlationId: 'err_001' },
      },
    });

    await rejectFn(axiosError).catch(() => {});
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('does not call onUnauthorized for non-401 errors', async () => {
    const onUnauthorized = vi.fn();
    setupAxiosErrorInterceptor(instance, { onUnauthorized });

    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError();

    await rejectFn(axiosError).catch(() => {});
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('resolves with the response returned by onUnauthorized', async () => {
    const mockResponse = { data: 'refreshed' } as AxiosResponse;
    const onUnauthorized = vi.fn().mockResolvedValue(mockResponse);
    setupAxiosErrorInterceptor(instance, { onUnauthorized });

    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError({
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized', correlationId: 'err_001' },
      },
    });

    await expect(rejectFn(axiosError)).resolves.toBe(mockResponse);
  });

  it('rejects with ClientError when onUnauthorized throws', async () => {
    const onUnauthorized = vi.fn().mockRejectedValue(new Error('refresh failed'));
    setupAxiosErrorInterceptor(instance, { onUnauthorized });

    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError({
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized', correlationId: 'err_001' },
      },
    });

    const result = await rejectFn(axiosError).catch((e: ClientError) => e);
    expect(result).toBeInstanceOf(ClientError);
    expect(result.code).toBe('UNAUTHORIZED');
  });

  it('dispatches auth:unauthorized CustomEvent when no onUnauthorized provided', async () => {
    const dispatchSpy = vi.fn();
    const originalDispatch = window.dispatchEvent;
    window.dispatchEvent = dispatchSpy;

    setupAxiosErrorInterceptor(instance);
    const rejectFn = interceptorSpy.mock.calls[0][1];
    const axiosError = createMockAxiosError({
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED', message: 'Unauthorized', correlationId: 'err_001' },
      },
    });

    await rejectFn(axiosError).catch(() => {});
    expect(dispatchSpy).toHaveBeenCalledWith(expect.any(CustomEvent));

    window.dispatchEvent = originalDispatch;
  });

  it('rejects non-Axios errors as-is', async () => {
    setupAxiosErrorInterceptor(instance);
    const rejectFn = interceptorSpy.mock.calls[0][1];
    const plainError = new Error('plain');

    await expect(rejectFn(plainError)).rejects.toBe(plainError);
  });
});
