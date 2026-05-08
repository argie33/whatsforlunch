import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { GET_RECIPE_RECOMMENDATIONS } from '@/db/graphql';
import { executeGraphQL } from '@/lib/graphql-client';
import { lightTheme } from '@/theme/tokens';

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
  matchPercent?: number;
  emoji?: string;
}

const FILTERS = [
  { key: 'foryou', label: 'For you', icon: '✨' },
  { key: 'quick', label: 'Quick', icon: '⚡' },
  { key: 'vegetarian', label: 'Vegetarian', icon: '🥗' },
  { key: 'healthy', label: 'Healthy', icon: '💪' },
  { key: 'comfort', label: 'Comfort', icon: '🍝' },
  { key: 'spicy', label: 'Spicy', icon: '🌶' },
];

const FALLBACK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Garlic Spinach Pasta',
    summary: 'Classic Italian comfort with spinach and garlic',
    cuisine: 'Italian',
    servings: 4,
    cookTimeMinutes: 25,
    difficulty: 'Easy',
    tags: ['quick', 'vegetarian'],
    usedItemIds: [],
    matchPercent: 92,
    emoji: '🍝',
  },
  {
    id: '2',
    title: 'Mushroom Risotto',
    summary: 'Creamy, rich, and satisfying',
    cuisine: 'Italian',
    servings: 4,
    cookTimeMinutes: 35,
    difficulty: 'Medium',
    tags: ['comfort'],
    usedItemIds: [],
    matchPercent: 85,
    emoji: '🍚',
  },
  {
    id: '3',
    title: 'Spicy Stir Fry',
    summary: 'Quick weeknight dinner',
    cuisine: 'Asian',
    servings: 2,
    cookTimeMinutes: 15,
    difficulty: 'Easy',
    tags: ['quick', 'spicy'],
    usedItemIds: [],
    matchPercent: 78,
    emoji: '🥘',
  },
  {
    id: '4',
    title: 'Greek Salad Bowl',
    summary: 'Fresh, healthy, and vibrant',
    cuisine: 'Mediterranean',
    servings: 2,
    cookTimeMinutes: 10,
    difficulty: 'Easy',
    tags: ['vegetarian', 'healthy', 'quick'],
    usedItemIds: [],
    matchPercent: 70,
    emoji: '🥗',
  },
];

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { householdId } = useAuthIds();
  const db = useDatabase();
  const [recipes, setRecipes] = useState<Recipe[]>(FALLBACK_RECIPES);
  const [activeFilter, setActiveFilter] = useState('foryou');

  const loadRecipes = useCallback(async () => {
    if (!householdId) return;
    try {
      const data = await executeGraphQL<{ getRecommendations: Recipe[] }>(
        GET_RECIPE_RECOMMENDATIONS,
        { householdId },
      );
      if (data?.getRecommendations && data.getRecommendations.length > 0) {
        setRecipes(data.getRecommendations);
      }
    } catch (e) {
      // Use fallback
    }
  }, [householdId]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const filtered = recipes.filter((r) => {
    if (activeFilter === 'foryou') return true;
    return r.tags?.includes(activeFilter);
  });

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Header === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
                For your fridge
              </Text>
              <Text
                fontSize={28}
                fontWeight="800"
                color={C['text/primary']}
                letterSpacing={-0.8}
                marginTop={2}
              >
                Recipes
              </Text>
            </YStack>
            <Pressable
              onPress={loadRecipes}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/raised'],
                borderWidth: 1,
                borderColor: C['border/subtle'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={18}>↻</Text>
            </Pressable>
          </XStack>
        </View>

        {/* === Filter Chips === */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
          style={{ marginBottom: 16 }}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setActiveFilter(f.key)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 9999,
                backgroundColor: activeFilter === f.key ? C['brand/primary'] : C['surface/raised'],
                borderWidth: 1,
                borderColor: activeFilter === f.key ? C['brand/primary'] : C['border/subtle'],
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text fontSize={14}>{f.icon}</Text>
              <Text
                fontSize={13}
                fontWeight="600"
                color={activeFilter === f.key ? 'white' : C['text/primary']}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* === Recipe Grid === */}
        <View style={{ paddingHorizontal: 22 }}>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {filtered.map((recipe, idx) => (
              <Pressable
                key={recipe.id}
                onPress={() => router.push(`/recipes/${recipe.id}` as any)}
                style={{
                  width: '48.5%',
                  backgroundColor: C['surface/raised'],
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  overflow: 'hidden',
                }}
              >
                {/* Image area */}
                <View
                  style={{
                    height: 120,
                    backgroundColor:
                      idx % 4 === 0
                        ? C['accent/coralSoft']
                        : idx % 4 === 1
                          ? C['accent/honeySoft']
                          : idx % 4 === 2
                            ? C['accent/skySoft']
                            : C['accent/plumSoft'],
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <Text fontSize={56}>{recipe.emoji || '🍳'}</Text>
                  {/* Match badge */}
                  {recipe.matchPercent && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(15,26,17,0.85)',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 9999,
                      }}
                    >
                      <Text fontSize={10} fontWeight="700" color="white">
                        ⭐ {recipe.matchPercent}%
                      </Text>
                    </View>
                  )}
                </View>
                {/* Info */}
                <View style={{ padding: 12 }}>
                  <Text
                    fontSize={14}
                    fontWeight="700"
                    color={C['text/primary']}
                    letterSpacing={-0.1}
                    numberOfLines={2}
                  >
                    {recipe.title}
                  </Text>
                  <XStack gap={6} alignItems="center" marginTop={6}>
                    <Text fontSize={11} color={C['text/secondary']}>
                      ⏱ {recipe.cookTimeMinutes}m
                    </Text>
                    <Text fontSize={11} color={C['text/tertiary']}>
                      ·
                    </Text>
                    <Text fontSize={11} color={C['text/secondary']}>
                      🍽 {recipe.servings}
                    </Text>
                  </XStack>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
