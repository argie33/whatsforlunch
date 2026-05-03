import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router, useSegments } from 'expo-router';
import { TamaguiProvider, Text } from 'tamagui';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import * as Notifications from 'expo-notifications';
import { MMKV } from 'react-native-mmkv';

import tamaConfig from '../tamagui.config';
import '@/i18n';
import '@/lib/amplify';
import '@/lib/sentry';
import { posthog } from '@/lib/posthog';
import { DatabaseProvider } from '@/db';
import { SyncProvider } from '@/services/SyncContext';
import { ToastProvider } from '@/lib/toast';
import { useColdStartPerformance } from '@/lib/performance';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { useHouseholdId } from '@/features/auth/useHouseholdId';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { listenForSocialSignInCallback } from '@/features/auth/authService';
import { registerPushToken, requestNotificationPermission } from '@/lib/notifications';

const queryClient = new QueryClient();
const onboardingStorage = new MMKV({ id: 'wfl.app' });

function RootLayout() {
  const appTheme = useAppTheme();
  useColdStartPerformance();

  console.log('[RootLayout] Rendering with theme:', appTheme);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Sentry.ErrorBoundary
        fallback={<ErrorFallback />}
        onError={(error, _context) => {
          console.error('[RootLayout ErrorBoundary]', error);
        }}
      >
        <TamaguiProvider config={tamaConfig} defaultTheme={appTheme}>
          <ToastProvider>
            <QueryClientProvider client={queryClient}>
              <PostHogProvider client={posthog}>
                <DatabaseProvider>
                  <AuthGate />
                </DatabaseProvider>
              </PostHogProvider>
            </QueryClientProvider>
          </ToastProvider>
        </TamaguiProvider>
      </Sentry.ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function AuthGate() {
  const { status } = useCurrentUser();
  const segments = useSegments();
  const householdId = useHouseholdId();

  // Redirect unauthenticated users to onboarding/sign-in;
  // redirect authenticated users out of auth group.
  useEffect(() => {
    console.log('[AuthGate] Status:', status, 'Segments:', segments, 'HouseholdId:', householdId);
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    console.log('[AuthGate] Routing: inAuthGroup=', inAuthGroup, 'status=', status);
    if (status === 'unauthenticated' && !inAuthGroup) {
      const seen = onboardingStorage.getBoolean('wfl_onboarding_seen');
      console.log('[AuthGate] Navigating to', seen ? '/(auth)/sign-in' : '/(auth)/onboarding');
      router.replace(seen ? '/(auth)/sign-in' : '/(auth)/onboarding');
    } else if (status === 'authenticated' && inAuthGroup) {
      console.log('[AuthGate] Navigating to /(main)');
      router.replace('/(main)');
    }
  }, [status, segments]);

  // Handle OAuth redirect from Apple/Google Sign-In.
  // In production, Amplify opens a browser, user authenticates, browser
  // redirects back via the `wfl://` scheme, and Hub fires the event here.
  useEffect(() => {
    const unlisten = listenForSocialSignInCallback(
      () => router.replace('/(main)'),
      () => {
        /* auth error is shown on the sign-in screen */
      },
    );
    return unlisten;
  }, []);

  // When user taps an expiry notification, navigate to the item.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { itemId?: string } | undefined;
      if (data?.itemId) {
        router.push({ pathname: '/(main)/items/[id]', params: { id: data.itemId } });
      }
    });
    return () => sub.remove();
  }, []);

  // Register push token for server-side expiry notifications.
  useEffect(() => {
    if (status !== 'authenticated' || !householdId) return;

    async function setupPushNotifications() {
      await requestNotificationPermission();
      // householdId is guaranteed to be a string due to the check above
      await registerPushToken(householdId as string);
    }

    setupPushNotifications();
  }, [status, householdId]);

  return (
    <SyncProvider householdId={householdId}>
      <Stack screenOptions={{ headerShown: false }} />
    </SyncProvider>
  );
}

function ErrorFallback() {
  return (
    <GestureHandlerRootView
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FBFAF7',
      }}
    >
      <TamaguiProvider config={tamaConfig} defaultTheme="light">
        <Text color="$color" fontSize={14} paddingHorizontal={20} textAlign="center">
          An error occurred. Please restart the app.
        </Text>
      </TamaguiProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
