import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Pressable, Alert, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { YStack, XStack, Text, View } from 'tamagui';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { router } from 'expo-router';
import { Plus, QrCode, Printer, Archive } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { useDatabase } from '@/db';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Container } from '@/db/models/Container';
import type { Item } from '@/db/models/Item';
import { EmptyState } from '@/components/ui/EmptyState';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { useAuthIds } from '@/features/auth';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function ContainersScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const insets = useSafeAreaInsets();

  const [containers, setContainers] = useState<Container[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    const repo = new ContainerRepository(db);
    const sub = repo.observeByHousehold(householdId as string, showArchived).subscribe(setContainers);
    return () => sub.unsubscribe();
  }, [db, showArchived, householdId]);

  // Load active item counts per container
  useEffect(() => {
    if (containers.length === 0) return;
    const itemRepo = new ItemRepository(db);
    const subs = containers.map((c) =>
      itemRepo.observeByContainer(c.id).subscribe((items: Item[]) => {
        setItemCounts((prev) => ({
          ...prev,
          [c.id]: items.filter((i: Item) => i.status === 'active').length,
        }));
      }),
    );
    return () => subs.forEach((s) => s.unsubscribe());
  }, [containers, db]);

  const handleContainerPress = useCallback((container: Container) => {
    router.push(`/containers/${container.id}`);
  }, []);

  const handleScanQR = useCallback(async () => {
    await haptics.tap();
    router.push({ pathname: '/scan', params: { mode: 'qr' } });
  }, []);

  const handlePrintStickers = useCallback(async () => {
    await haptics.tap();
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
            <Text
              fontSize={28}
              fontWeight="800"
              color="$text/primary"
              lineHeight={34}
              fontFamily="Fraunces"
            >
              {t('containers.screenTitle')}
            </Text>
            <Text fontSize={14} color="$text/secondary" marginTop="$1">
              {t('containers.subtitle', { count: activeCount })}
            </Text>
          </YStack>
          <Pressable
            onPress={() => setShowArchived((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={t('containers.archivedSection')}
            accessibilityState={{ checked: showArchived }}
          >
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
          illustration={
            <IllustrationPlaceholder name="empty-containers" width={180} height={140} />
          }
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
        <>
          {/* Hero Summary Card */}
          <View style={{ paddingHorizontal: 22, paddingVertical: 12, marginBottom: 12 }}>
            <View style={{ borderRadius: 22, overflow: 'hidden', height: 100 }}>
              <LinearGradient
                colors={['#0E5C3A', '#1F8B5C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={{ padding: 20, justifyContent: 'space-between', flex: 1 }}>
                <Text fontSize={11} fontWeight="800" color="rgba(255,255,255,0.9)" letterSpacing={2}>
                  📦 ACTIVE
                </Text>
                <Text
                  fontSize={30}
                  fontWeight="800"
                  fontFamily="Fraunces"
                  color="white"
                  letterSpacing={-1}
                >
                  {activeCount} containers
                </Text>
                <Text fontSize={14} color="rgba(255,255,255,0.92)">
                  Total {containers.reduce((sum, c) => sum + (itemCounts[c.id] ?? 0), 0)} items tracked
                </Text>
              </View>
            </View>
          </View>

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
            ListFooterComponent={
              <View style={{ paddingHorizontal: 10, paddingVertical: 8, width: '100%' }}>
                <Pressable
                  style={{
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: C['border/subtle'],
                    borderRadius: 22,
                    padding: 24,
                    alignItems: 'center',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text fontSize={42}>🏷️</Text>
                  <Text
                    fontSize={18}
                    fontWeight="800"
                    fontFamily="Fraunces"
                    color={C['text/primary']}
                    marginTop={8}
                  >
                    Order QR Stickers
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']} marginTop={4}>
                    100 reusable stickers · $9.99
                  </Text>
                  <Pressable
                    style={{
                      backgroundColor: C['brand/primary'],
                      paddingHorizontal: 18,
                      paddingVertical: 10,
                      borderRadius: 16,
                      marginTop={14}
                    }}
                  >
                    <Text fontSize={15} fontWeight="800" color="white">
                      Order now
                    </Text>
                  </Pressable>
                </Pressable>
              </View>
            }
          />
        </>
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
          accessibilityRole="button"
          accessibilityLabel={t('containers.printStickers')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0F1411',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Printer size={20} color="#2F7D5B" aria-hidden />
        </Pressable>

        <Pressable
          onPress={handleScanQR}
          accessibilityRole="button"
          accessibilityLabel={t('containers.scanQR')}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#2F7D5B',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0F1411',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <QrCode size={24} color="white" aria-hidden />
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

const CONTAINER_EMOJIS: Record<string, string> = {
  lunchbox: '🍱',
  leftovers: '🥡',
  soup: '🍲',
  mealprep: '📦',
  default: '🥡',
};

function ContainerCard({ container, itemCount, onPress }: ContainerCardProps) {
  const { t } = useTranslation();
  const archived = !!container.archivedAt;

  const displayName =
    container.nickname || t('containers.containerUnnamed', { token: container.qrToken.slice(-4) });

  // Pick emoji based on container type or default
  const emoji = CONTAINER_EMOJIS[container.nickname?.toLowerCase() || 'default'] || '🥡';

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        margin: 4,
        aspectRatio: 1.05,
      }}
      accessibilityRole="button"
      accessibilityLabel={t('accessibility.containerCard', { name: displayName, count: itemCount })}
      accessibilityState={archived ? { disabled: false } : undefined}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: C['surface/raised'],
          borderRadius: 32,
          borderWidth: 1,
          borderColor: C['border/subtle'],
          padding: 18,
          opacity: archived ? 0.6 : 1,
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative overlay gradient */}
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            background: 'linear-gradient(135deg, transparent 50%, rgba(250,246,238,0.5) 100%)',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />

        {/* Emoji with shadow */}
        <Text
          fontSize={36}
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.08))',
          }}
        >
          {emoji}
        </Text>

        {/* Archived badge */}
        {archived && (
          <View
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              backgroundColor: C['surface/sunken'],
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 9999,
            }}
          >
            <Text fontSize={10} color={C['text/tertiary']} fontWeight="600">
              {t('containers.archived').toUpperCase()}
            </Text>
          </View>
        )}

        {/* Name & Info */}
        <YStack gap="$1">
          <Text
            fontSize={17}
            fontWeight="700"
            fontFamily="Fraunces"
            color={C['text/primary']}
            letterSpacing={-0.3}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text fontSize={12} color={C['text/secondary']}>
            {t('containers.itemCount', { count: itemCount })}
          </Text>
        </YStack>
      </View>
    </Pressable>
  );
}
