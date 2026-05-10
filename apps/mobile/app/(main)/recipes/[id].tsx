import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

interface Ingredient {
  emoji: string;
  name: string;
  quantity: string;
  inFridge?: boolean;
}

interface RecipeDetail {
  id: string;
  title: string;
  emoji: string;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  matchPercent: number;
  calories: number;
  ingredients: Ingredient[];
  instructions: string[];
}

// Fallback recipe data
const FALLBACK_RECIPE: RecipeDetail = {
  id: '1',
  title: 'Garlic Spinach Pasta',
  emoji: '🍝',
  cookTimeMinutes: 25,
  servings: 4,
  difficulty: 'Easy',
  matchPercent: 92,
  calories: 320,
  ingredients: [
    { emoji: '🥬', name: 'Spinach', quantity: '2 cups', inFridge: true },
    { emoji: '🍝', name: 'Pasta', quantity: '8 oz' },
    { emoji: '🧄', name: 'Garlic', quantity: '3 cloves', inFridge: true },
    { emoji: '🧀', name: 'Parmesan', quantity: '½ cup' },
  ],
  instructions: [
    'Boil pasta in well-salted water until al dente, about 8-10 minutes.',
    'Sauté minced garlic in olive oil over medium heat until fragrant, about 30 seconds.',
    'Add spinach and cook until wilted, about 2 minutes. Season with salt and pepper.',
    'Drain pasta and toss with the spinach mixture. Top with parmesan and serve immediately.',
  ],
};

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);

  // TODO: Load recipe data from database/API based on id
  const recipe = FALLBACK_RECIPE;

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: C['surface/base'] }}
      entering={FadeInUp.duration(300)}
      exiting={FadeOutDown.duration(200)}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* === Hero Section === */}
        <View
          style={{
            height: 280,
            backgroundColor: C['accent/honeySoft'],
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            paddingTop: insets.top,
          }}
        >
          {/* Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: R.lg,
              backgroundColor: 'rgba(255,255,255,0.85)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text fontSize={20}>←</Text>
          </Pressable>

          {/* Action Buttons (Heart, Share) */}
          <XStack
            style={{
              position: 'absolute',
              top: insets.top + 12,
              right: 16,
              gap: 8,
              zIndex: 10,
            }}
          >
            <Pressable
              onPress={() => setIsFavorite(!isFavorite)}
              style={{
                width: 40,
                height: 40,
                borderRadius: R.lg,
                backgroundColor: 'rgba(255,255,255,0.85)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={18}>{isFavorite ? '♥' : '♡'}</Text>
            </Pressable>
            <Pressable
              style={{
                width: 40,
                height: 40,
                borderRadius: R.lg,
                backgroundColor: 'rgba(255,255,255,0.85)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={18}>↗</Text>
            </Pressable>
          </XStack>

          {/* Recipe Emoji */}
          <Text fontSize={120} lineHeight={120}>
            {recipe.emoji}
          </Text>

          {/* Match Badge - centered */}
          <View
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: [{ translateX: -60 }],
              backgroundColor: 'rgba(255,255,255,0.95)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: R.full,
            }}
          >
            <Text fontSize={12} fontWeight="800" color={C['brand/primary']} letterSpacing={0.5}>
              ⭐ {recipe.matchPercent}% match
            </Text>
          </View>
        </View>

        {/* === Body Content === */}
        <View
          style={{ paddingHorizontal: 22, paddingVertical: 24, paddingBottom: insets.bottom + 100 }}
        >
          {/* Title */}
          <Text
            fontSize={36}
            fontWeight="800"
            color={C['text/primary']}
            letterSpacing={-1.2}
            marginBottom={8}
            fontFamily="Fraunces"
          >
            {recipe.title}
          </Text>

          {/* Meta Info */}
          <Text fontSize={14} color={C['text/secondary']} marginBottom={24}>
            ⏱ {recipe.cookTimeMinutes} min · 🍽 {recipe.servings} servings · 👨‍🍳 {recipe.difficulty}
          </Text>

          {/* Stats Grid (3 columns) */}
          <XStack gap={10} marginBottom={24}>
            {[
              { label: 'min total', value: recipe.cookTimeMinutes.toString() },
              { label: 'servings', value: recipe.servings.toString() },
              { label: 'cal', value: recipe.calories.toString() },
            ].map((stat, idx) => (
              <View
                key={idx}
                style={{
                  flex: 1,
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.md,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  alignItems: 'center',
                }}
              >
                <Text
                  fontSize={24}
                  fontWeight="800"
                  fontFamily="Fraunces"
                  color={C['text/primary']}
                  letterSpacing={-0.8}
                >
                  {stat.value}
                </Text>
                <Text fontSize={11} color={C['text/secondary']} marginTop={2}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </XStack>

          {/* Ingredients Section */}
          <Text
            fontSize={18}
            fontWeight="800"
            fontFamily="Fraunces"
            color={C['text/primary']}
            letterSpacing={-0.4}
            marginBottom={14}
          >
            Ingredients
          </Text>

          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            {recipe.ingredients.map((ingredient, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderBottomWidth: idx < recipe.ingredients.length - 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <XStack alignItems="center" gap={10} flex={1}>
                  <Text fontSize={22}>{ingredient.emoji}</Text>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                      {ingredient.name}
                    </Text>
                    {ingredient.inFridge && (
                      <Text fontSize={11} fontWeight="700" color={C['status/fresh']} marginTop={2}>
                        ✓ in your fridge
                      </Text>
                    )}
                  </YStack>
                </XStack>
                <Text fontSize={14} color={C['text/secondary']} fontWeight="600">
                  {ingredient.quantity}
                </Text>
              </View>
            ))}
          </View>

          {/* Instructions Section */}
          <Text
            fontSize={18}
            fontWeight="800"
            fontFamily="Fraunces"
            color={C['text/primary']}
            letterSpacing={-0.4}
            marginBottom={14}
          >
            Instructions
          </Text>

          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              overflow: 'hidden',
              marginBottom: 24,
            }}
          >
            {recipe.instructions.map((instruction, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  gap: 14,
                  padding: 16,
                  borderBottomWidth: idx < recipe.instructions.length - 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: R.md,
                    backgroundColor: C['brand/soft'],
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 2,
                  }}
                >
                  <Text fontSize={14} fontWeight="800" color={C['brand/primary']}>
                    {idx + 1}
                  </Text>
                </View>
                <Text
                  fontSize={14}
                  color={C['text/secondary']}
                  lineHeight={20}
                  flex={1}
                  marginTop={4}
                >
                  {instruction}
                </Text>
              </View>
            ))}
          </View>

          {/* Start Cooking Button */}
          <Pressable
            style={{
              backgroundColor: C['brand/primary'],
              borderRadius: R.md,
              padding: 18,
              alignItems: 'center',
              shadowColor: C['brand/primary'],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text fontSize={16} fontWeight="700" color="white">
              ▶ Start Cooking
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
