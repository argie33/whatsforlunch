import { Alert } from 'react-native';
import { categorizeGraphQLError, getErrorMessage, NetworkMonitor } from './network-resilience';

export interface ErrorContext {
  source: string; // Component or service name
  operation: string; // What was being attempted
  userMessage?: string; // Custom message for user
}

export interface ErrorInfo {
  type: 'timeout' | 'network' | 'validation' | 'server' | 'unknown';
  message: string;
  userMessage: string;
  isRetryable: boolean;
}

/**
 * Categorize and format an error for display to the user.
 */
export function handleError(error: any, context: ErrorContext): ErrorInfo {
  console.error(`[${context.source}] ${context.operation} failed:`, error);

  const type = categorizeGraphQLError(error);
  const message = error.message || String(error);
  const userMessage = context.userMessage || getErrorMessage(error);
  const isRetryable = type !== 'validation';

  return {
    type,
    message,
    userMessage,
    isRetryable,
  };
}

/**
 * Show an error alert to the user with retry option if applicable.
 */
export async function showErrorAlert(
  error: ErrorInfo,
  onRetry?: () => Promise<void>,
): Promise<boolean> {
  return new Promise((resolve) => {
    const buttons = [
      {
        text: 'OK',
        onPress: () => resolve(false),
        style: 'cancel' as const,
      },
    ];

    if (error.isRetryable && onRetry) {
      buttons.push({
        text: 'Retry',
        onPress: async () => {
          try {
            await onRetry();
            resolve(true);
          } catch {
            resolve(false);
          }
        },
      });
    }

    Alert.alert('Error', error.userMessage, buttons);
  });
}

/**
 * Check if device is online and show appropriate message.
 */
export function checkNetworkStatus(): boolean {
  const monitor = NetworkMonitor.getInstance();
  const isOnline = monitor.isOnline();

  if (!isOnline) {
    const state = monitor.getState();
    const message =
      state.isConnected === false
        ? 'No internet connection. Please enable WiFi or cellular data.'
        : 'Internet connection is unstable. Please check your network.';

    Alert.alert('Connection Error', message);
    return false;
  }

  return true;
}

/**
 * Wrap a promise-returning function with error handling.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: {
    showAlert?: boolean;
    allowRetry?: boolean;
  } = {},
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const errorInfo = handleError(error, context);

    if (options.showAlert) {
      const willRetry = await showErrorAlert(
        errorInfo,
        options.allowRetry ? () => fn() : undefined,
      );
      return willRetry ? null : null; // User chose retry, which already executed above
    }

    throw error;
  }
}

/**
 * Retry an operation with exponential backoff and user feedback.
 */
export async function retryWithFeedback<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  options: {
    maxRetries?: number;
    onRetryAttempt?: (attempt: number) => void;
  } = {},
): Promise<T> {
  const { maxRetries = 3, onRetryAttempt } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        onRetryAttempt?.(attempt + 1);
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delayMs = 500 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Format error for logging/debugging.
 */
export function formatErrorForLogging(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}
