import { useState } from 'react';
import { ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { Input, Avatar, Button } from '@/components/ui';
import { useCurrentUser, setMockUserName } from '@/features/auth';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

export default function ProfileScreen() {
  const router = useRouter();
  const authState = useCurrentUser();

  const currentName = authState.status === 'authenticated' ? authState.user.name : '';
  const currentEmail = authState.status === 'authenticated' ? authState.user.email : '';

  const [name, setName] = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // Mock mode: persist to MMKV. Real mode: call W2 updateProfile mutation.
      setMockUserName(name.trim());
      // TODO: await updateProfile({ name: name.trim() }) when AppSync is live
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
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
        <YStack paddingHorizontal="$5" paddingBottom="$10" gap="$6">

          {/* Avatar */}
          <YStack alignItems="center" paddingTop="$7" gap="$3">
            <Avatar
              initials={name ? initials(name) : '?'}
              size={64}
            />
            <YStack
              onPress={() =>
                Alert.alert(
                  'Change Photo',
                  'Photo picker requires expo-image-picker — coming in Phase C.'
                )
              }
              pressStyle={{ opacity: 0.7 }}
            >
              <Text fontSize={15} color="$brand/primary" fontWeight="500">
                Change photo
              </Text>
            </YStack>
          </YStack>

          {/* Name */}
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            clearable
          />

          {/* Email — read-only, from Cognito */}
          <YStack gap="$2">
            <Text fontSize={15} fontWeight="500" color="$text/primary">Email</Text>
            <XStack
              borderRadius="$md"
              backgroundColor="$surface/sunken"
              borderWidth={1}
              borderColor="$border/subtle"
              paddingHorizontal="$4"
              paddingVertical="$3"
              alignItems="center"
            >
              <Text fontSize={17} color={currentEmail ? '$text/primary' : '$text/tertiary'} flex={1}>
                {currentEmail || 'Managed by sign-in provider'}
              </Text>
            </XStack>
            <Text fontSize={13} color="$text/tertiary">
              Your email is set by Apple / Google / magic link.
            </Text>
          </YStack>

          {/* Save */}
          <Button
            variant="filled"
            size="lg"
            onPress={handleSave}
            loading={saving}
            disabled={!name.trim() || saving}
            accessibilityLabel="Save profile"
          >
            Save
          </Button>

        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
