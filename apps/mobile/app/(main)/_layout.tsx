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
            fontSize: 11,
            fontWeight: '600',
            marginTop: 2,
          },
          tabBarStyle: {
            backgroundColor: colors['surface/raised'],
            borderTopColor: colors['border/subtle'],
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8,
            height: 64,
          },
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
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: colors['brand/primary'],
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: -16,
                  shadowColor: colors['brand/primary'],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
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
