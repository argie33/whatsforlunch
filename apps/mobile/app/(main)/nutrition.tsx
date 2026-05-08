import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Text, YStack, XStack, Card, Progress } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { nutritionService, DailyIntake } from '@/services';
import { useAuthIds } from '@/features/auth';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const DAILY_GOAL = 2000; // calories
const PROTEIN_GOAL = 50; // grams
const CARBS_GOAL = 300; // grams
const FAT_GOAL = 65; // grams

export default function NutritionScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId } = useAuthIds();

  const [todayIntake, setTodayIntake] = useState<DailyIntake | null>(null);
  const [weeklyIntake, setWeeklyIntake] = useState<DailyIntake[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNutrition = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const today = new Date();
      const dailyIntake = await nutritionService.getDailyIntake(db, householdId, today);
      const weekly = await nutritionService.getWeeklyMacros(db, householdId);
      setTodayIntake(dailyIntake);
      setWeeklyIntake(weekly);
    } catch (err) {
      console.error('[Nutrition] Load failed:', err);
      Alert.alert(t('common.error'), t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [db, householdId, t]);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  const getPercentage = (actual: number, goal: number): number => {
    return Math.min(100, (actual / goal) * 100);
  };

  if (!todayIntake) {
    return (
      <View style={styles.container}>
        <Text color="$gray11" textAlign="center" marginTop="$8">
          {loading ? t('common.loading') : t('nutrition.noData')}
        </Text>
      </View>
    );
  }

  const caloriePercent = getPercentage(todayIntake.macros.calories, DAILY_GOAL);
  const proteinPercent = getPercentage(todayIntake.macros.protein, PROTEIN_GOAL);
  const carbsPercent = getPercentage(todayIntake.macros.carbs, CARBS_GOAL);
  const fatPercent = getPercentage(todayIntake.macros.fat, FAT_GOAL);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadNutrition} />}
    >
      <YStack padding="$4" gap="$4">
        {/* Today's Calories */}
        <Card padding="$4" backgroundColor={C['status/freshBg']}>
          <YStack gap="$3">
            <Text fontSize={14} fontWeight="600" color="$text/secondary" letterSpacing={0.3}>
              {t('nutrition.todayCalories')}
            </Text>
            <Text fontSize={32} fontWeight="700" fontFamily="Fraunces" letterSpacing={-0.8}>
              {Math.round(todayIntake.macros.calories)}
            </Text>
            <Text fontSize={12} color="$text/secondary">
              {t('nutrition.calorieGoal', {
                consumed: Math.round(todayIntake.macros.calories),
                goal: DAILY_GOAL,
              })}
            </Text>
            <Progress value={caloriePercent} size="large" backgroundColor="$gray3" />
          </YStack>
        </Card>

        {/* Macros */}
        <YStack gap="$2">
          <Text fontSize={14} fontWeight="600" fontFamily="Fraunces" letterSpacing={-0.3}>
            {t('nutrition.macros')}
          </Text>

          {/* Protein */}
          <Card padding="$3" backgroundColor="$gray1">
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <YStack flex={1}>
                <Text fontSize={12} color="$text/secondary">
                  {t('nutrition.protein')}
                </Text>
                <Text fontSize={16} fontWeight="600">
                  {Math.round(todayIntake.macros.protein)}g / {PROTEIN_GOAL}g
                </Text>
              </YStack>
              <Progress value={proteinPercent} width={80} size="small" backgroundColor="$gray3" />
            </XStack>
          </Card>

          {/* Carbs */}
          <Card padding="$3" backgroundColor="$gray1">
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <YStack flex={1}>
                <Text fontSize={12} color="$text/secondary">
                  {t('nutrition.carbs')}
                </Text>
                <Text fontSize={16} fontWeight="600">
                  {Math.round(todayIntake.macros.carbs)}g / {CARBS_GOAL}g
                </Text>
              </YStack>
              <Progress value={carbsPercent} width={80} size="small" backgroundColor="$gray3" />
            </XStack>
          </Card>

          {/* Fat */}
          <Card padding="$3" backgroundColor="$gray1">
            <XStack justifyContent="space-between" alignItems="center" gap="$3">
              <YStack flex={1}>
                <Text fontSize={12} color="$text/secondary">
                  {t('nutrition.fat')}
                </Text>
                <Text fontSize={16} fontWeight="600">
                  {Math.round(todayIntake.macros.fat)}g / {FAT_GOAL}g
                </Text>
              </YStack>
              <Progress value={fatPercent} width={80} size="small" backgroundColor="$gray3" />
            </XStack>
          </Card>
        </YStack>

        {/* Weekly History */}
        <YStack gap="$2">
          <Text fontSize={14} fontWeight="600" fontFamily="Fraunces" letterSpacing={-0.3}>
            {t('nutrition.weekly')}
          </Text>
          <XStack gap="$2" justifyContent="space-between">
            {weeklyIntake.map((day) => (
              <YStack key={day.date} alignItems="center" gap="$1" flex={1}>
                <Progress
                  value={getPercentage(day.macros.calories, DAILY_GOAL)}
                  size="small"
                  backgroundColor="$gray3"
                  width="100%"
                  height={100}
                />
                <Text fontSize={10} color="$text/secondary">
                  {new Date(day.date)
                    .toLocaleDateString('en-US', { weekday: 'short' })
                    .substring(0, 1)}
                </Text>
                <Text fontSize={9} color="$text/secondary">
                  {Math.round(day.macros.calories)}
                </Text>
              </YStack>
            ))}
          </XStack>
        </YStack>

        {/* Disclaimer */}
        <Card padding="$3" backgroundColor="$yellow2">
          <Text fontSize={12} color="$text/secondary" textAlign="center">
            ⚠️ {t('nutrition.disclaimer')}
          </Text>
        </Card>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C['surface/base'],
  },
});
