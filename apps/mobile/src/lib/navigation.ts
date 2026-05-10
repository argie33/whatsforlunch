import { useEffect } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAnalytics } from '@/lib/posthog';

// Track route changes for analytics
export function useRouteTracking() {
  const route = useRoute();
  const { track } = useAnalytics();

  useEffect(() => {
    track('screen_view', {
      screen_name: route.name,
    });
  }, [route.name, track]);
}

// Deep link handler utilities
export function parseDeepLink(url: string): { route: string; params: Record<string, any> } {
  const urlObj = new URL(url);
  const route = urlObj.pathname.replace(/^\//, '').split('/')[0];
  const params: Record<string, any> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return { route, params };
}

// Handle common app links
export function handleAppLink(url: string): boolean {
  const { route, params } = parseDeepLink(url);

  switch (route) {
    case 'item':
      // Navigate to item detail with itemId param
      return !!params.itemId;
    case 'household':
      // Navigate to household with householdId param
      return !!params.householdId;
    case 'qr':
      // Scan QR code
      return true;
    default:
      return false;
  }
}
