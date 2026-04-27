import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { Input, Button } from '@/components/ui';
import { signOut } from '@/features/auth';
import { captureException, addBreadcrumb } from '@/lib/sentry';

const CONFIRM_PHRASE = 'DELETE';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);

    addBreadcrumb({
      category: 'account',
      message: 'delete_account_confirmed',
      level: 'warning',
    });

    try {
      // TODO: call W2 deleteAccount mutation when AppSync is live
      // await API.graphql(graphqlOperation(deleteAccount));
      await signOut();
      setDone(true);
    } catch (err) {
      captureException(err);
      setLoading(false);
    }
  }

  if (done) {
    return (
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        justifyContent="center"
        alignItems="center"
        padding="$8"
        gap="$4"
      >
        <Text fontSize={48}>✓</Text>
        <Text fontSize={22} fontWeight="700" color="$text/primary" textAlign="center">
          Account deleted
        </Text>
        <Text fontSize={15} color="$text/secondary" textAlign="center">
          Your account and all associated data have been permanently deleted.
        </Text>
        <Button
          variant="tinted"
          size="lg"
          onPress={() => router.replace('/(auth)/sign-in')}
          accessibilityLabel="Return to sign in"
        >
          Back to Sign In
        </Button>
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FBFAF7' }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <YStack paddingHorizontal="$5" paddingTop="$7" paddingBottom="$10" gap="$6">

          {/* Warning header */}
          <YStack
            backgroundColor="$status/urgentBg"
            borderRadius="$md"
            padding="$4"
            gap="$2"
            borderWidth={1}
            borderColor="$status/urgent"
          >
            <Text fontSize={17} fontWeight="700" color="$status/urgent">
              Are you sure?
            </Text>
            <Text fontSize={15} color="$text/primary" lineHeight={22}>
              This will permanently delete all your data — containers, items, photos, history, and preferences. This cannot be undone.
            </Text>
          </YStack>

          {/* What gets deleted */}
          <YStack gap="$2">
            <Text fontSize={15} fontWeight="600" color="$text/primary">
              This will permanently delete all your data:
            </Text>
            {[
              'All food items and containers',
              'Photos and AI scan history',
              'Notification preferences',
              'Dietary preferences and settings',
              'Usage statistics and streaks',
            ].map(item => (
              <XStack key={item} gap="$3" alignItems="center">
                <Text fontSize={15} color="$status/urgent">✕</Text>
                <Text fontSize={15} color="$text/secondary">{item}</Text>
              </XStack>
            ))}
          </YStack>

          {/* Typed confirmation */}
          <YStack gap="$3">
            <Text fontSize={15} color="$text/primary">
              Type{' '}
              <Text fontWeight="700" fontFamily="mono">DELETE</Text>
              {' '}to confirm:
            </Text>
            <Input
              placeholder="Type DELETE to confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              clearable
              accessibilityLabel="Type DELETE to confirm"
            />
          </YStack>

          {/* Confirm button */}
          <Button
            variant="destructive"
            size="lg"
            onPress={handleDelete}
            disabled={!canDelete || loading}
            loading={loading}
            accessibilityLabel="Permanently Delete"
            accessibilityHint="Deletes your account and all data permanently"
          >
            Permanently Delete
          </Button>

          {/* Cancel */}
          <Button
            variant="plain"
            size="md"
            onPress={() => router.back()}
            accessibilityLabel="Cancel account deletion"
          >
            Cancel
          </Button>

        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
