import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import { useColorScheme } from 'react-native';

import tamaConfig from '../tamagui.config';
import '@/i18n';
import '@/lib/amplify';
import '@/lib/sentry';
import { posthog } from '@/lib/posthog';
import { DatabaseProvider } from '@/db';
import { SyncProvider } from '@/services/SyncContext';

const queryClient = new QueryClient();

function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <TamaguiProvider config={tamaConfig} defaultTheme={colorScheme || 'light'}>
          <QueryClientProvider client={queryClient}>
            <PostHogProvider client={posthog}>
              <DatabaseProvider>
                {/* householdId null until auth loads — SyncProvider handles gracefully */}
                <SyncProvider householdId={null}>
                  <Stack screenOptions={{ headerShown: false }} />
                </SyncProvider>
              </DatabaseProvider>
            </PostHogProvider>
          </QueryClientProvider>
        </TamaguiProvider>
      </Sentry.ErrorBoundary>
    </GestureHandlerRootView>
  );
}

function ErrorFallback() {
  return (
    <TamaguiProvider config={tamaConfig}>
      <Stack.Screen
        options={{
          title: 'Error',
          headerShown: true,
        }}
      />
    </TamaguiProvider>
  );
}

export default Sentry.wrap(RootLayout);
