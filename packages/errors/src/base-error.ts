import { v4 as uuidv4 } from 'uuid';

export interface AppErrorOptions {
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  originalError?: Error | unknown;
  isOperational?: boolean;
}

export abstract class AppError extends Error {
  /** Standardized SCREAMING_SNAKE_CASE error code for clients and logs */
  public abstract readonly code: string;

  /** Target HTTP status code */
  public abstract readonly statusCode: number;

  /** 
   * True: Expected operational failure (e.g. invalid user input, resource not found).
   * False: Programmer bug / system failure (e.g. database disconnect, null pointer error).
   */
  public readonly isOperational: boolean;

  /** Structured, context-specific metadata (e.g. Zod validation errors) */
  public readonly details: Record<string, any>;

  /** Unique ID to track error instances across distributed services and client bundles */
  public readonly correlationId: string;

  /** Under-the-hood cause (e.g. raw Drizzle/Postgres exception) to maintain tracing */
  public readonly originalError?: Error;

  constructor(options: AppErrorOptions) {
    super(options.message);
    
    // Set standard Javascript prototype inheritance correctly
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = this.constructor.name;

    this.isOperational = options.isOperational ?? true;
    this.details = options.details ?? {};
    this.correlationId = options.correlationId ?? `err_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    
    if (options.originalError instanceof Error) {
      this.originalError = options.originalError;
    } else if (options.originalError) {
      this.originalError = new Error(String(options.originalError));
    }

    // Capture clean stack trace, omitting constructor call
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
