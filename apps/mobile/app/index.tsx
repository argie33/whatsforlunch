import { Redirect } from 'expo-router';
import { MMKV } from 'react-native-mmkv';
import { useCurrentUser } from '@/features/auth/useCurrentUser';

const storage = new MMKV({ id: 'wfl.app' });

export default function RootIndex() {
  const auth = useCurrentUser();

  if (auth.status === 'loading') return null;

  if (auth.status === 'authenticated') {
    return <Redirect href="/(main)" />;
  }

  const seenOnboarding = storage.getBoolean('wfl_onboarding_seen') ?? false;
  if (!seenOnboarding) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
