import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, router, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
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
import { useColdStartPerformance } from '@/lib/performance';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { useHouseholdId } from '@/features/auth/useHouseholdId';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { listenForSocialSignInCallback } from '@/features/auth/authService';

const queryClient = new QueryClient();
const onboardingStorage = new MMKV({ id: 'wfl.app' });

function RootLayout() {
  const appTheme = useAppTheme();
  useColdStartPerformance();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <TamaguiProvider config={tamaConfig} defaultTheme={appTheme}>
          <QueryClientProvider client={queryClient}>
            <PostHogProvider client={posthog}>
              <DatabaseProvider>
                <AuthGate />
              </DatabaseProvider>
            </PostHogProvider>
          </QueryClientProvider>
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
    if (status === 'loading') return;
    const inAuthGroup = segments[0] === '(auth)';
    if (status === 'unauthenticated' && !inAuthGroup) {
      const seen = onboardingStorage.getBoolean('wfl_onboarding_seen');
      router.replace(seen ? '/(auth)/sign-in' : '/(auth)/onboarding');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(main)');
    }
  }, [status, segments]);

  // Handle OAuth redirect from Apple/Google Sign-In.
  // In production, Amplify opens a browser, user authenticates, browser
  // redirects back via the `wfl://` scheme, and Hub fires the event here.
  useEffect(() => {
    const unlisten = listenForSocialSignInCallback(
      () => router.replace('/(main)'),
      () => {/* auth error is shown on the sign-in screen */},
    );
    return unlisten;
  }, []);

  // When user taps an expiry notification, navigate to the item.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { itemId?: string }
        | undefined;
      if (data?.itemId) {
        router.push({ pathname: '/(main)/items/[id]', params: { id: data.itemId } });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SyncProvider householdId={householdId}>
      <Stack screenOptions={{ headerShown: false }} />
    </SyncProvider>
  );
}

function ErrorFallback() {
  return (
    <TamaguiProvider config={tamaConfig}>
      <Stack.Screen options={{ title: 'Error', headerShown: true }} />
    </TamaguiProvider>
  );
}

export default Sentry.wrap(RootLayout);
