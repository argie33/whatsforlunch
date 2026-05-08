import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { GET_RECIPE_RECOMMENDATIONS } from '@/db/graphql';
import { executeGraphQL } from '@/lib/graphql-client';
import { mealPlanService, MealPlanEntryCreateInput, MealType } from '@/services/MealPlanService';
import { MealPlanEntry } from '@/db/models/MealPlanEntry';
import { useToast } from '@/lib/toast';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

interface Recipe {
  id: string;
  title: string;
  summary: string;
  cuisine: string;
  servings: number;
  cookTimeMinutes: number;
  difficulty: string;
  tags: string[];
  imageUrl?: string;
  usedItemIds: string[];
  rating?: number;
  ingredients: { name: string; quantity: string; unit: string; optional: boolean }[];
  steps: string[];
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export default function MealPlanScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<MealType>('dinner');

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  // Reactive subscription to meal plan entries
  useEffect(() => {
    if (!householdId) return;
    const sub = mealPlanService
      .observeRange(db, householdId, weekStart.getTime(), weekEnd.getTime() + 86400000)
      .subscribe(setEntries);
    return () => sub.unsubscribe();
  }, [db, householdId, weekStart, weekEnd]);

  // Load recipes
  useEffect(() => {
    const loadRecipes = async () => {
      if (!householdId) return;
      setLoading(true);
      try {
        const data = await executeGraphQL<{ getRecommendations: Recipe[] }>(
          GET_RECIPE_RECOMMENDATIONS,
          { householdId },
        );
        setRecipes(data?.getRecommendations ?? []);
      } catch (e) {
        console.error('Failed to load recipes:', e);
      } finally {
        setLoading(false);
      }
    };
    loadRecipes();
  }, [householdId]);

  const handleAddMeal = useCallback(
    async (recipe: Recipe) => {
      if (!selectedDay || !userId || !householdId) return;
      try {
        const input: MealPlanEntryCreateInput = {
          householdId,
          addedByUserId: userId,
          recipeCloudId: recipe.id,
          recipeSnapshot: recipe as unknown as Record<string, unknown>,
          plannedForAt: selectedDay.getTime(),
          mealType: selectedMealType,
          servings: recipe.servings,
        };
        await mealPlanService.addEntry(db, input);
        showToast(t('common.success'), { type: 'success' });
        setPickerOpen(false);
        setSelectedDay(null);
      } catch (e) {
        showToast(t('common.error'), { type: 'error' });
      }
    },
    [selectedDay, selectedMealType, householdId, userId, db, t, showToast],
  );

  const handleRemove = useCallback(
    async (entryId: string) => {
      try {
        await mealPlanService.removeEntry(db, entryId);
        showToast(t('mealPlan.removeMeal'), { type: 'success' });
      } catch (e) {
        showToast(t('common.error'), { type: 'error' });
      }
    },
    [db, t, showToast],
  );

  const handleAddToCart = useCallback(
    async (entry: MealPlanEntry) => {
      try {
        if (!userId) return;
        const count = await mealPlanService.addMissingIngredientsToShoppingList(db, entry, userId);
        if (count === 0) {
          showToast(t('mealPlan.allIngredientsOwned'), { type: 'info' });
        } else {
          showToast(
            t(count === 1 ? 'mealPlan.addedToCart_one' : 'mealPlan.addedToCart_other', {
              count,
            }),
            { type: 'success' },
          );
        }
      } catch (e) {
        showToast(t('common.error'), { type: 'error' });
      }
    },
    [db, userId, t, showToast],
  );

