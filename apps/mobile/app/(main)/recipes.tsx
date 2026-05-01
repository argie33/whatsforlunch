import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuthIds } from '@/features/auth';
import { getLocalToken } from '@/lib/local-auth';
import { IS_MOCK } from '@/features/auth/authService';

interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  matchScore: number;
  time: number;
  servings: number;
  difficulty: string;
}

const API_URL = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

async function graphQLCall(query: string, variables: Record<string, any>) {
  const token = await getLocalToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');

  return json.data;
}

export default function RecipesScreen() {
  const { t } = useTranslation();
  const { householdId } = useAuthIds();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadRecipes = useCallback(async () => {
    if (!householdId || IS_MOCK) return;

    setLoading(true);
    try {
      const query = `
        query GetRecommendations($householdId: ID!) {
          getRecommendations(householdId: $householdId) {
            recommendations {
              id name description ingredients matchScore time servings difficulty
            }
          }
        }
      `;
      const data = await graphQLCall(query, { householdId });
      setRecipes(data?.getRecommendations?.recommendations || []);
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

  const handleCook = (recipe: Recipe) => {
    Alert.alert('Cook This Recipe', `${recipe.name} - ${recipe.time} mins`, [
      { text: 'Cancel' },
      {
        text: 'Mark Ingredients as Used',
        onPress: () => {
          Alert.alert('Success', 'Ingredients marked as eaten');
        },
      },
    ]);
  };

  if (IS_MOCK) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>App is in MOCK mode. Set EXPO_PUBLIC_AUTH_MODE=local to use API.</Text>
      </View>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 }}>
        <Text fontSize={24} fontWeight="bold">
          Recipe Ideas
        </Text>
        <Text fontSize={14} color="$textTertiary">
          {recipes.length} suggestions
        </Text>
      </View>

      {/* Recipes List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>Loading recipes...</Text>
        ) : recipes.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$textSecondary">
              No recipes available
            </Text>
            <Text fontSize={14} color="$textTertiary" marginTop={8}>
              Add items to get personalized recipes
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text fontWeight="bold" fontSize={16}>
                        {recipe.name}
                      </Text>
                      <Text fontSize={12} color="$textTertiary" marginTop={4}>
                        ⏱️ {recipe.time} min • 🍽️ {recipe.servings} servings
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
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
                            {recipe.matchScore}% Match
                          </Text>
                        </View>
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
                      <Text fontSize={13} color="$textSecondary">
                        {recipe.description}
                      </Text>
                      <Text fontSize={13} fontWeight="600" marginTop={8}>
                        Ingredients:
                      </Text>
                      {recipe.ingredients.map((ingredient, idx) => (
                        <Text key={idx} fontSize={12} color="$textTertiary">
                          • {ingredient}
                        </Text>
                      ))}
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
                          Cook This
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
