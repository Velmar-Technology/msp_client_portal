import { AxiosError, AxiosInstance } from 'axios';
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

/**
 * Configure Axios client interceptors to normalize backend payloads into ClientError instances
 */
export function setupAxiosErrorInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      // Check if it's an Axios error
      if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
        const axiosError = error as AxiosError;
        let clientError: ClientError;

        if (axiosError.response && axiosError.response.data) {
          // Parse incoming payloads against our standardized Zod validation schema
          const parseResult = SerializedErrorSchema.safeParse(axiosError.response.data);

          if (parseResult.success) {
            const apiError = parseResult.data;
            clientError = new ClientError(
              apiError.message,
              apiError.code,
              apiError.correlationId,
              false,
              apiError.details
            );
          } else {
            clientError = new ClientError(
              axiosError.message || 'An unexpected API error occurred',
              'UNKNOWN_API_ERROR',
              'N/A',
              false,
              { rawData: axiosError.response.data }
            );
          }
        } else {
          clientError = new ClientError(
            'Could not connect to the server. Check your connection.',
            'NETWORK_ERROR',
            'N/A',
            true
          );
        }

        // Interceptor maps standardized codes to client alerts or redirects
        if (clientError.code === 'UNAUTHORIZED_ERROR') {
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
