import { analytics } from './analytics';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: any;
}

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public context: ErrorContext;

  constructor(message: string, code = 'UNKNOWN_ERROR', statusCode = 500, context?: ErrorContext) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.context = context || {};
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  public fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}, context?: ErrorContext) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.fields = fields;
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: ErrorContext) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', context?: ErrorContext) {
    super(message, 'UNAUTHORIZED', 401, context);
    this.name = 'UnauthorizedError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Network error', context?: ErrorContext) {
    super(message, 'NETWORK_ERROR', 0, context);
    this.name = 'NetworkError';
  }
}

export class ErrorHandler {
  private errorListeners: ((error: AppError) => void)[] = [];
  private allowedErrorCodes = new Set<string>();

  register(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  handle(error: unknown, context?: ErrorContext): AppError {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(error.message, 'ERROR', 500, context);
    } else if (typeof error === 'string') {
      appError = new AppError(error, 'ERROR', 500, context);
    } else {
      appError = new AppError('Unknown error', 'UNKNOWN_ERROR', 500, context);
    }

    // Add context
    if (context) {
      appError.context = { ...appError.context, ...context };
    }

    // Log to analytics
    analytics.trackError(appError, appError.context);

    // Console error in development
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.error('[AppError]', {
        message: appError.message,
        code: appError.code,
        statusCode: appError.statusCode,
        context: appError.context,
      });
    }

    // Notify listeners
    this.notifyListeners(appError);

    return appError;
  }

  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach((listener) => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  getErrorMessage(error: AppError): string {
    const messages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again',
      NOT_FOUND: 'The requested item was not found',
      UNAUTHORIZED: 'You do not have permission to do this',
      NETWORK_ERROR: 'A network error occurred. Please check your connection',
      UNKNOWN_ERROR: 'An unexpected error occurred',
    };

    return messages[error.code] || error.message;
  }

  isRecoverable(error: AppError): boolean {
    const unrecoverableErrors = new Set(['UNAUTHORIZED', 'NETWORK_ERROR']);
    return !unrecoverableErrors.has(error.code);
  }

  isRetryable(error: AppError): boolean {
    const retryableErrors = new Set(['NETWORK_ERROR', 'TIMEOUT']);
    const serverErrors = error.statusCode >= 500;
    return retryableErrors.has(error.code) || serverErrors;
  }
}

export const errorHandler = new ErrorHandler();

// Async error boundary
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = errorHandler.handle(error, context);
    return { error: appError };
  }
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// Timeout wrapper
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AppError('Operation timed out', 'TIMEOUT', 408)), timeoutMs),
    ),
  ]);
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

// Safe local storage
export function safeLocalStorage(operation: () => string): string | null {
  try {
    return operation();
  } catch (error) {
    console.warn('LocalStorage error:', error);
    return null;
  }
}
