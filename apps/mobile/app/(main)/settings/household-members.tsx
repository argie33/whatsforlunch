import React, { useState, useCallback, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { ChevronLeft, Mail, Shield, Trash2, UserPlus } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { executeGraphQL } from '@/lib/graphql-client';
import {
  LIST_HOUSEHOLD_MEMBERS,
  INVITE_HOUSEHOLD_MEMBER,
  REMOVE_HOUSEHOLD_MEMBER,
} from '@/db/graphql';

interface HouseholdMember {
  userId: string;
  displayName?: string;
  role: 'owner' | 'member' | 'viewer';
  joinedAt: string;
}

const ROLE_COLORS = {
  owner: '#2F7D5B',
  member: '#5FB389',
  viewer: '#8A8E8C',
};

const ROLE_LABELS = {
  owner: 'Owner',
  member: 'Member',
  viewer: 'Viewer',
};

export default function HouseholdMembersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const db = useDatabase();
  const { householdId } = useAuthIds();

  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'member' | 'viewer'>('member');

  useEffect(() => {
    if (householdId) {
      loadMembers();
    }
  }, [householdId]);

  const loadMembers = async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const response = await executeGraphQL(LIST_HOUSEHOLD_MEMBERS, {
        householdId,
      });
      if (response.data?.listHouseholdMembers) {
        setMembers(response.data.listHouseholdMembers);
      }
    } catch (err) {
      console.error('Failed to load members:', err);
      Alert.alert(t('common.error'), 'Failed to load household members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      Alert.alert(t('common.error'), 'Please enter an email address');
      return;
    }

    if (!householdId) {
      Alert.alert(t('common.error'), 'Household not found');
      return;
    }

    setInviting(true);
    try {
      const response = await executeGraphQL(INVITE_HOUSEHOLD_MEMBER, {
        householdId,
        email: inviteEmail.trim(),
        role: selectedRole,
      });

      if (response.data?.inviteHouseholdMember) {
        await haptics.success();
        Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        await loadMembers();
      }
    } catch (err) {
      console.error('Failed to invite member:', err);
      Alert.alert(t('common.error'), String(err));
    } finally {
      setInviting(false);
    }
  }, [inviteEmail, selectedRole, householdId, t]);

  const handleRemoveMember = useCallback(
    async (memberId: string, memberName: string) => {
      if (!householdId) {
        Alert.alert(t('common.error'), 'Household not found');
        return;
      }

      Alert.alert('Remove Member', `Are you sure you want to remove ${memberName}?`, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await executeGraphQL(REMOVE_HOUSEHOLD_MEMBER, {
                householdId,
                userId: memberId,
              });

              if (response.data?.removeHouseholdMember) {
                setMembers((prev) => prev.filter((m) => m.userId !== memberId));
                Alert.alert('Success', 'Member removed');
              }
            } catch (err) {
              console.error('Failed to remove member:', err);
              Alert.alert(t('common.error'), String(err));
            }
          },
        },
      ]);
    },
    [householdId, t],
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} backgroundColor="$surface/base">
        {/* Header */}
        <XStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          gap="$3"
          backgroundColor="$surface/raised"
          borderBottomWidth={1}
          borderBottomColor="$border/subtle"
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={24} color="#5C615E" />
          </Pressable>
          <Text fontSize={20} fontWeight="700" color="$text/primary">
            Household Members
          </Text>
        </XStack>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Invite section */}
          <YStack padding="$5" gap="$3">
            <Text fontSize={14} fontWeight="600" color="$text/secondary">
              Invite New Member
            </Text>

            <YStack gap="$2">
              <Input
                placeholder="Enter email address"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </YStack>

            <YStack gap="$2">
              <Text fontSize={13} color="$text/secondary">
                Role
              </Text>
              <XStack gap="$2">
                {(['member', 'viewer'] as const).map((role) => (
                  <Pressable key={role} onPress={() => setSelectedRole(role)} style={{ flex: 1 }}>
                    <YStack
                      padding="$3"
                      borderRadius="$md"
                      backgroundColor={selectedRole === role ? '$brand/primary' : '$surface/sunken'}
                      borderWidth={1}
                      borderColor={selectedRole === role ? '$brand/primary' : '$border/subtle'}
                      alignItems="center"
                    >
                      <Text
                        fontSize={13}
                        fontWeight="600"
                        color={selectedRole === role ? 'white' : '$text/secondary'}
                        textTransform="capitalize"
                      >
                        {role}
                      </Text>
                    </YStack>
                  </Pressable>
                ))}
              </XStack>
            </YStack>

            <Button
              variant="filled"
              size="lg"
              onPress={handleInvite}
              loading={inviting}
              disabled={!inviteEmail.trim()}
            >
              <XStack gap="$2" alignItems="center">
                <UserPlus size={18} color="white" />
                <Text>Send Invite</Text>
              </XStack>
            </Button>
          </YStack>

          {/* Members list */}
          <YStack paddingHorizontal="$5" gap="$3">
            <Text fontSize={14} fontWeight="600" color="$text/secondary" paddingTop="$2">
              Current Members ({members.length})
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color="#2F7D5B" />
            ) : (
              <YStack
                backgroundColor="$surface/raised"
                borderRadius="$lg"
                overflow="hidden"
                borderWidth={1}
                borderColor="$border/subtle"
              >
                {members.map((member, idx) => (
                  <View key={member.userId}>
                    <XStack
                      paddingHorizontal="$4"
                      paddingVertical="$3"
                      alignItems="center"
                      gap="$3"
                    >
                      <YStack flex={1} gap="$1">
                        <XStack alignItems="center" gap="$2">
                          <Text fontSize={15} fontWeight="600" color="$text/primary">
                            {member.displayName || 'Household Member'}
                          </Text>
                          <XStack
                            paddingHorizontal="$2"
                            paddingVertical={2}
                            borderRadius="$full"
                            backgroundColor={ROLE_COLORS[member.role] + '20'}
                          >
                            <Text
                              fontSize={11}
                              fontWeight="600"
                              color={ROLE_COLORS[member.role]}
                              textTransform="capitalize"
                            >
                              {ROLE_LABELS[member.role]}
                            </Text>
                          </XStack>
                        </XStack>
                      </YStack>

                      {member.role !== 'owner' && (
                        <Pressable
                          onPress={() =>
                            handleRemoveMember(member.userId, member.displayName || 'Member')
                          }
                          hitSlop={12}
                        >
                          <Trash2 size={18} color="#C24A3E" />
                        </Pressable>
                      )}
                    </XStack>
                    {idx < members.length - 1 && (
                      <View height={1} backgroundColor="$border/subtle" marginHorizontal="$4" />
                    )}
                  </View>
                ))}
              </YStack>
            )}
          </YStack>

          {/* Info section */}
          <YStack padding="$5" gap="$3">
            <YStack
              backgroundColor="$surface/sunken"
              borderRadius="$lg"
              padding="$4"
              gap="$2"
              borderWidth={1}
              borderColor="$border/subtle"
            >
              <XStack gap="$2" alignItems="flex-start">
                <Shield size={16} color="#2F7D5B" style={{ marginTop: 2 }} />
                <YStack flex={1} gap="$1">
                  <Text fontSize={13} fontWeight="600" color="$text/primary">
                    Roles & Permissions
                  </Text>
                  <Text fontSize={12} color="$text/secondary" lineHeight={18}>
                    <Text fontWeight="600">Owner:</Text> Full access, manage members
                  </Text>
                  <Text fontSize={12} color="$text/secondary" lineHeight={18}>
                    <Text fontWeight="600">Member:</Text> Create and edit items
                  </Text>
                  <Text fontSize={12} color="$text/secondary" lineHeight={18}>
                    <Text fontWeight="600">Viewer:</Text> View-only access
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  );
}
