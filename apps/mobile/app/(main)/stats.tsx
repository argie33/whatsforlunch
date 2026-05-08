import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { Text, YStack, XStack, Card, Progress } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingDown, Leaf, Zap, Award } from 'lucide-react-native';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { statsService, type StatsOverview, type WeeklyStats } from '@/services';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function StatsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { householdId } = useAuthIds();
  const db = useDatabase();

  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!householdId) return;

    try {
      setLoading(true);
      const data = await statsService.getStatsOverview(db, householdId);
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [householdId, db]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <Text fontSize={24} fontWeight="bold">
            {t('stats.screenTitle', 'Stats & Insights')}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text fontSize={16} color="$text/secondary">
            {t('common.loading')}
          </Text>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 12 }}>
          <Text fontSize={24} fontWeight="bold">
            {t('stats.screenTitle', 'Stats & Insights')}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text fontSize={16} color="$text/secondary">
            {t('stats.noData', 'No data yet. Add items to see stats.')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingTop: insets.top + 12,
          borderBottomWidth: 1,
          borderBottomColor: C['border/subtle'],
          backgroundColor: C['surface/raised'],
        }}
      >
        <Text fontSize={28} fontWeight="bold" fontFamily="Fraunces" letterSpacing={-0.8}>
          {t('stats.screenTitle', 'Stats & Insights')}
        </Text>
        <Text fontSize={14} color="$text/secondary" marginTop={4}>
          {t('stats.subtitle', 'Track your food waste and savings')}
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadStats();
            }}
          />
        }
      >
        <YStack padding="$4" gap="$4">
          {/* Key Metrics Grid */}
          <YStack gap="$3">
            {/* Row 1: Money Saved & Items Eaten */}
            <XStack gap="$3" flex={1}>
              <Card
                flex={1}
                padding="$4"
                backgroundColor={C['status/freshBg']}
                borderColor={C['status/fresh']}
                borderWidth={1}
              >
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Leaf size={20} color={C['status/fresh']} />
                    <Text fontSize={12} fontWeight="600" color={C['status/fresh']}>
                      {t('stats.moneySaved', 'Money Saved')}
                    </Text>
                  </XStack>
                  <Text fontSize={24} fontWeight="bold" fontFamily="Fraunces" color={C['status/fresh']} letterSpacing={-0.6}>
                    {formatCurrency(stats.totalValueSaved)}
                  </Text>
                  <Text fontSize={12} color="#166534">
                    {stats.totalItemsEaten}{' '}
                    {t('stats.itemsEaten', 'items eaten')}
                  </Text>
                </YStack>
              </Card>

              <Card
                flex={1}
                padding="$4"
                backgroundColor={C['status/urgentBg']}
                borderColor={C['status/urgent']}
                borderWidth={1}
              >
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <TrendingDown size={20} color={C['status/urgent']} />
                    <Text fontSize={12} fontWeight="600" color={C['status/urgent']}>
                      {t('stats.wasted', 'Wasted')}
                    </Text>
                  </XStack>
                  <Text fontSize={24} fontWeight="bold" fontFamily="Fraunces" color={C['status/urgent']} letterSpacing={-0.6}>
                    {formatCurrency(stats.totalValueTossed)}
                  </Text>
                  <Text fontSize={12} color="#991b1b">
                    {stats.totalItemsTossed}{' '}
                    {t('stats.itemsTossed', 'items tossed')}
                  </Text>
                </YStack>
              </Card>
            </XStack>

            {/* Row 2: Waste Rate & Streak */}
            <XStack gap="$3" flex={1}>
              <Card
                flex={1}
                padding="$4"
                backgroundColor={C['accent/honeySoft']}
                borderColor={C['accent/honey']}
                borderWidth={1}
              >
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Zap size={20} color={C['accent/honey']} />
                    <Text fontSize={12} fontWeight="600" color={C['accent/honey']}>
                      {t('stats.wasteRate', 'Waste Rate')}
                    </Text>
                  </XStack>
                  <Text fontSize={24} fontWeight="bold" fontFamily="Fraunces" color={C['accent/honey']} letterSpacing={-0.6}>
                    {stats.allTimeWasteRate}%
                  </Text>
                  <Progress
                    value={stats.allTimeWasteRate}
                    max={100}
                    style={{ height: 4 }}
                  />
                </YStack>
              </Card>

              <Card
                flex={1}
                padding="$4"
                backgroundColor={C['accent/plumSoft']}
                borderColor={C['accent/plum']}
                borderWidth={1}
              >
                <YStack gap="$2">
                  <XStack alignItems="center" gap="$2">
                    <Award size={20} color={C['accent/plum']} />
                    <Text fontSize={12} fontWeight="600" color={C['accent/plum']}>
                      {t('stats.wasteStreak', 'Zero Waste')}
                    </Text>
                  </XStack>
                  <Text fontSize={24} fontWeight="bold" fontFamily="Fraunces" color={C['accent/plum']} letterSpacing={-0.6}>
                    {stats.wasteStreaks} {t('stats.weeks', 'weeks')}
                  </Text>
                  <Text fontSize={12} color="#6b21a8">
                    {t('stats.consecutive', 'consecutive')}
                  </Text>
                </YStack>
              </Card>
            </XStack>
          </YStack>

          {/* Current Week */}
          <Card padding="$4" backgroundColor={C['surface/raised']}>
            <YStack gap="$3">
              <Text fontSize={16} fontWeight="bold" fontFamily="Fraunces" letterSpacing={-0.3}>
                {t('stats.thisWeek', 'This Week')}
              </Text>
              <XStack justifyContent="space-between">
                <YStack>
                  <Text fontSize={12} color="$text/secondary">
                    {t('stats.itemsTossed', 'Items Tossed')}
                  </Text>
                  <Text fontSize={20} fontWeight="bold">
                    {stats.currentWeekWaste.itemsTossed}
                  </Text>
                </YStack>
                <YStack alignItems="flex-end">
                  <Text fontSize={12} color="$text/secondary">
                    {t('stats.valueLost', 'Value Lost')}
                  </Text>
                  <Text fontSize={20} fontWeight="bold" color="$red10">
                    {formatCurrency(stats.currentWeekWaste.valueTossed)}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </Card>

          {/* Last Week */}
          <Card padding="$4" backgroundColor={C['surface/raised']}>
            <YStack gap="$3">
              <Text fontSize={16} fontWeight="bold" fontFamily="Fraunces" letterSpacing={-0.3}>
                {t('stats.lastWeek', 'Last Week')}
              </Text>
              <XStack justifyContent="space-between">
                <YStack>
                  <Text fontSize={12} color="$text/secondary">
                    {t('stats.itemsTossed', 'Items Tossed')}
                  </Text>
                  <Text fontSize={20} fontWeight="bold">
                    {stats.lastWeekWaste.itemsTossed}
                  </Text>
                </YStack>
                <YStack alignItems="flex-end">
                  <Text fontSize={12} color="$text/secondary">
                    {t('stats.valueLost', 'Value Lost')}
                  </Text>
                  <Text fontSize={20} fontWeight="bold" color="$red10">
                    {formatCurrency(stats.lastWeekWaste.valueTossed)}
                  </Text>
                </YStack>
              </XStack>
              {stats.currentWeekWaste.valueTossed < stats.lastWeekWaste.valueTossed && (
                <Text fontSize={12} color="$green10">
                  ↓ {t('stats.improvement', 'Better than last week!')}
                </Text>
              )}
              {stats.currentWeekWaste.valueTossed > stats.lastWeekWaste.valueTossed && (
                <Text fontSize={12} color="$red10">
                  ↑ {t('stats.worse', 'More waste than last week')}
                </Text>
              )}
            </YStack>
          </Card>

          {/* Weekly History */}
          <YStack gap="$3">
            <Text fontSize={16} fontWeight="bold" fontFamily="Fraunces" paddingHorizontal="$2" letterSpacing={-0.3}>
              {t('stats.last12Weeks', 'Last 12 Weeks')}
            </Text>
            {stats.weeklyHistory.map((week, idx) => (
              <Card key={idx} padding="$3" backgroundColor={C['surface/raised']}>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack>
                    <Text fontSize={12} color="$text/secondary">
                      {week.week}
                    </Text>
                    <Text fontSize={14} fontWeight="600">
                      {week.itemsTossed} {t('stats.items', 'items')}
                    </Text>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text fontSize={12} color="$text/secondary">
                      {formatCurrency(week.valueTossed)}
                    </Text>
                    {week.itemsTossed === 0 && (
                      <Text fontSize={12} color="$green10" fontWeight="600">
                        ✓ {t('stats.noWaste', 'No waste')}
                      </Text>
                    )}
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        </YStack>

        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C['surface/base'],
  },
  scrollView: {
    flex: 1,
  },
});
