import { PostHogProvider, usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';

let postHogClient: any = null;

export function initPostHog() {
  if (!postHogClient) {
    postHogClient = require('posthog-react-native').default;
  }
  return postHogClient;
}

export const posthog = initPostHog();

export function useAnalytics() {
  const client = usePostHog();
  return {
    track: useCallback(
      (eventName: string, properties?: Record<string, any>) => {
        client?.capture(eventName, properties);
      },
      [client],
    ),
    identify: useCallback(
      (userId: string, properties?: Record<string, any>) => {
        client?.identify(userId, properties);
      },
      [client],
    ),
  };
}
