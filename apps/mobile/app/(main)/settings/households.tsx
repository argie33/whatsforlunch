import React, { useState, useCallback, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ListRow } from '@/components/ui/ListRow';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDatabase } from '@/db';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import type { Household } from '@/db/models/Household';
import type { HouseholdMember } from '@/db/models/HouseholdMember';
import { captureException } from '@/lib/sentry';

export default function HouseholdsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { user } = useCurrentUser();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    const householdCollection = db.get<Household>('households');
    const sub = householdCollection.query().observe().subscribe({
      next: (rows) => setHouseholds(rows.filter((h) => !h.deletedAt)),
      error: captureException,
    });
    return () => sub.unsubscribe();
  }, [db]);

  useEffect(() => {
    if (households.length === 0) return;
    const memberCollection = db.get<HouseholdMember>('household_members');
    const sub = memberCollection.query().observe().subscribe({
      next: (rows) => setMembers(rows),
      error: captureException,
    });
    return () => sub.unsubscribe();
  }, [db, households.length]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await db.write(async () => {
        await db.get<Household>('households').create((h: any) => {
          h.cloudId = `local-${Date.now()}`;
          h.name = newName.trim();
          h.ownerId = user?.userId ?? 'local-user-001';
          h.memberCount = 1;
          h.version = 1;
          h.lastChangedAt = Date.now();
        });
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

  const memberCountFor = useCallback(
    (householdId: string) =>
      members.filter((m) => (m as any).householdId === householdId).length || 1,
    [members],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
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
            Your Households
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
                {i > 0 && <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />}
                <ListRow
                  title={h.name}
                  subtitle={t('settings.households.members_other', { count: memberCountFor(h.cloudId) })}
                  trailing={
                    h.ownerId === (user?.userId ?? 'local-user-001') ? (
                      <StatusBadge status="fresh" label="Owner" />
                    ) : undefined
                  }
                />
              </React.Fragment>
            ))}
          </YStack>

          <YStack paddingHorizontal="$4" marginTop="$4">
            <Button variant="tinted" size="md" onPress={() => { Haptics.selectionAsync(); setShowCreateForm(true); }}>
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
            placeholder="Household name (e.g. Home, Office)"
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Button
            variant="filled"
            size="lg"
            onPress={handleCreate}
            loading={creating}
            disabled={!newName.trim()}
          >
            Create Household
          </Button>
        </YStack>
      )}
    </ScrollView>
  );
}
