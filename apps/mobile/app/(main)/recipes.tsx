import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { GET_RECIPE_RECOMMENDATIONS } from '@/db/graphql';
import { executeGraphQL } from '@/lib/graphql-client';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const RECIPE_GRADIENTS = [
  { start: '#FCEFD3', end: '#FDF1D9', name: 'warm' },
  { start: '#E6F2EC', end: '#E3F0FB', name: 'cool' },
  { start: '#FFE5DD', end: '#FCEFD3', name: 'spice' },
  { start: '#E6F2EC', end: '#D4F1DD', name: 'veggie' },
  { start: '#FCE4EC', end: '#FCD0E5', name: 'berry' },
];

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
        {/* === Header (Topbar) === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
          <YStack>
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              For your fridge
            </Text>
            <XStack justifyContent="space-between" alignItems="center" marginTop={4}>
              <Text
                fontSize={28}
                fontWeight="800"
                color={C['text/primary']}
                letterSpacing={-0.8}
                flex={1}
                fontFamily="Fraunces"
              >
                Recipes
              </Text>
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
          </YStack>
        </View>

        {/* === Filter Chips === */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 8, paddingVertical: 4 }}
          style={{ marginBottom: 12 }}
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
                borderWidth: 1.5,
                borderColor: activeFilter === f.key ? C['brand/primary'] : C['border/subtle'],
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                shadowColor: activeFilter === f.key ? C['brand/primary'] : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: activeFilter === f.key ? 0.25 : 0,
                shadowRadius: activeFilter === f.key ? 10 : 0,
                elevation: activeFilter === f.key ? 4 : 0,
              }}
            >
              <Text fontSize={14}>{f.icon}</Text>
              <Text
                fontSize={13}
                fontWeight="700"
                color={activeFilter === f.key ? 'white' : C['text/secondary']}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* === Recipe Grid === */}
        <View style={{ paddingHorizontal: 22, gap: 14 }}>
          {filtered.map((recipe, idx) => {
            const gradient = RECIPE_GRADIENTS[idx % RECIPE_GRADIENTS.length];
            return (
              <Pressable
                key={recipe.id}
                onPress={() => router.push(`/recipes/${recipe.id}` as any)}
                style={({ pressed }) => ({
                  backgroundColor: C['surface/raised'],
                  borderRadius: 32,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  overflow: 'hidden',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 2,
                  elevation: 1,
                  transform: pressed ? [{ scale: 0.98 }] : [],
                })}
              >
                {/* Image area with gradient */}
                <View
                  style={{
                    height: 160,
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                  }}
                >
                  <LinearGradient
                    colors={[gradient.start, gradient.end]}
                    start={{ x: 0.1, y: 0.1 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text fontSize={80}>{recipe.emoji || '🍳'}</Text>

                  {/* Cuisine tag (top-left) */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      backgroundColor: 'rgba(15,26,17,0.85)',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 9999,
                    }}
                  >
                    <Text fontSize={11} fontWeight="700" color="white" letterSpacing={0.3}>
                      {recipe.cuisine.toUpperCase()}
                    </Text>
                  </View>

                  {/* Match badge (top-right) */}
                  {recipe.matchPercent && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 14,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 9999,
                      }}
                    >
                      <Text fontSize={12} fontWeight="800" color={C['brand/primary']}>
                        ⭐ {recipe.matchPercent}%
                      </Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={{ padding: 16 }}>
                  <Text
                    fontSize={19}
                    fontWeight="700"
                    fontFamily="Fraunces"
                    color={C['text/primary']}
                    letterSpacing={-0.3}
                    numberOfLines={2}
                  >
                    {recipe.title}
                  </Text>
                  <XStack gap={14} alignItems="center" marginTop={6}>
                    <Text fontSize={13} color={C['text/secondary']}>
                      ⏱ {recipe.cookTimeMinutes}m
                    </Text>
                    <Text fontSize={13} color={C['text/secondary']}>
                      🍽 {recipe.servings}
                    </Text>
                  </XStack>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
