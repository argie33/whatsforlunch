import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { ChevronRight, Clock, Users, Sparkles } from 'lucide-react-native';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { itemsService } from '@/services/ItemsService';
import { useAuthIds } from '@/features/auth';
import { EmptyState } from '@/components/ui/EmptyState';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatTimeLeftI18n, getItemStatus } from '@/lib/itemUtils';
import { cancelExpiryNotification } from '@/lib/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecipeSuggestion {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  linkedItemIds: string[];
  missingIngredients: string[];
  steps: string[];
}

// ─── Stub AI call ─────────────────────────────────────────────────────────────

async function fetchRecipeSuggestions(items: Item[]): Promise<RecipeSuggestion[]> {
  // TODO: Wire to W4's suggest-recipes AppSync Lambda when available.
  // Stub returns placeholder cards so the UI is fully functional now.
  await new Promise((r) => setTimeout(r, 1200));

  if (items.length === 0) return [];

  const names = items.map((i) => i.foodName).join(', ');
  return [
    {
      id: 'stub-1',
      title: `Quick meal with ${items[0].foodName}`,
      description: `A simple dish that uses up ${names} before they expire.`,
      durationMinutes: 20,
      difficulty: 'easy',
      servings: 2,
      linkedItemIds: items.slice(0, 3).map((i) => i.id),
      missingIngredients: ['olive oil', 'salt', 'pepper'],
      steps: [
        'Prep all your ingredients.',
        `Cook ${items[0].foodName} over medium heat.`,
        'Season to taste and serve.',
      ],
    },
    {
      id: 'stub-2',
      title: 'Simple stir-fry',
      description: 'Uses up what you have before it goes bad.',
      durationMinutes: 15,
      difficulty: 'easy',
      servings: 2,
      linkedItemIds: items.slice(0, 2).map((i) => i.id),
      missingIngredients: ['soy sauce', 'sesame oil'],
      steps: [
        'Heat oil in a pan.',
        'Add ingredients and stir-fry for 5 minutes.',
        'Season and serve over rice.',
      ],
    },
  ];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RecipesScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const insets = useSafeAreaInsets();

  const [expiringItems, setExpiringItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<RecipeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const repo = new ItemRepository(db);
    const sub = repo.observeByStatus(householdId, 'active').subscribe((items) => {
      const cutoff = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const expiring = items
        .filter((i) => i.expiryAt <= cutoff && i.expiryAt >= Date.now())
        .sort((a, b) => a.expiryAt - b.expiryAt)
        .slice(0, 10);
      setExpiringItems(expiring);
      setSelectedItemIds((prev) => {
        if (prev.size === 0 && expiring.length > 0) {
          return new Set(expiring.map((i) => i.id));
        }
        return prev;
      });
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  const selectedItems = useMemo(
    () => expiringItems.filter((i) => selectedItemIds.has(i.id)),
    [expiringItems, selectedItemIds],
  );

  const handleGenerate = useCallback(async () => {
    if (selectedItems.length === 0) return;
    setLoading(true);
    await haptics.medium();
    try {
      const suggestions = await fetchRecipeSuggestions(selectedItems);
      setRecipes(suggestions);
      setGenerated(true);
    } catch {
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedItems]);

  const toggleItem = useCallback(async (id: string) => {
    await haptics.selection();
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setGenerated(false);
  }, []);

  const handleCookThis = useCallback(
    async (recipe: RecipeSuggestion) => {
      const linked = expiringItems.filter((i) => recipe.linkedItemIds.includes(i.id));
      if (linked.length === 0) return;
      Alert.alert(t('recipes.cookThis'), t('recipes.cookThisConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            await haptics.success();
            await Promise.all(
              linked.map((i) => {
                cancelExpiryNotification(i.id).catch(() => {});
                return itemsService.markItemEaten(db, i.id);
              }),
            );
          },
        },
      ]);
    },
    [expiringItems, db, t],
  );

  return (
    <View flex={1} backgroundColor="$surface/base">
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$5"
        paddingBottom="$3"
        backgroundColor="$surface/raised"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
      >
        <Text
          fontSize={28}
          fontWeight="700"
          color="$text/primary"
          lineHeight={34}
          accessibilityRole="header"
        >
          {t('recipes.screenTitle')}
        </Text>
        <Text fontSize={14} color="$text/secondary" marginTop="$1">
          {t('recipes.subtitle')}
        </Text>
      </YStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {expiringItems.length === 0 ? (
          <EmptyState
            title={t('empty.recipes.title')}
            description={t('empty.recipes.description')}
            illustration={<IllustrationPlaceholder name="empty-fridge" width={180} height={140} />}
            primaryAction={{
              label: t('empty.recipes.cta'),
              onPress: () => router.push('/(main)/'),
            }}
          />
        ) : (
          <>
            <YStack paddingHorizontal="$5" paddingTop="$4" gap="$3">
              <Text
                fontSize={13}
                fontWeight="600"
                color="$text/secondary"
                textTransform="uppercase"
                letterSpacing={0.4}
              >
                {t('recipes.linkedItems')}
              </Text>

              <YStack gap="$2">
                {expiringItems.map((item) => {
                  const selected = selectedItemIds.has(item.id);
                  const status = getItemStatus(item);
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => toggleItem(item.id)}
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.foodName}
                      accessibilityState={{ checked: selected }}
                    >
                      <XStack
                        paddingHorizontal="$3"
                        paddingVertical="$3"
                        borderRadius="$md"
                        borderWidth={1}
                        borderColor={selected ? '$brand/primary' : '$border/subtle'}
                        backgroundColor={selected ? '$surface/sunken' : '$surface/raised'}
                        alignItems="center"
                        gap="$3"
                      >
                        <View
                          width={4}
                          height={36}
                          borderRadius={2}
                          backgroundColor={
                            status === 'expired'
                              ? '$status/expired'
                              : status === 'urgent'
                                ? '$status/urgent'
                                : status === 'soon'
                                  ? '$status/soon'
                                  : '$status/fresh'
                          }
                        />
                        <YStack flex={1}>
                          <Text fontSize={15} fontWeight="600" color="$text/primary">
                            {item.foodName}
                          </Text>
                          <Text fontSize={12} color="$text/secondary">
                            {formatTimeLeftI18n(item.expiryAt, t)}
                          </Text>
                        </YStack>
                        <StatusBadge status={status} size="sm" />
                        {selected && (
                          <View
                            width={20}
                            height={20}
                            borderRadius={10}
                            backgroundColor="$brand/primary"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text fontSize={12} color="white" fontWeight="700">
                              ✓
                            </Text>
                          </View>
                        )}
                      </XStack>
                    </Pressable>
                  );
                })}
              </YStack>

              <Button
                variant="filled"
                size="lg"
                onPress={handleGenerate}
                disabled={selectedItems.length === 0 || loading}
                loading={loading}
              >
                <XStack alignItems="center" gap="$2">
                  <Sparkles size={16} color="white" />
                  <Text color="white" fontWeight="600" fontSize={16}>
                    {generated ? t('recipes.generateMore') : t('recipes.screenTitle')}
                  </Text>
                </XStack>
              </Button>
            </YStack>

            {loading && (
              <YStack alignItems="center" paddingTop="$8" gap="$3">
                <ActivityIndicator size="large" color="#2F7D5B" />
                <Text fontSize={14} color="$text/secondary">
                  {t('recipes.generating')}
                </Text>
              </YStack>
            )}

            {!loading && generated && recipes.length === 0 && (
              <YStack paddingHorizontal="$5" paddingTop="$6" alignItems="center">
                <Text fontSize={16} color="$text/secondary" textAlign="center">
                  {t('recipes.noRecipes')}
                </Text>
              </YStack>
            )}

            {!loading && recipes.length > 0 && (
              <YStack paddingHorizontal="$5" paddingTop="$5" gap="$4">
                {recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    linkedItems={expiringItems.filter((i) => recipe.linkedItemIds.includes(i.id))}
                    onCookThis={() => handleCookThis(recipe)}
                  />
                ))}
              </YStack>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Recipe card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  linkedItems,
  onCookThis,
}: {
  recipe: RecipeSuggestion;
  linkedItems: Item[];
  onCookThis: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      onPress={async () => {
        await haptics.selection();
        setExpanded((v) => !v);
      }}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
      accessibilityHint={t('accessibility.expandRecipe')}
    >
      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        borderWidth={1}
        borderColor="$border/subtle"
        overflow="hidden"
      >
        <XStack paddingHorizontal="$4" paddingVertical="$4" alignItems="flex-start" gap="$3">
          <YStack flex={1} gap="$1">
            <Text fontSize={17} fontWeight="700" color="$text/primary">
              {recipe.title}
            </Text>
            <Text fontSize={14} color="$text/secondary" numberOfLines={expanded ? undefined : 2}>
              {recipe.description}
            </Text>
          </YStack>
          <ChevronRight
            size={18}
            color="#8A8E8C"
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        </XStack>

        <XStack paddingHorizontal="$4" paddingBottom="$3" gap="$4" alignItems="center">
          <XStack alignItems="center" gap="$1">
            <Clock size={13} color="#8A8E8C" />
            <Text fontSize={13} color="$text/secondary">
              {t('recipes.duration', { minutes: recipe.durationMinutes })}
            </Text>
          </XStack>
          <XStack alignItems="center" gap="$1">
            <Users size={13} color="#8A8E8C" />
            <Text fontSize={13} color="$text/secondary">
              {t('recipes.servings', { count: recipe.servings })}
            </Text>
          </XStack>
          <XStack
            paddingHorizontal="$2"
            paddingVertical={2}
            borderRadius="$full"
            backgroundColor={
              recipe.difficulty === 'easy'
                ? '#E8F5EE'
                : recipe.difficulty === 'medium'
                  ? '#FFF3E0'
                  : '#FDECEA'
            }
          >
            <Text
              fontSize={12}
              fontWeight="600"
              color={
                recipe.difficulty === 'easy'
                  ? '#2F7D5B'
                  : recipe.difficulty === 'medium'
                    ? '#E67E22'
                    : '#C24A3E'
              }
            >
              {t(`recipes.difficulty.${recipe.difficulty}`)}
            </Text>
          </XStack>
        </XStack>

        {linkedItems.length > 0 && (
          <XStack paddingHorizontal="$4" paddingBottom="$3" gap="$2" flexWrap="wrap">
            {linkedItems.map((item) => (
              <XStack
                key={item.id}
                paddingHorizontal="$2"
                paddingVertical={2}
                borderRadius="$full"
                backgroundColor="$surface/sunken"
                borderWidth={1}
                borderColor="$border/subtle"
              >
                <Text fontSize={12} color="$text/secondary">
                  {item.foodName}
                </Text>
              </XStack>
            ))}
          </XStack>
        )}

        {expanded && (
          <YStack
            paddingHorizontal="$4"
            paddingBottom="$4"
            paddingTop="$2"
            gap="$3"
            borderTopWidth={1}
            borderTopColor="$border/subtle"
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
              {t('recipes.steps')}
            </Text>
            {recipe.steps.map((step, idx) => (
              <XStack key={idx} gap="$3" alignItems="flex-start">
                <View
                  width={24}
                  height={24}
                  borderRadius={12}
                  backgroundColor="$brand/primary"
                  alignItems="center"
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Text fontSize={12} fontWeight="700" color="white">
                    {idx + 1}
                  </Text>
                </View>
                <Text fontSize={14} color="$text/primary" flex={1} lineHeight={20}>
                  {step}
                </Text>
              </XStack>
            ))}

            {recipe.missingIngredients.length > 0 && (
              <YStack gap="$2" marginTop="$2">
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color="$text/secondary"
                  textTransform="uppercase"
                  letterSpacing={0.4}
                >
                  {t('recipes.missingItems')}
                </Text>
                <Text fontSize={14} color="$text/secondary">
                  {recipe.missingIngredients.join(', ')}
                </Text>
              </YStack>
            )}

            <Pressable
              onPress={onCookThis}
              accessibilityRole="button"
              accessibilityLabel={t('recipes.cookThis')}
            >
              <XStack
                paddingVertical="$3"
                borderRadius="$md"
                backgroundColor="$brand/primary"
                alignItems="center"
                justifyContent="center"
                gap="$2"
                marginTop="$2"
              >
                <Text fontSize={15} fontWeight="600" color="white">
                  ✓ {t('recipes.cookThis')}
                </Text>
              </XStack>
            </Pressable>
          </YStack>
        )}
      </YStack>
    </Pressable>
  );
}
