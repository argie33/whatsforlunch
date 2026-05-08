import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';
import { ShakeReporter } from '@/features/settings/ShakeReporter';
import { ToastProvider } from '@/lib/toast';

export default function MainLayout() {
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
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            marginTop: 3,
            letterSpacing: 0.2,
          },
          tabBarStyle: {
            backgroundColor: appTheme === 'dark' ? 'rgba(26,31,27,0.95)' : 'rgba(250,246,238,0.95)',
            borderTopColor: colors['border/subtle'],
            borderTopWidth: 0.5,
            paddingTop: 8,
            paddingBottom: 28,
            height: 88,
            backdropFilter: 'blur(24px) saturate(1.5)',
          } as any,
        }}
      >
        {/* === MAIN 5 TABS (match HTML) === */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>🏠</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>📦</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors['brand/primary'],
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: -28,
                  shadowColor: colors['brand/primary'],
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 8,
                  transform: [{ scale: focused ? 1.05 : 1 }],
                }}
              >
                <Text style={{ fontSize: 22, color: 'white' }}>📷</Text>
              </View>
            ),
            tabBarLabel: () => null,
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>🍽</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'More',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>👤</Text>
            ),
          }}
        />

        {/* === HIDDEN SCREENS (accessible via navigation) === */}
        <Tabs.Screen name="containers" options={{ href: null }} />
        <Tabs.Screen name="meal-plan" options={{ href: null }} />
        <Tabs.Screen name="restaurants" options={{ href: null }} />
        <Tabs.Screen name="shopping" options={{ href: null }} />
        <Tabs.Screen name="stats" options={{ href: null }} />
        <Tabs.Screen name="nutrition" options={{ href: null }} />
        <Tabs.Screen name="receipt-review" options={{ href: null }} />
        <Tabs.Screen name="stickers" options={{ href: null }} />
        <Tabs.Screen name="items/[id]" options={{ href: null }} />
        <Tabs.Screen name="items/new" options={{ href: null }} />
        <Tabs.Screen name="items/edit/[id]" options={{ href: null }} />
        <Tabs.Screen name="containers/[id]" options={{ href: null }} />
        <Tabs.Screen name="digest" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="achievements" options={{ href: null }} />
        <Tabs.Screen name="activity" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
      </Tabs>
    </ToastProvider>
  );
}
