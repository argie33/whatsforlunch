import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Heart, Star, Edit2, Trash2 } from 'lucide-react-native';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { GET_RECIPE_RECOMMENDATIONS } from '@/db/graphql';
import { executeGraphQL } from '@/lib/graphql-client';
import { itemsService } from '@/services';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/lib/toast';

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  optional: boolean;
}

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
  ingredients: Ingredient[];
  steps: string[];
}

interface SavedRecipe {
  id: string;
  recipeId: string;
  householdId: string;
  title: string;
  imageUrl?: string;
  rating?: number;
  notes?: string;
  savedAt: string;
}

function scaleQty(quantity: string, scale: number): string {
  const n = parseFloat(quantity);
  if (isNaN(n) || n === 0) return quantity;
  const scaled = Math.round(n * scale * 10) / 10;
  return scaled % 1 === 0 ? String(scaled | 0) : String(scaled);
}

export default function RecipesScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const { showToast } = useToast();
  const [tabValue, setTabValue] = useState<string>('recommended');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scaledServings, setScaledServings] = useState<Record<string, number>>({});

  const loadRecipes = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const data = await executeGraphQL<{ getRecommendations: Recipe[] }>(
        GET_RECIPE_RECOMMENDATIONS,
        { householdId },
      );
      setRecipes(data?.getRecommendations || []);
    } catch (e) {
      console.error('Failed to load recipes:', e);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  const loadSavedRecipes = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const response = await executeGraphQL<{
        listSavedRecipes: { items: SavedRecipe[] };
      }>(
        `query listSavedRecipes($householdId: UUID!, $limit: Int, $nextToken: String) {
          listSavedRecipes(householdId: $householdId, limit: $limit, nextToken: $nextToken) {
            items {
              id
              recipeId
              householdId
              title
              imageUrl
              rating
              notes
              savedAt
            }
          }
        }`,
        { householdId, limit: 100 },
      );
      setSavedRecipes(response?.listSavedRecipes?.items || []);
    } catch (e) {
      console.error('Failed to load saved recipes:', e);
      showToast(String(e), { type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [householdId, showToast]);

  useEffect(() => {
    if (tabValue === 'recommended') {
      loadRecipes();
    } else {
      loadSavedRecipes();
    }
  }, [tabValue, loadRecipes, loadSavedRecipes]);

  const toggleExpanded = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  const handleCook = useCallback(
    async (recipe: Recipe) => {
      if (!db || recipe.usedItemIds.length === 0) {
        Alert.alert(t('recipes.cookingDone'));
        return;
      }

      try {
        await Promise.all(
          recipe.usedItemIds.map((itemId) => itemsService.markItemEaten(db, itemId)),
        );
        await loadRecipes();
        Alert.alert(t('recipes.cookingDone'), `${recipe.title} ingredients marked as eaten`);
      } catch (e) {
        Alert.alert(t('common.error'), String(e));
      }
    },
    [db, loadRecipes, t],
  );

  const increaseServings = (recipeId: string) => {
    setScaledServings((prev) => ({
      ...prev,
      [recipeId]: (prev[recipeId] || 1) + 1,
    }));
  };

  const decreaseServings = (recipeId: string, baseServings: number) => {
    setScaledServings((prev) => {
      const current = prev[recipeId] || baseServings;
      if (current <= 1) return prev;
      return { ...prev, [recipeId]: current - 1 };
    });
  };

  const resetServings = (recipeId: string) => {
    setScaledServings((prev) => {
      const next = { ...prev };
      delete next[recipeId];
      return next;
    });
  };

  const saveRecipe = useCallback(
    async (recipe: Recipe) => {
      if (!householdId) return;

      try {
        await executeGraphQL(
          `mutation saveRecipe($input: SaveRecipeInput!) {
            saveRecipe(input: $input) {
              id
            }
          }`,
          {
            input: {
              householdId,
              recipeId: recipe.id,
              title: recipe.title,
              imageUrl: recipe.imageUrl || null,
            },
          },
        );
        showToast(`${recipe.title} ${t('recipes.addedToSaved')}`, {
          type: 'success',
        });
        await loadSavedRecipes();
      } catch (e) {
        console.error('Error saving recipe:', e);
        showToast(String(e), { type: 'error' });
      }
    },
    [householdId, t, loadSavedRecipes, showToast],
  );

  const updateRecipeRating = useCallback(
    async (recipeId: string, rating: number) => {
      if (!householdId) return;

      try {
        await executeGraphQL(
          `mutation updateSavedRecipe($input: UpdateSavedRecipeInput!) {
            updateSavedRecipe(input: $input) {
              id
            }
          }`,
          {
            input: {
              id: recipeId,
              householdId,
              rating,
            },
          },
        );
        await loadSavedRecipes();
      } catch (e) {
        console.error('Error updating recipe:', e);
        showToast(String(e), { type: 'error' });
      }
    },
    [householdId, t, loadSavedRecipes, showToast],
  );

  const deleteRecipe = useCallback(
    async (recipeId: string, title: string) => {
      if (!householdId) return;

      Alert.alert(t('recipes.deleteConfirm'), `${t('recipes.deleteConfirmMessage')} "${title}"?`, [
        {
          text: t('common.cancel'),
          onPress: () => {},
        },
        {
          text: t('common.delete'),
          onPress: async () => {
            try {
              await executeGraphQL(
                `mutation deleteSavedRecipe($householdId: UUID!, $id: UUID!) {
                    deleteSavedRecipe(householdId: $householdId, id: $id)
                  }`,
                { householdId, id: recipeId },
              );
              showToast(`${title} ${t('recipes.removedFromSaved')}`, {
                type: 'success',
              });
              await loadSavedRecipes();
            } catch (e) {
              console.error('Error deleting recipe:', e);
              showToast(String(e), { type: 'error' });
            }
          },
          style: 'destructive',
        },
      ]);
    },
    [householdId, t, loadSavedRecipes, showToast],
  );

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 }}>
        <Text fontSize={24} fontWeight="bold">
          {t('recipes.screenTitle')}
        </Text>
      </View>

      {/* Tab Selection */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <SegmentedControl
          segments={[
            { label: t('recipes.recommended'), value: 'recommended' },
            { label: t('recipes.saved'), value: 'saved' },
          ]}
          value={tabValue}
          onValueChange={(value: string) => setTabValue(value)}
        />
      </View>

      {/* Recipes List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>{t('common.loading')}</Text>
        ) : tabValue === 'recommended' ? (
          recipes.length === 0 ? (
            <View style={{ marginTop: 40, alignItems: 'center' }}>
              <Text fontSize={16} color="$textSecondary">
                {t('recipes.noRecipes')}
              </Text>
              <Text fontSize={14} color="$textTertiary" marginTop={8}>
                {t('recipes.addItemsForRecipes')}
              </Text>
            </View>
          ) : (
            recipes.map((recipe) => {
              const isExpanded = expanded.has(recipe.id);
              return (
                <TouchableOpacity key={recipe.id} onPress={() => toggleExpanded(recipe.id)}>
                  <YStack
                    marginVertical="$3"
                    padding="$3"
                    backgroundColor="$surface/raised"
                    borderRadius="$md"
                    borderWidth={1}
                    borderColor="$border/subtle"
                  >
                    {/* Header */}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text fontWeight="bold" fontSize={16}>
                          {recipe.title}
                        </Text>
                        <Text fontSize={12} color="$textTertiary" marginTop={4}>
                          ⏱️ {recipe.cookTimeMinutes} {t('common.minutes')} • 🍽️ {recipe.servings}{' '}
                          {t('recipes.servings')}
                        </Text>
                        <XStack gap="$2" marginTop="$2">
                          {recipe.cuisine && (
                            <YStack
                              backgroundColor="$brand/primaryMuted"
                              paddingHorizontal="$2"
                              paddingVertical={4}
                              borderRadius="$full"
                            >
                              <Text fontSize={12} color="$brand/primary" fontWeight="600">
                                {recipe.cuisine}
                              </Text>
                            </YStack>
                          )}
                          <YStack
                            backgroundColor="$surface/sunken"
                            paddingHorizontal="$2"
                            paddingVertical={4}
                            borderRadius="$full"
                          >
                            <Text fontSize={12} color="$text/secondary">
                              {recipe.difficulty}
                            </Text>
                          </YStack>
                        </XStack>
                      </View>
                      {isExpanded ? (
                        <ChevronUp size={20} color="$text" />
                      ) : (
                        <ChevronDown size={20} color="$text" />
                      )}
                    </View>

                    {/* Details */}
                    {isExpanded && (
                      <View style={{ marginTop: 12 }}>
                        {recipe.summary && (
                          <Text fontSize={13} color="$textSecondary">
                            {recipe.summary}
                          </Text>
                        )}

                        {/* Servings Scaler */}
                        <XStack alignItems="center" gap="$2" marginTop="$3" marginBottom="$2">
                          <Text fontSize={12} color="$text/secondary">
                            {t('recipes.servings')}:
                          </Text>
                          <Pressable onPress={() => decreaseServings(recipe.id, recipe.servings)}>
                            <Text fontSize={14} fontWeight="600" paddingHorizontal="$2">
                              −
                            </Text>
                          </Pressable>
                          <Text fontWeight="600">
                            {scaledServings[recipe.id] || recipe.servings}
                          </Text>
                          <Pressable onPress={() => increaseServings(recipe.id)}>
                            <Text fontSize={14} fontWeight="600" paddingHorizontal="$2">
                              +
                            </Text>
                          </Pressable>
                          {scaledServings[recipe.id] && (
                            <Pressable onPress={() => resetServings(recipe.id)}>
                              <Text color="$text/tertiary" fontSize={11} fontWeight="500">
                                {t('recipes.resetServings')}
                              </Text>
                            </Pressable>
                          )}
                        </XStack>

                        <Text fontSize={13} fontWeight="600" marginTop="$2">
                          {t('recipes.ingredients')}
                        </Text>
                        {recipe.ingredients.map((ingredient, idx) => {
                          const scale =
                            (scaledServings[recipe.id] || recipe.servings) / recipe.servings;
                          const scaledQty = ingredient.quantity
                            ? scaleQty(ingredient.quantity, scale)
                            : '';
                          return (
                            <Text key={idx} fontSize={12} color="$textTertiary">
                              • {ingredient.name} {scaledQty && `(${scaledQty} ${ingredient.unit})`}
                              {ingredient.optional && ` - ${t('recipes.optional')}`}
                            </Text>
                          );
                        })}
                        {recipe.steps && recipe.steps.length > 0 && (
                          <>
                            <Text fontSize={13} fontWeight="600" marginTop={8}>
                              {t('recipes.steps')}
                            </Text>
                            {recipe.steps.map((step, idx) => (
                              <Text key={idx} fontSize={12} color="$textTertiary">
                                {idx + 1}. {step}
                              </Text>
                            ))}
                          </>
                        )}
                        <XStack gap="$2" marginTop={12}>
                          <YStack
                            flex={1}
                            backgroundColor="$brand/primary"
                            paddingVertical="$3"
                            paddingHorizontal="$4"
                            borderRadius="$md"
                          >
                            <Pressable onPress={() => handleCook(recipe)}>
                              <Text textAlign="center" color="$white" fontWeight="600">
                                {t('recipes.cookThis')}
                              </Text>
                            </Pressable>
                          </YStack>
                          <YStack
                            backgroundColor="$surface/raised"
                            paddingVertical="$3"
                            paddingHorizontal="$3"
                            borderRadius="$md"
                            borderWidth={1}
                            borderColor="$border/subtle"
                          >
                            <Pressable onPress={() => saveRecipe(recipe)}>
                              <Heart size={20} color="$text" />
                            </Pressable>
                          </YStack>
                        </XStack>
                      </View>
                    )}
                  </YStack>
                </TouchableOpacity>
              );
            })
          )
        ) : savedRecipes.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$textSecondary">
              {t('recipes.noSavedRecipes')}
            </Text>
            <Text fontSize={14} color="$textTertiary" marginTop={8}>
              {t('recipes.saveRecipesFromRecommended')}
            </Text>
          </View>
        ) : (
          savedRecipes.map((recipe) => (
            <YStack
              key={recipe.id}
              marginVertical="$3"
              padding="$3"
              backgroundColor="$surface/raised"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$border/subtle"
            >
              {/* Header with actions */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text fontWeight="bold" fontSize={16}>
                    {recipe.title}
                  </Text>
                  {recipe.notes && (
                    <Text fontSize={12} color="$textSecondary" marginTop={4}>
                      {recipe.notes}
                    </Text>
                  )}
                </View>
                <XStack gap="$2">
                  <Pressable
                    onPress={() => updateRecipeRating(recipe.id, (recipe.rating || 0) + 1)}
                  >
                    <Star
                      size={20}
                      color={recipe.rating ? '$brand/primary' : '$text/tertiary'}
                      fill={recipe.rating ? '$brand/primary' : 'none'}
                    />
                  </Pressable>
                  <Pressable onPress={() => deleteRecipe(recipe.id, recipe.title)}>
                    <Trash2 size={20} color="$text/tertiary" />
                  </Pressable>
                </XStack>
              </View>

              {/* Rating display */}
              {recipe.rating && (
                <XStack gap="$1" marginTop="$2">
                  {Array.from({ length: recipe.rating }).map((_, i) => (
                    <Star key={i} size={14} color="$brand/primary" fill="$brand/primary" />
                  ))}
                </XStack>
              )}
            </YStack>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </YStack>
  );
}
