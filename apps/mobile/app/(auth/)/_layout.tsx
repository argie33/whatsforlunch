import { Stack } from 'expo-router';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: C['surface/base'],
        },
        animationEnabled: true,
      }}
    />
  );
}
