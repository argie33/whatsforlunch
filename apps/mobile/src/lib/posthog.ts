import PostHog from 'posthog-react-native';
import { usePostHog } from 'posthog-react-native';
import { useCallback } from 'react';

export const posthog = new PostHog(
  process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
  {
    host: 'https://us.i.posthog.com',
    disabled: !process.env.EXPO_PUBLIC_POSTHOG_KEY,
    sendFeatureFlagEvent: true,
    preloadFeatureFlags: true,
  },
);

export function useAnalytics() {
  const client = usePostHog();
  return {
    track: useCallback(
      (eventName: string, properties?: Record<string, unknown>) => {
        client?.capture(eventName, properties);
      },
      [client],
    ),
    identify: useCallback(
      (userId: string, properties?: Record<string, unknown>) => {
        client?.identify(userId, properties);
      },
      [client],
    ),
    reset: useCallback(() => {
      client?.reset();
    }, [client]),
  };
}
