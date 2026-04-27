import { Tabs } from 'expo-router';
import { Text } from 'tamagui';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';

export default function MainLayout() {
  const appTheme = useAppTheme();
  const colors = appTheme === 'dark' ? darkTheme : lightTheme;

  return (
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
          title: 'Today',
          tabBarIcon: ({ color }) => (
            <Text color={color} fontSize={24}>📦</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color }) => (
            <Text color={color} fontSize={24}>📱</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="containers"
        options={{
          title: 'Containers',
          tabBarIcon: ({ color }) => (
            <Text color={color} fontSize={24}>📋</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Text color={color} fontSize={24}>⚙️</Text>
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
  );
}
