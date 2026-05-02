import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack } from 'tamagui';
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

export default function RecipesScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadRecipes = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const data = await executeGraphQL<{ getRecipeRecommendations: Recipe[] }>(
        GET_RECIPE_RECOMMENDATIONS,
        { householdId },
      );
      setRecipes(data?.getRecipeRecommendations || []);
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
                <View
                  style={{
                    marginVertical: 10,
                    padding: 12,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                  }}
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
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        {recipe.cuisine && (
                          <View
                            style={{
                              backgroundColor: '#e8f5e9',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12,
                              marginRight: 6,
                            }}
                          >
                            <Text fontSize={12} color="#2F7D5B" fontWeight="600">
                              {recipe.cuisine}
                            </Text>
                          </View>
                        )}
                        <View
                          style={{
                            backgroundColor: '#f3e5f5',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}
                        >
                          <Text fontSize={12} color="#6a1b9a">
                            {recipe.difficulty}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={20} color="black" />
                    ) : (
                      <ChevronDown size={20} color="black" />
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
                      <Text fontSize={13} fontWeight="600" marginTop={8}>
                        {t('recipes.ingredients')}
                      </Text>
                      {recipe.ingredients.map((ingredient, idx) => (
                        <Text key={idx} fontSize={12} color="$textTertiary">
                          • {ingredient.name}{' '}
                          {ingredient.quantity && `(${ingredient.quantity} ${ingredient.unit})`}
                          {ingredient.optional && ` - ${t('recipes.optional')}`}
                        </Text>
                      ))}
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
                      <TouchableOpacity
                        onPress={() => handleCook(recipe)}
                        style={{
                          marginTop: 12,
                          padding: 10,
                          backgroundColor: '#2F7D5B',
                          borderRadius: 6,
                        }}
                      >
                        <Text textAlign="center" color="white" fontWeight="600">
                          {t('recipes.cookThis')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </YStack>
  );
}