  const handlePrevWeek = useCallback(() => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  }, [weekStart]);

  const handleNextWeek = useCallback(() => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  }, [weekStart]);

  const getEntriesForDay = (day: Date): MealPlanEntry[] => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return entries.filter(
      (e) => e.plannedForAt >= dayStart.getTime() && e.plannedForAt <= dayEnd.getTime(),
    );
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  return (
    <YStack flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingTop: insets.top + 12,
          borderBottomWidth: 1,
          borderBottomColor: '$border/subtle',
        }}
      >
        <XStack justifyContent="space-between" alignItems="center">
          <Pressable onPress={handlePrevWeek}>
            <ChevronLeft size={24} color="$text/primary" />
          </Pressable>
          <Text fontSize={18} fontWeight="600">
            {formatDate(weekStart)} – {formatDate(weekEnd)}
          </Text>
          <Pressable onPress={handleNextWeek}>
            <ChevronRight size={24} color="$text/primary" />
          </Pressable>
        </XStack>
        <Text fontSize={14} color="$text/tertiary" marginTop={8}>
          {entries.length} {t('mealPlan.screenTitle')}
        </Text>
      </View>

      {/* Week Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {entries.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$text/secondary">
              {t('mealPlan.noMeals')}
            </Text>
            <Text fontSize={14} color="$text/tertiary" marginTop={8}>
              {t('mealPlan.addMeals')}
            </Text>
          </View>
        ) : (
          <YStack gap="$4">
            {days.map((day) => {
              const dayEntries = getEntriesForDay(day);
              return (
                <YStack key={day.toISOString()} gap="$2">
                  <Text fontSize={14} fontWeight="600" color="$text/primary">
                    {getDayLabel(day)} {formatDate(day)}
                  </Text>
                  {dayEntries.length === 0 ? (
                    <Text fontSize={12} color="$text/tertiary">
                      No meals planned
                    </Text>
                  ) : (
                    dayEntries.map((entry) => {
                      const recipe = entry.recipeSnapshotJson
                        ? (JSON.parse(entry.recipeSnapshotJson) as Recipe)
                        : null;
                      return (
                        <YStack
                          key={entry.id}
                          padding="$3"
                          backgroundColor="$surface/raised"
                          borderRadius={32}
                          borderWidth={1}
                          borderColor="$border/subtle"
                        >
                          <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
                            <YStack flex={1} gap="$1">
                              <Text fontSize={14} fontWeight="600">
                                {recipe?.title ?? 'Recipe'}
                              </Text>
                              <XStack gap="$2" alignItems="center">
                                <Text fontSize={12} color="$text/tertiary">
                                  {t(`mealPlan.mealTypes.${entry.mealType}`)}
                                </Text>
                                {entry.servings && (
                                  <Text fontSize={12} color="$text/tertiary">
                                    • {entry.servings} {t('recipes.servings')}
                                  </Text>
                                )}
                              </XStack>
                            </YStack>
                            <Pressable onPress={() => handleRemove(entry.id)}>
                              <X size={20} color="$text/tertiary" />
                            </Pressable>
                          </XStack>
                          <XStack gap="$2" marginTop="$2">
                            <Pressable style={{ flex: 1 }} onPress={() => handleAddToCart(entry)}>
                              <YStack
                                backgroundColor="$brand/primary"
                                paddingVertical="$2"
                                paddingHorizontal="$3"
                                borderRadius={32}
                              >
                                <Text
                                  fontSize={12}
                                  color="$white"
                                  fontWeight="600"
                                  textAlign="center"
                                >
                                  🛒 {t('common.add')}
                                </Text>
                              </YStack>
                            </Pressable>
                          </XStack>
                        </YStack>
                      );
                    })
                  )}
                </YStack>
              );
            })}
          </YStack>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        onPress={() => {
          setSelectedDay(new Date());
          setPickerOpen(true);
        }}
        style={{
          position: 'absolute',
          bottom: 80,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: C['brand/primary'],
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: C['brand/primary'],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Plus size={28} color="white" />
      </Pressable>

      {/* Recipe Picker Overlay */}
      {pickerOpen && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <Pressable onPress={() => setPickerOpen(false)} style={{ flex: 1 }} />
          <YStack
            backgroundColor="$surface/raised"
            borderRadius={32}
            padding="$4"
            gap="$3"
            style={{
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              maxHeight: '70%',
            }}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={18} fontWeight="600">
                {t('mealPlan.pickMealType')}
              </Text>
              <Pressable onPress={() => setPickerOpen(false)}>
                <X size={24} color="$text/primary" />
              </Pressable>
            </XStack>

            {/* Meal Type Picker */}
            <XStack gap="$2" flexWrap="wrap">
              {MEAL_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setSelectedMealType(type)}
                  style={{ flex: 0.48 }}
                >
                  <YStack
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    borderRadius={32}
                    backgroundColor={
                      selectedMealType === type ? '$brand/primary' : '$surface/sunken'
                    }
                  >
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color={selectedMealType === type ? '$white' : '$text/primary'}
                      textAlign="center"
                    >
                      {t(`mealPlan.mealTypes.${type}`)}
                    </Text>
                  </YStack>
                </Pressable>
              ))}
            </XStack>

            {/* Recipe List */}
            <Text fontSize={14} fontWeight="600" marginTop="$2">
              {t('mealPlan.pickRecipe')}
            </Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <YStack gap="$2">
                {loading ? (
                  <Text color="$text/tertiary">{t('common.loading')}</Text>
                ) : recipes.length === 0 ? (
                  <Text color="$text/tertiary">{t('recipes.noRecipes')}</Text>
                ) : (
                  recipes.map((recipe) => (
                    <Pressable key={recipe.id} onPress={() => handleAddMeal(recipe)}>
                      <YStack
                        padding="$3"
                        backgroundColor="$surface/sunken"
                        borderRadius={32}
                        gap="$1"
                      >
                        <Text fontSize={14} fontWeight="600">
                          {recipe.title}
                        </Text>
                        <XStack gap="$2" alignItems="center">
                          <Text fontSize={12} color="$text/tertiary">
                            ⏱️ {recipe.cookTimeMinutes} {t('common.minutes')}
                          </Text>
                          <Text fontSize={12} color="$text/tertiary">
                            • 🍽️ {recipe.servings} {t('recipes.servings')}
                          </Text>
                        </XStack>
                      </YStack>
                    </Pressable>
                  ))
                )}
              </YStack>
            </ScrollView>
          </YStack>
        </View>
      )}
    </YStack>
  );
}
