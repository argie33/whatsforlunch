/**
 * Comprehensive error handling for AI Lambdas.
 * Handles retries, fallbacks, degradation, and error reporting.
 */

export enum ErrorCode {
  // Bedrock errors
  BEDROCK_RATE_LIMIT = 'BEDROCK_RATE_LIMIT',
  BEDROCK_MODEL_ERROR = 'BEDROCK_MODEL_ERROR',
  BEDROCK_TIMEOUT = 'BEDROCK_TIMEOUT',
  BEDROCK_INVALID_REQUEST = 'BEDROCK_INVALID_REQUEST',

  // Textract errors
  TEXTRACT_INVALID_IMAGE = 'TEXTRACT_INVALID_IMAGE',
  TEXTRACT_SERVICE_ERROR = 'TEXTRACT_SERVICE_ERROR',
  TEXTRACT_TIMEOUT = 'TEXTRACT_TIMEOUT',

  // S3 errors
  S3_ACCESS_DENIED = 'S3_ACCESS_DENIED',
  S3_NOT_FOUND = 'S3_NOT_FOUND',
  S3_SERVICE_ERROR = 'S3_SERVICE_ERROR',

  // DynamoDB errors
  DYNAMODB_THROTTLED = 'DYNAMODB_THROTTLED',
  DYNAMODB_SERVICE_ERROR = 'DYNAMODB_SERVICE_ERROR',

  // Business logic errors
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_INPUT = 'INVALID_INPUT',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  statusCode: number;
  originalError?: Error;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

export class AIError extends Error {
  constructor(
    public code: ErrorCode,
    public statusCode: number = 500,
    public retryable: boolean = false,
    message?: string,
  ) {
    super(message || code);
    this.name = 'AIError';
  }

  toJSON(): ErrorContext {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      statusCode: this.statusCode,
    };
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxAttempts) {
        const delayMs = Math.min(
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs,
        );

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export function classifyError(error: unknown): ErrorContext {
  if (error instanceof AIError) {
    return error.toJSON();
  }

  const err = error instanceof Error ? error : new Error(String(error));
  const message = err.message;

  // Bedrock errors
  if (message.includes('rate limit') || message.includes('throttle')) {
    return {
      code: ErrorCode.BEDROCK_RATE_LIMIT,
      message: 'Bedrock rate limit exceeded',
      retryable: true,
      statusCode: 429,
      originalError: err,
    };
  }

  if (message.includes('InvalidInput') || message.includes('invalid')) {
    return {
      code: ErrorCode.BEDROCK_INVALID_REQUEST,
      message: 'Invalid request to Bedrock',
      retryable: false,
      statusCode: 400,
      originalError: err,
    };
  }

  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    return {
      code: ErrorCode.BEDROCK_TIMEOUT,
      message: 'Bedrock request timeout',
      retryable: true,
      statusCode: 504,
      originalError: err,
    };
  }

  if (message.includes('ServiceError') || message.includes('InternalServerError')) {
    return {
      code: ErrorCode.BEDROCK_MODEL_ERROR,
      message: 'Bedrock service error',
      retryable: true,
      statusCode: 503,
      originalError: err,
    };
  }

  // Textract errors
  if (message.includes('InvalidParameterException') || message.includes('InvalidInput')) {
    return {
      code: ErrorCode.TEXTRACT_INVALID_IMAGE,
      message: 'Invalid image for Textract',
      retryable: false,
      statusCode: 400,
      originalError: err,
    };
  }

  // S3 errors
  if (message.includes('NoSuchKey') || message.includes('NotFound')) {
    return {
      code: ErrorCode.S3_NOT_FOUND,
      message: 'S3 object not found',
      retryable: false,
      statusCode: 404,
      originalError: err,
    };
  }

  if (message.includes('AccessDenied') || message.includes('Forbidden')) {
    return {
      code: ErrorCode.S3_ACCESS_DENIED,
      message: 'S3 access denied',
      retryable: false,
      statusCode: 403,
      originalError: err,
    };
  }

  // DynamoDB errors
  if (message.includes('ProvisionedThroughputExceededException')) {
    return {
      code: ErrorCode.DYNAMODB_THROTTLED,
      message: 'DynamoDB throttled',
      retryable: true,
      statusCode: 429,
      originalError: err,
    };
  }

  // Default
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: message || 'Unknown error',
    retryable: false,
    statusCode: 500,
    originalError: err,
  };
}

export function getErrorResponse(error: unknown) {
  const classified = classifyError(error);

  return {
    error: {
      code: classified.code,
      message: classified.message,
      retryable: classified.retryable,
    },
    statusCode: classified.statusCode,
  };
}

export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  shouldFallback?: (error: ErrorContext) => boolean,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    const classified = classifyError(error);

    if (shouldFallback && !shouldFallback(classified)) {
      throw error;
    }

    try {
      return await fallback();
    } catch (fallbackError) {
      // Both failed, throw original error
      throw error;
    }
  }
}
