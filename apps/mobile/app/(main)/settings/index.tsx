import { ScrollView, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';

type RowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  isLast?: boolean;
  destructive?: boolean;
  noChevron?: boolean;
};

function Row({ label, value, onPress, isLast, destructive, noChevron }: RowProps) {
  return (
    <>
      <XStack
        backgroundColor="$surface/raised"
        paddingHorizontal="$4"
        paddingVertical="$3"
        minHeight={44}
        alignItems="center"
        onPress={onPress}
        pressStyle={{ opacity: 0.65 }}
        cursor="pointer"
      >
        <Text flex={1} fontSize={17} color={destructive ? '$status/urgent' : '$text/primary'}>
          {label}
        </Text>
        {value != null && (
          <Text fontSize={17} color="$text/secondary" marginRight={noChevron ? 0 : '$2'}>
            {value}
          </Text>
        )}
        {!noChevron && (
          <Text fontSize={22} color="$text/tertiary" lineHeight={22}>
            ›
          </Text>
        )}
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}

type GroupProps = {
  header?: string;
  footer?: string;
  children: React.ReactNode;
};

function Group({ header, footer, children }: GroupProps) {
  return (
    <YStack marginTop={header ? '$2' : '$7'}>
      {header && (
        <Text
          fontSize={13}
          fontWeight="500"
          color="$text/tertiary"
          textTransform="uppercase"
          letterSpacing={0.4}
          paddingHorizontal="$5"
          paddingBottom="$2"
        >
          {header}
        </Text>
      )}
      <YStack
        marginHorizontal="$5"
        borderRadius="$md"
        overflow="hidden"
      >
        {children}
      </YStack>
      {footer && (
        <Text
          fontSize={13}
          color="$text/tertiary"
          paddingHorizontal="$5"
          paddingTop="$2"
          lineHeight={18}
        >
          {footer}
        </Text>
      )}
    </YStack>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  function confirmSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {} },
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Account', style: 'destructive', onPress: () => {} },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        {/* Profile — no section label, top card */}
        <Group>
          <XStack
            backgroundColor="$surface/raised"
            paddingHorizontal="$4"
            paddingVertical="$3"
            minHeight={64}
            alignItems="center"
            gap="$3"
            onPress={() => router.push('/settings/profile')}
            pressStyle={{ opacity: 0.65 }}
            cursor="pointer"
          >
            <YStack
              width={44}
              height={44}
              borderRadius="$full"
              backgroundColor="$brand/primaryMuted"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={18} fontWeight="600" color="$brand/primary">
                Y
              </Text>
            </YStack>
            <YStack flex={1}>
              <Text fontSize={17} fontWeight="600" color="$text/primary">
                Your Name
              </Text>
              <Text fontSize={13} color="$text/tertiary">
                you@example.com
              </Text>
            </YStack>
            <Text fontSize={22} color="$text/tertiary" lineHeight={22}>
              ›
            </Text>
          </XStack>
        </Group>

        {/* Households */}
        <Group header="Households">
          <Row
            label="My Household"
            value="1 member"
            onPress={() => {}}
            isLast
          />
        </Group>

        {/* Notifications */}
        <Group header="Notifications">
          <Row
            label="Notifications"
            onPress={() => router.push('/settings/notifications')}
            isLast
          />
        </Group>

        {/* Preferences */}
        <Group header="Preferences">
          <Row
            label="Dietary & Allergies"
            onPress={() => router.push('/settings/preferences')}
          />
          <Row
            label="Cuisine Preferences"
            onPress={() => router.push('/settings/preferences')}
          />
          <Row
            label="Theme"
            value="Auto"
            onPress={() => router.push('/settings/preferences')}
          />
          <Row
            label="Units"
            value="Imperial"
            onPress={() => router.push('/settings/preferences')}
            isLast
          />
        </Group>

        {/* Privacy */}
        <Group header="Privacy">
          <Row
            label="Data & Privacy"
            onPress={() => router.push('/settings/privacy')}
          />
          <Row
            label="Export My Data"
            onPress={() => router.push('/settings/privacy')}
            isLast
          />
        </Group>

        {/* Subscription */}
        <Group header="Subscription">
          <Row
            label="Plan"
            value="Free"
            onPress={() => router.push('/settings/subscription')}
            isLast
          />
        </Group>

        {/* Help & Support */}
        <Group header="Help & Support">
          <Row
            label="FAQ"
            onPress={() => router.push('/settings/support')}
          />
          <Row
            label="Contact Us"
            onPress={() => router.push('/settings/support')}
          />
          <Row
            label="Report a Bug"
            onPress={() => router.push('/settings/support')}
            isLast
          />
        </Group>

        {/* About */}
        <Group header="About">
          <Row
            label="Version"
            value="1.0.0"
            noChevron
            isLast={false}
          />
          <Row
            label="Terms of Service"
            onPress={() => router.push('/settings/about')}
          />
          <Row
            label="Privacy Policy"
            onPress={() => router.push('/settings/about')}
            isLast
          />
        </Group>

        {/* Account — destructive actions */}
        <Group>
          <Row
            label="Sign Out"
            onPress={confirmSignOut}
          />
          <Row
            label="Delete Account"
            onPress={confirmDeleteAccount}
            destructive
            noChevron
            isLast
          />
        </Group>

      </YStack>
    </ScrollView>
  );
}
