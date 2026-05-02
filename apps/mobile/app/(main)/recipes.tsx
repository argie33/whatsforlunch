import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { GET_RECIPE_RECOMMENDATIONS } from '@/db/graphql';
import { executeGraphQL } from '@/lib/graphql-client';
import { itemsService } from '@/services';

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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

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

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 }}>
        <Text fontSize={24} fontWeight="bold">
          {t('recipes.screenTitle')}
        </Text>
        <Text fontSize={14} color="$textTertiary">
          {recipes.length} {t('recipes.suggestions')}
        </Text>
      </View>

      {/* Recipes List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>{t('common.loading')}</Text>
        ) : recipes.length === 0 ? (
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
                        <Text fontWeight="600">{scaledServings[recipe.id] || recipe.servings}</Text>
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
                      <YStack
                        backgroundColor="$brand/primary"
                        paddingVertical="$3"
                        paddingHorizontal="$4"
                        borderRadius="$md"
                        marginTop={12}
                      >
                        <Pressable onPress={() => handleCook(recipe)}>
                          <Text textAlign="center" color="$white" fontWeight="600">
                            {t('recipes.cookThis')}
                          </Text>
                        </Pressable>
                      </YStack>
                    </View>
                  )}
                </YStack>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </YStack>
  );
}
