import React, { useCallback } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { ListRow } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { signOut } from '@/features/auth/authService';
import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents, trackSignOut } from '@/features/settings/analytics';
import { captureException } from '@/lib/sentry';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize="$3"
      fontWeight="600"
      color="$text/tertiary"
      textTransform="uppercase"
      letterSpacing={0.5}
      paddingHorizontal="$5"
      paddingTop="$5"
      paddingBottom="$2"
    >
      {title}
    </Text>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <YStack
      marginHorizontal="$4"
      backgroundColor="$surface/raised"
      borderRadius="$lg"
      overflow="hidden"
      borderWidth={1}
      borderColor="$border/subtle"
    >
      {children}
    </YStack>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status, user } = useCurrentUser();
  const { prefs } = useUserPreferences();
  const { track } = useAnalytics();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  const handleSignOut = useCallback(() => {
    Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            trackSignOut();
            track(SettingsEvents.SIGN_OUT);
            await signOut();
            router.replace('/(auth)/sign-in');
          } catch (err) {
            captureException(err);
            Alert.alert(t('common.error'), String(err));
          }
        },
      },
    ]);
  }, [t, track]);

  const themeLabel =
    prefs.theme === 'auto'
      ? t('settings.preferences.themeAuto')
      : prefs.theme === 'light'
        ? t('settings.preferences.themeLight')
        : t('settings.preferences.themeDark');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title={t('settings.sectionProfile')} />
      <SectionCard>
        <ListRow
          title={status === 'loading' ? '...' : (user?.name ?? 'Dev User')}
          subtitle={user?.email}
          trailing={
            <XStack alignItems="center" gap="$2">
              <Avatar initials={initials} size={36} name={user?.name} />
            </XStack>
          }
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/profile'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionHouseholds')} />
      <SectionCard>
        <ListRow
          title={t('settings.sectionHouseholds')}
          icon="home"
          subtitle={t('settings.households.createBody')}
          onPress={() => { Haptics.selectionAsync(); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionNotifications')} />
      <SectionCard>
        <ListRow
          title={t('settings.sectionNotifications')}
          icon="bell"
          subtitle={prefs.notificationsEnabled ? 'On' : 'Off'}
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/notifications'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionPreferences')} />
      <SectionCard>
        <ListRow
          title={t('settings.theme')}
          icon="sun"
          subtitle={themeLabel}
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/preferences'); }}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ListRow
          title={t('settings.preferences.screenTitle')}
          icon="sliders"
          subtitle={[...prefs.dietaryTags, ...prefs.allergyTags].slice(0, 2).join(', ') || 'None set'}
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/preferences'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionPrivacy')} />
      <SectionCard>
        <ListRow
          title={t('settings.sectionPrivacy')}
          icon="shield"
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/privacy'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionSubscription')} />
      <SectionCard>
        <ListRow
          title={t('settings.subscription.currentPlan')}
          icon="star"
          subtitle={t('settings.subscription.free')}
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/subscription'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionHelp')} />
      <SectionCard>
        <ListRow
          title={t('settings.sectionHelp')}
          icon="help-circle"
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/support'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionAbout')} />
      <SectionCard>
        <ListRow
          title={t('settings.about')}
          icon="info"
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/about'); }}
        />
      </SectionCard>

      <SectionHeader title={t('settings.sectionAccount')} />
      <SectionCard>
        <ListRow
          title={t('settings.signOut')}
          onPress={handleSignOut}
          trailing={<View />}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ListRow
          title={t('settings.deleteAccount')}
          onPress={() => { Haptics.selectionAsync(); router.push('/settings/delete-account'); }}
          trailing={<View />}
        />
      </SectionCard>
    </ScrollView>
  );
}
