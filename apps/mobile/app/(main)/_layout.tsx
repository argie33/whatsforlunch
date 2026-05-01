import { Tabs } from 'expo-router';
import { Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';
import { ShakeReporter } from '@/features/settings/ShakeReporter';
import { ToastProvider } from '@/lib/toast';

export default function MainLayout() {
  const { t } = useTranslation();
  const appTheme = useAppTheme();
  const colors = appTheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ToastProvider>
      <ShakeReporter />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors['brand/primary'],
          tabBarInactiveTintColor: colors['text/tertiary'],
          tabBarStyle: {
            backgroundColor: colors['surface/raised'],
            borderTopColor: colors['border/subtle'],
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 60,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard.title'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                📦
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: t('scan.screenTitle'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                📱
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="containers"
          options={{
            title: t('containers.screenTitle'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                📋
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: t('recipes.screenTitle'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                🍳
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="shopping"
          options={{
            title: t('shopping.screenTitle', 'Shopping'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                🛒
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('settings.screenTitle'),
            tabBarIcon: ({ color }) => (
              <Text color={color} fontSize={24}>
                ⚙️
              </Text>
            ),
          }}
        />
        {/* Detail / non-tab screens — hidden from tab bar */}
        <Tabs.Screen name="stickers" options={{ href: null }} />
        <Tabs.Screen name="items/[id]" options={{ href: null }} />
        <Tabs.Screen name="items/new" options={{ href: null }} />
        <Tabs.Screen name="items/edit/[id]" options={{ href: null }} />
        <Tabs.Screen name="containers/[id]" options={{ href: null }} />
      </Tabs>
    </ToastProvider>
  );
}
