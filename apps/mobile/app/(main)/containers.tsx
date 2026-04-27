import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus, QrCode, Printer, Archive } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { useDatabase } from '@/db';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Container } from '@/db/models/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';

const PLACEHOLDER_HOUSEHOLD = 'household_placeholder';

export default function ContainersScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [containers, setContainers] = useState<Container[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const repo = new ContainerRepository(db);
    const sub = repo.observeByHousehold(PLACEHOLDER_HOUSEHOLD, showArchived).subscribe(setContainers);
    return () => sub.unsubscribe();
  }, [db, showArchived]);

  // Load active item counts per container
  useEffect(() => {
    if (containers.length === 0) return;
    const itemRepo = new ItemRepository(db);
    const subs = containers.map((c) =>
      itemRepo.observeByContainer(c.id).subscribe((items) => {
        setItemCounts((prev) => ({
          ...prev,
          [c.id]: items.filter((i) => i.status === 'active').length,
        }));
      }),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [containers, db]);

  const handleContainerPress = useCallback((container: Container) => {
    router.push(`/containers/${container.id}`);
  }, []);

  const handleScanQR = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/scan', params: { mode: 'qr' } });
  }, []);

  const handlePrintStickers = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/stickers');
  }, []);

  const activeCount = containers.filter((c) => !c.archivedAt).length;

  return (
    <View flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$5"
        paddingBottom="$3"
        backgroundColor="$surface/raised"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
      >
        <XStack justifyContent="space-between" alignItems="flex-end">
          <YStack>
            <Text fontSize={28} fontWeight="700" color="$text/primary" lineHeight={34}>
              {t('containers.screenTitle')}
            </Text>
            <Text fontSize={14} color="$text/secondary" marginTop="$1">
              {t('containers.subtitle', { count: activeCount })}
            </Text>
          </YStack>
          <Pressable onPress={() => setShowArchived((v) => !v)}>
            <XStack
              paddingHorizontal="$3"
              paddingVertical="$1"
              borderRadius="$full"
              borderWidth={1}
              borderColor={showArchived ? '$brand/primary' : '$border/subtle'}
              backgroundColor={showArchived ? '$brand/primaryMuted' : 'transparent'}
              alignItems="center"
              gap="$1"
            >
              <Archive size={13} color={showArchived ? '#2F7D5B' : '#8B908D'} />
              <Text
                fontSize={12}
                color={showArchived ? '$brand/primary' : '$text/tertiary'}
                fontWeight={showArchived ? '600' : '400'}
              >
                {t('containers.archivedSection')}
              </Text>
            </XStack>
          </Pressable>
        </XStack>
      </YStack>

      {containers.length === 0 ? (
        <EmptyState
          title={t('empty.containers.title')}
          description={t('empty.containers.description')}
          illustration={<IllustrationPlaceholder name="containers-empty" width={180} height={140} />}
          primaryAction={{
            label: t('containers.scanQR'),
            onPress: handleScanQR,
          }}
          secondaryAction={{
            label: t('containers.printStickers'),
            onPress: handlePrintStickers,
          }}
        />
      ) : (
        <FlashList
          data={containers}
          estimatedItemSize={100}
          numColumns={2}
          keyExtractor={(c) => c.id}
          renderItem={({ item: container }) => (
            <ContainerCard
              container={container}
              itemCount={itemCounts[container.id] ?? 0}
              onPress={() => handleContainerPress(container)}
            />
          )}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 80 }}
        />
      )}

      {/* FAB row */}
      <XStack
        position="absolute"
        bottom={insets.bottom + 16}
        right={16}
        gap="$3"
        alignItems="center"
      >
        <Pressable
          onPress={handlePrintStickers}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: 'white',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0F1411',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Printer size={20} color="#2F7D5B" />
        </Pressable>

        <Pressable
          onPress={handleScanQR}
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#2F7D5B',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#0F1411',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <QrCode size={24} color="white" />
        </Pressable>
      </XStack>
    </View>
  );
}

interface ContainerCardProps {
  container: Container;
  itemCount: number;
  onPress: () => void;
}

function ContainerCard({ container, itemCount, onPress }: ContainerCardProps) {
  const { t } = useTranslation();
  const archived = !!container.archivedAt;

  return (
    <Pressable onPress={onPress} style={{ flex: 1, margin: 4 }}>
      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$border/subtle"
        padding="$4"
        gap="$3"
        opacity={archived ? 0.6 : 1}
        pressStyle={{ scale: 0.97, opacity: 0.8 }}
        minHeight={100}
      >
        {/* QR icon + archived badge */}
        <XStack justifyContent="space-between" alignItems="center">
          <YStack
            width={36}
            height={36}
            borderRadius={10}
            backgroundColor="$brand/primaryMuted"
            alignItems="center"
            justifyContent="center"
          >
            <QrCode size={18} color="#2F7D5B" />
          </YStack>
          {archived && (
            <XStack
              backgroundColor="$surface/sunken"
              paddingHorizontal="$2"
              paddingVertical={2}
              borderRadius="$full"
            >
              <Text fontSize={10} color="$text/tertiary" fontWeight="600">ARCHIVED</Text>
            </XStack>
          )}
        </XStack>

        {/* Name */}
        <YStack gap="$1">
          <Text fontSize={15} fontWeight="600" color="$text/primary" numberOfLines={1}>
            {container.nickname || `Container ${container.qrToken.slice(-4)}`}
          </Text>
          <Text fontSize={12} color="$text/tertiary">
            {t('containers.itemCount', { count: itemCount })}
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  );
}
