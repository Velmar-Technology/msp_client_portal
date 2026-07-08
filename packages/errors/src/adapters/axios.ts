import { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { SerializedErrorSchema } from '../serialization';

export class ClientError extends Error {
  public readonly code: string;
  public readonly correlationId: string;
  public readonly details?: Record<string, any>;
  public readonly isNetworkError: boolean;

  constructor(
    message: string,
    code: string,
    correlationId: string,
    isNetworkError: boolean,
    details?: Record<string, any>
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.code = code;
    this.correlationId = correlationId;
    this.isNetworkError = isNetworkError;
    this.details = details;
    this.name = 'ClientError';
  }
}

export interface SetupAxiosErrorInterceptorOptions {
  /**
   * Called when a 401 UNAUTHORIZED_ERROR response is received.
   * Return an AxiosResponse to recover from the error (e.g., token refresh + retry).
   * Throw or return undefined to let the error propagate as a ClientError.
   */
  onUnauthorized?: (
    clientError: ClientError,
    axiosError: AxiosError
  ) => AxiosResponse | Promise<AxiosResponse | undefined> | undefined;
}

/**
 * Create a ClientError from an unknown caught value
 */
export function parseClientError(error: unknown): ClientError {
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as AxiosError;

    if (axiosError.response && axiosError.response.data) {
      const parseResult = SerializedErrorSchema.safeParse(axiosError.response.data);

      if (parseResult.success) {
        const apiError = parseResult.data;
        return new ClientError(
          apiError.message,
          apiError.code,
          apiError.correlationId,
          false,
          apiError.details
        );
      }

      return new ClientError(
        axiosError.message || 'An unexpected API error occurred',
        'UNKNOWN_API_ERROR',
        'N/A',
        false,
        { rawData: axiosError.response.data }
      );
    }

    return new ClientError(
      'Could not connect to the server. Check your connection.',
      'NETWORK_ERROR',
      'N/A',
      true
    );
  }

  const msg = error instanceof Error ? error.message : String(error);
  return new ClientError(msg, 'UNKNOWN_ERROR', 'N/A', false);
}

/**
 * Configure Axios client interceptors to normalize backend payloads into ClientError instances
 */
export function setupAxiosErrorInterceptor(
  instance: AxiosInstance,
  options?: SetupAxiosErrorInterceptorOptions
): void {
  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
        const axiosError = error as AxiosError;
        const clientError = parseClientError(error);

        const isUnauthorized = clientError.code === 'UNAUTHORIZED_ERROR' || clientError.code === 'UNAUTHORIZED';

        if (isUnauthorized && options?.onUnauthorized) {
          try {
            const response = await options.onUnauthorized(clientError, axiosError);
            if (response) return response;
          } catch {
            // fall through to rejection below
          }
        }

        if (isUnauthorized) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: clientError }));
          }
        }

        return Promise.reject(clientError);
      }

      return Promise.reject(error);
    }
  );
}
