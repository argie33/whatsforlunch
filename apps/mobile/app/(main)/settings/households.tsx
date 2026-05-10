import React, { useState, useCallback, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDatabase } from '@/db';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { householdsService } from '@/services/HouseholdsService';
import type { Household } from '@/db/models/Household';
import type { HouseholdMember } from '@/db/models/HouseholdMember';
import { captureException } from '@/lib/sentry';

type InviteState = { householdId: string; cloudId: string; email: string; sending: boolean } | null;

export default function HouseholdsScreen() {
  const { t } = useTranslation();
  const appTheme = useAppTheme();
  const theme = appTheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { user } = useCurrentUser();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [invite, setInvite] = useState<InviteState>(null);

  useEffect(() => {
    const sub = db
      .get<Household>('households')
      .query()
      .observe()
      .subscribe({
        next: (rows) => setHouseholds(rows.filter((h) => !h.deletedAt)),
        error: captureException,
      });
    return () => sub.unsubscribe();
  }, [db]);

  useEffect(() => {
    if (households.length === 0) return;
    const sub = db
      .get<HouseholdMember>('household_members')
      .query()
      .observe()
      .subscribe({
        next: (rows) => setMembers(rows),
        error: captureException,
      });
    return () => sub.unsubscribe();
  }, [db, households.length]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim() || !user?.userId) {
      if (!user?.userId) {
        Alert.alert(t('common.error'), t('common.notAuthenticated'));
      }
      return;
    }
    setCreating(true);
    await haptics.medium();
    try {
      await householdsService.createHousehold(db, {
        name: newName.trim(),
        ownerId: user.userId,
      });
      setNewName('');
      setShowCreateForm(false);
    } catch (err) {
      captureException(err);
      Alert.alert(t('common.error'), String(err));
    } finally {
      setCreating(false);
    }
  }, [db, newName, user, t]);

  const handleSendInvite = useCallback(async () => {
    if (!invite || !invite.email.trim()) return;
    setInvite((prev) => prev && { ...prev, sending: true });
    await haptics.medium();
    try {
      await householdsService.inviteMember({
        householdLocalId: invite.householdId,
        householdCloudId: invite.cloudId,
        email: invite.email.trim(),
      });
      Alert.alert(
        t('settings.households.inviteSent'),
        t('settings.households.inviteSentBody', { email: invite.email.trim() }),
      );
      setInvite(null);
    } catch (err) {
      captureException(err);
      Alert.alert(t('common.error'), String(err));
      setInvite((prev) => prev && { ...prev, sending: false });
    }
  }, [invite, t]);

  // Members from cloud store cloudId in householdId; local-created ones store WatermelonDB id
  const memberCountFor = useCallback(
    (h: Household) =>
      members.filter((m) => m.householdId === h.id || m.householdId === h.cloudId).length || 1,
    [members],
  );

  const isOwner = (h: Household) => (user?.userId ? h.ownerId === user.userId : false);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme['surface/base'] }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {households.length > 0 ? (
        <>
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
            {t('settings.households.yourHouseholds')}
          </Text>
          <YStack
            marginHorizontal="$4"
            backgroundColor="$surface/raised"
            borderRadius="$lg"
            overflow="hidden"
            borderWidth={1}
            borderColor="$border/subtle"
          >
            {households.map((h, i) => (
              <React.Fragment key={h.id}>
                {i > 0 && (
                  <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
                )}
                <ListRow
                  title={h.name}
                  subtitle={t('settings.households.members_other', { count: memberCountFor(h) })}
                  trailing={isOwner(h) ? <StatusBadge status="fresh" label="Owner" /> : undefined}
                />
                {isOwner(h) && (
                  <XStack paddingHorizontal="$5" paddingBottom="$3" gap="$2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={() => {
                        void haptics.selection();
                        setInvite({
                          householdId: h.id,
                          cloudId: h.cloudId,
                          email: '',
                          sending: false,
                        });
                      }}
                    >
                      {t('settings.households.inviteMember')}
                    </Button>
                  </XStack>
                )}
                {invite?.householdId === h.id && (
                  <YStack paddingHorizontal="$5" paddingBottom="$4" gap="$2">
                    <Input
                      value={invite.email}
                      onChangeText={(email) => setInvite((prev) => prev && { ...prev, email })}
                      placeholder={t('settings.households.inviteEmailPlaceholder')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="send"
                      onSubmitEditing={handleSendInvite}
                    />
                    <XStack gap="$2" flex={1}>
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={handleSendInvite}
                        loading={invite.sending}
                        disabled={!invite.email.trim()}
                      >
                        {t('settings.households.sendInvite')}
                      </Button>
                      <Button variant="secondary" size="sm" onPress={() => setInvite(null)}>
                        {t('common.cancel')}
                      </Button>
                    </XStack>
                  </YStack>
                )}
              </React.Fragment>
            ))}
          </YStack>

          <YStack paddingHorizontal="$4" marginTop="$4">
            <Button
              variant="secondary"
              size="md"
              onPress={() => {
                void haptics.selection();
                setShowCreateForm(true);
              }}
            >
              {t('settings.households.createHousehold')}
            </Button>
          </YStack>
        </>
      ) : (
        <YStack paddingHorizontal="$4" paddingTop="$8" alignItems="center" gap="$4">
          <Text fontSize={48}>🏡</Text>
          <Text fontSize="$5" fontWeight="700" color="$text/primary" textAlign="center">
            {t('settings.households.createHousehold')}
          </Text>
          <Text fontSize="$3" color="$text/secondary" textAlign="center" lineHeight={22}>
            {t('settings.households.createBody')}
          </Text>
        </YStack>
      )}

      {(showCreateForm || households.length === 0) && (
        <YStack paddingHorizontal="$4" marginTop="$6" gap="$3">
          <Input
            value={newName}
            onChangeText={setNewName}
            placeholder={t('settings.households.namePlaceholder')}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Button
            variant="primary"
            size="lg"
            onPress={handleCreate}
            loading={creating}
            disabled={!newName.trim()}
          >
            {t('settings.households.createHousehold')}
          </Button>
        </YStack>
      )}
    </ScrollView>
  );
}
