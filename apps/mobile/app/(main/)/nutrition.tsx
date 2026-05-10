import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { Chip } from '@/components/ui/Chip';

const C = lightTheme;

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

const MOCK_MEALS: Meal[] = [
  {
    id: '1',
    name: 'Breakfast: Yogurt & granola',
    calories: 350,
    protein: 15,
    carbs: 45,
    fat: 8,
    time: '8:30 AM',
  },
  {
    id: '2',
    name: 'Lunch: Chicken salad',
    calories: 520,
    protein: 35,
    carbs: 30,
    fat: 18,
    time: '12:45 PM',
  },
  {
    id: '3',
    name: 'Snack: Apple & almond butter',
    calories: 280,
    protein: 8,
    carbs: 32,
    fat: 10,
    time: '3:00 PM',
  },
];

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [meals, setMeals] = useState<Meal[]>(MOCK_MEALS);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // TODO: Wire to nutritionService.getMeals(db, householdId, period)

  const dailyGoals = { calories: 2000, protein: 150, carbs: 200, fat: 65 };
  const totals = useMemo(() => {
    return meals.reduce(
      (sum, meal) => ({
        calories: sum.calories + meal.calories,
        protein: sum.protein + meal.protein,
        carbs: sum.carbs + meal.carbs,
        fat: sum.fat + meal.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [meals]);

  const getProgress = (actual: number, goal: number) => Math.min(100, (actual / goal) * 100);

  const MacroRing = ({
    label,
    actual,
    goal,
    unit,
    color,
  }: {
    label: string;
    actual: number;
    goal: number;
    unit: string;
    color: string;
  }) => {
    const progress = getProgress(actual, goal);
    return (
      <YStack alignItems="center" gap={6}>
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: C['surface/sunken'],
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backgroundColor: color,
              opacity: 0.2,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: 35,
              borderWidth: 3,
              borderColor: color,
              borderRightColor: C['surface/sunken'],
              borderBottomColor: C['surface/sunken'],
              transform: [{ rotate: `${(progress / 100) * 360}deg` }],
            }}
          />
          <YStack alignItems="center" gap={2}>
            <Text fontSize={14} fontWeight="800" color={C['text/primary']}>
              {actual}
            </Text>
            <Text fontSize={9} color={C['text/secondary']}>
              {unit}
            </Text>
          </YStack>
        </View>
        <YStack alignItems="center" gap={2}>
          <Text fontSize={11} fontWeight="700" color={C['text/primary']}>
            {label}
          </Text>
          <Text fontSize={9} color={C['text/secondary']}>
            of {goal} {unit}
          </Text>
        </YStack>
      </YStack>
    );
  };

  const ProgressBar = ({
    label,
    actual,
    goal,
    unit,
    color,
  }: {
    label: string;
    actual: number;
    goal: number;
    unit: string;
    color: string;
  }) => {
    const progress = getProgress(actual, goal);
    return (
      <YStack gap={6} marginBottom={12}>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={12} fontWeight="700" color={C['text/primary']}>
            {label}
          </Text>
          <Text fontSize={12} fontWeight="700" color={color}>
            {actual}/{goal} {unit}
          </Text>
        </XStack>
        <View
          style={{
            height: 8,
            backgroundColor: C['surface/sunken'],
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${progress}%`,
              backgroundColor: color,
            }}
          />
        </View>
      </YStack>
    );
  };

  return (
    <>
      <Animated.View
        style={{ flex: 1, backgroundColor: C['surface/base'] }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* === Header === */}
          <YStack marginBottom={24}>
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              NUTRITION
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              Daily Intake
            </Text>
          </YStack>

          {/* === Period Filter === */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ marginBottom: 24 }}
          >
            {[
              { key: 'today' as const, label: 'Today' },
              { key: 'week' as const, label: 'Week' },
              { key: 'month' as const, label: 'Month' },
            ].map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                active={period === p.key}
                onPress={() => setPeriod(p.key)}
              />
            ))}
          </ScrollView>

          {/* === Calorie Ring === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 24,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: C['surface/sunken'],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  backgroundColor: C['brand/primary'],
                  opacity: 0.1,
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: 80,
                  borderWidth: 6,
                  borderColor: C['brand/primary'],
                  borderRightColor: C['surface/sunken'],
                  borderBottomColor: C['surface/sunken'],
                  transform: [
                    {
                      rotate: `${(getProgress(totals.calories, dailyGoals.calories) / 100) * 360}deg`,
                    },
                  ],
                }}
              />
              <YStack alignItems="center" gap={4}>
                <Text
                  fontSize={32}
                  fontWeight="800"
                  color={C['text/primary']}
                  fontFamily="Fraunces"
                >
                  {totals.calories}
                </Text>
                <Text fontSize={11} color={C['text/secondary']}>
                  / {dailyGoals.calories} kcal
                </Text>
              </YStack>
            </View>

            <Text fontSize={13} color={C['text/secondary']} textAlign="center">
              {dailyGoals.calories - totals.calories > 0
                ? `${dailyGoals.calories - totals.calories} calories left`
                : 'Daily goal reached!'}
            </Text>
          </View>

          {/* === Macro Grid === */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              marginBottom: 28,
            }}
          >
            <MacroRing
              label="Protein"
              actual={totals.protein}
              goal={dailyGoals.protein}
              unit="g"
              color={C['accent/coral']}
            />
            <MacroRing
              label="Carbs"
              actual={totals.carbs}
              goal={dailyGoals.carbs}
              unit="g"
              color={C['accent/honey']}
            />
            <MacroRing
              label="Fat"
              actual={totals.fat}
              goal={dailyGoals.fat}
              unit="g"
              color={C['brand/primary']}
            />
          </View>

          {/* === Progress Bars === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              marginBottom: 24,
            }}
          >
            <ProgressBar
              label="Protein"
              actual={totals.protein}
              goal={dailyGoals.protein}
              unit="g"
              color={C['accent/coral']}
            />
            <ProgressBar
              label="Carbs"
              actual={totals.carbs}
              goal={dailyGoals.carbs}
              unit="g"
              color={C['accent/honey']}
            />
            <ProgressBar
              label="Fat"
              actual={totals.fat}
              goal={dailyGoals.fat}
              unit="g"
              color={C['brand/primary']}
            />
          </View>

          {/* === Meals Log === */}
          <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
            📋 Meals Today
          </Text>
          <YStack gap={10}>
            {meals.map((meal) => (
              <View
                key={meal.id}
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.md,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                }}
              >
                <XStack justifyContent="space-between" alignItems="flex-start" marginBottom={8}>
                  <YStack flex={1} gap={2}>
                    <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                      {meal.name}
                    </Text>
                    <Text fontSize={11} color={C['text/secondary']}>
                      {meal.time}
                    </Text>
                  </YStack>
                  <Text fontSize={12} fontWeight="700" color={C['brand/primary']}>
                    {meal.calories} kcal
                  </Text>
                </XStack>

                <XStack justifyContent="space-around">
                  {[
                    { label: 'P', value: meal.protein },
                    { label: 'C', value: meal.carbs },
                    { label: 'F', value: meal.fat },
                  ].map((macro, idx) => (
                    <YStack key={idx} alignItems="center" gap={2}>
                      <Text fontSize={9} fontWeight="700" color={C['text/secondary']}>
                        {macro.label}
                      </Text>
                      <Text fontSize={11} fontWeight="700" color={C['text/primary']}>
                        {macro.value}g
                      </Text>
                    </YStack>
                  ))}
                </XStack>
              </View>
            ))}
          </YStack>
        </ScrollView>
      </Animated.View>
    </>
  );
}
