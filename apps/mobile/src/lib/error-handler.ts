import { Alert } from 'react-native';
import { categorizeGraphQLError, getErrorMessage } from './network-resilience';

export interface ErrorContext {
  source: string;
  operation: string;
  userMessage?: string;
}

export interface ErrorInfo {
  type: 'timeout' | 'network' | 'validation' | 'server' | 'unknown';
  message: string;
  userMessage: string;
  isRetryable: boolean;
}

export function handleError(error: any, context: ErrorContext): ErrorInfo {
  console.error(`[${context.source}] ${context.operation} failed:`, error);
  const type = categorizeGraphQLError(error);
  const message = error.message || String(error);
  const userMessage = context.userMessage || getErrorMessage(error);
  const isRetryable = type !== 'validation';
  return { type, message, userMessage, isRetryable };
}

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
        onPress: () => {
          onRetry?.()
            .then(() => resolve(true))
            .catch(() => resolve(false));
        },
        style: 'default' as const,
      });
    }

    Alert.alert('Error', error.userMessage, buttons);
  });
}
