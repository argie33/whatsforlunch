import { Stack } from 'expo-router';
import { ShakeReporter } from '@/features/settings/ShakeReporter';

export default function SettingsLayout() {
  return (
    <>
      <ShakeReporter />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FBFAF7' },
          headerTintColor: '#2F7D5B',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Settings', headerLargeTitle: true }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="preferences" options={{ title: 'Preferences' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="subscription" options={{ title: 'Subscription' }} />
        <Stack.Screen name="support" options={{ title: 'Help & Support' }} />
        <Stack.Screen name="households" options={{ title: 'Households' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen
          name="delete-account"
          options={{ title: 'Delete Account', headerTintColor: '#C24A3E' }}
        />
        <Stack.Screen name="household-members" options={{ title: 'Household Members' }} />
      </Stack>
    </>
  );
}
