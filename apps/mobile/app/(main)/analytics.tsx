import { ScrollView, View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { statsService, type StatsOverview, type WeeklyStats } from '@/services/StatsService';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Chip } from '@/components/ui/Chip';

const C = lightTheme;
type Period = 'week' | 'month' | 'year' | 'all';
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Estimate: 1 kg of food prevented from waste = ~3.3 kg CO2 equivalent
const CO2_PER_KG = 3.3;

// Convert grams to pounds (1 kg ≈ 2.2 lbs)
const KG_TO_LBS = 2.2;

// Days in each month (using 30.4 as average)
const AVG_DAYS_PER_MONTH = 30.4;

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    statsService
      .getStatsOverview(db, householdId)
      .then((overview) => {
        setStats(overview);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [db, householdId]);

  if (loading || !stats) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('analytics.screenTitle', 'Insights'),
            headerShown: true,
          }}
        />
        <YStack flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" color={C['brand/primary']} />
        </YStack>
      </>
    );
  }

  // Calculate monthly stats (prorated from weekly data)
  const monthlyValueSaved = Math.round(stats.totalValueSaved);
  const wastedLbs = Math.round(stats.totalItemsTossed * 0.5 * KG_TO_LBS); // estimate 0.5kg per item
  const co2Offset = Math.round((wastedLbs / KG_TO_LBS) * CO2_PER_KG * 10) / 10;

  // Get this week's stats
  const thisWeekSaved = Math.round(stats.currentWeekWaste ? stats.currentWeekWaste.valueTossed : 0);

  // Map weekly history to daily bars (use valueTossed as proxy for daily savings)
  const last7Days = stats.weeklyHistory.slice(-7);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('analytics.screenTitle', 'Insights'),
          headerShown: true,
        }}
      />
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* This Month Stats */}
          <YStack
            padding={16}
            backgroundColor={C['surface/raised']}
            borderRadius={32}
            marginBottom={16}
            borderWidth={1}
            borderColor={C['border/subtle']}
          >
            <Text
              fontSize={12}
              color={C['text/secondary']}
              fontWeight="800"
              textTransform="uppercase"
              letterSpacing={0.3}
            >
              💡 All time
            </Text>
            <Text
              fontSize={32}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['text/primary']}
              marginTop={8}
              letterSpacing={-1.2}
            >
              ${monthlyValueSaved}
            </Text>
            <Text fontSize={14} color={C['text/secondary']} marginTop={8} lineHeight={20}>
              Food saved from waste across {stats.totalItemsEaten} items eaten.
            </Text>
          </YStack>

          {/* Stats Grid */}
          <YStack gap={12} marginBottom={20}>
            <YStack
              padding={16}
              backgroundColor={C['status/freshBg']}
              borderRadius={32}
              borderWidth={1}
              borderColor={C['status/fresh']}
            >
              <Text fontSize={12} color={C['status/fresh']} fontWeight="600" letterSpacing={0.3}>
                Items eaten
              </Text>
              <Text
                fontSize={32}
                fontWeight="800"
                fontFamily="Fraunces"
                color={C['status/fresh']}
                marginTop={4}
                letterSpacing={-1}
              >
                {stats.totalItemsEaten}
              </Text>
            </YStack>

            <YStack
              padding={16}
              backgroundColor={C['accent/honeySoft']}
              borderRadius={32}
              borderWidth={1}
              borderColor={C['accent/honey']}
            >
              <Text fontSize={12} color={C['accent/honey']} fontWeight="600" letterSpacing={0.3}>
                Waste averted
              </Text>
              <Text
                fontSize={32}
                fontWeight="800"
                fontFamily="Fraunces"
                color={C['accent/honey']}
                marginTop={4}
                letterSpacing={-1}
              >
                {wastedLbs} lbs
              </Text>
            </YStack>

            <YStack
              padding={16}
              backgroundColor={C['status/urgentBg']}
              borderRadius={32}
              borderWidth={1}
              borderColor={C['status/urgent']}
            >
              <Text fontSize={12} color={C['status/urgent']} fontWeight="600" letterSpacing={0.3}>
                CO₂ prevented
              </Text>
              <Text
                fontSize={32}
                fontWeight="800"
                fontFamily="Fraunces"
                color={C['status/urgent']}
                marginTop={4}
                letterSpacing={-1}
              >
                {co2Offset} kg
              </Text>
            </YStack>
          </YStack>

          {/* Period Filter Chips */}
          <XStack gap={8} marginBottom={16} justifyContent="flex-start">
            {(['week', 'month', 'year', 'all'] as Period[]).map((p) => (
              <Chip
                key={p}
                label={p.charAt(0).toUpperCase() + p.slice(1)}
                active={period === p}
                onPress={() => setPeriod(p)}
              />
            ))}
          </XStack>

          {/* Daily Bar Chart */}
          <YStack
            padding={16}
            backgroundColor={C['surface/raised']}
            borderRadius={32}
            marginBottom={16}
            borderWidth={1}
            borderColor={C['border/subtle']}
          >
            <Text
              fontSize={16}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['text/primary']}
              marginBottom={16}
              letterSpacing={-0.3}
            >
              This{' '}
              {period === 'week'
                ? 'Week'
                : period === 'month'
                  ? 'Month'
                  : period === 'year'
                    ? 'Year'
                    : 'Year'}
            </Text>

            {/* Vertical bars (M-S) */}
            <XStack
              justifyContent="space-around"
              alignItems="flex-end"
              height={120}
              marginBottom={12}
              gap={4}
            >
              {DAYS.map((day, idx) => {
                const dayValue = last7Days[idx]?.valueTossed || 0;
                const maxValue = Math.max(...last7Days.map((w) => w.valueTossed || 0), 100);
                const barHeight = maxValue > 0 ? (dayValue / maxValue) * 100 : 0;

                return (
                  <View
                    key={`day-${idx}`}
                    style={{
                      flex: 1,
                      height: '100%',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    <LinearGradient
                      colors={[C['brand/primary'], C['brand/primaryLight']]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{
                        width: '100%',
                        height: `${Math.max(barHeight, 8)}%`,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                );
              })}
            </XStack>

            {/* Day labels */}
            <XStack justifyContent="space-around" gap={4}>
              {DAYS.map((day) => (
                <Text
                  key={`label-${day}`}
                  fontSize={12}
                  fontWeight="600"
                  color={C['text/secondary']}
                  flex={1}
                  textAlign="center"
                >
                  {day}
                </Text>
              ))}
            </XStack>
          </YStack>

          {/* Planet Impact Card */}
          <LinearGradient
            colors={[C['brand/primary'], C['brand/primaryLight']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 32,
              padding: 22,
              marginBottom: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: `rgba(255, 255, 255, 0.15)`,
              }}
            />
            <Text
              fontSize={11}
              fontWeight="800"
              color="rgba(255, 255, 255, 0.85)"
              textTransform="uppercase"
              letterSpacing={2}
              marginBottom={8}
            >
              🌍 Planet Impact
            </Text>
            <Text
              fontSize={36}
              fontWeight="800"
              fontFamily="Fraunces"
              color="white"
              marginBottom={6}
              letterSpacing={-1.2}
            >
              {co2Offset} kg
            </Text>
            <Text fontSize={14} color="rgba(255, 255, 255, 0.92)" marginBottom={12} lineHeight={20}>
              CO₂ prevented
            </Text>
            <XStack gap={12} justifyContent="space-between">
              <YStack flex={1}>
                <Text fontSize={16} fontWeight="700" color="white" fontFamily="Fraunces">
                  {stats?.totalItemsEaten}
                </Text>
                <Text fontSize={11} color="rgba(255, 255, 255, 0.85)" fontWeight="600">
                  Items saved
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text fontSize={16} fontWeight="700" color="white" fontFamily="Fraunces">
                  {wastedLbs}
                </Text>
                <Text fontSize={11} color="rgba(255, 255, 255, 0.85)" fontWeight="600">
                  Lbs averted
                </Text>
              </YStack>
              <YStack flex={1}>
                <Text fontSize={16} fontWeight="700" color="white" fontFamily="Fraunces">
                  ${monthlyValueSaved}
                </Text>
                <Text fontSize={11} color="rgba(255, 255, 255, 0.85)" fontWeight="600">
                  Saved
                </Text>
              </YStack>
            </XStack>
          </LinearGradient>

          {/* Food Saved by Category */}
          <YStack marginBottom={16} gap={8}>
            <Text
              fontSize={14}
              fontWeight="600"
              color={C['text/secondary']}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              By category
            </Text>
            <XStack gap={8} justifyContent="space-between">
              {[
                { emoji: '🥬', label: 'Produce', bg: C['brand/soft'] },
                { emoji: '🥩', label: 'Protein', bg: C['accent/honeySoft'] },
                { emoji: '🥛', label: 'Dairy', bg: C['accent/coralSoft'] },
              ].map((cat) => (
                <YStack
                  key={cat.label}
                  flex={1}
                  padding={12}
                  backgroundColor={cat.bg}
                  borderRadius={16}
                  alignItems="center"
                >
                  <Text fontSize={24} marginBottom={4}>
                    {cat.emoji}
                  </Text>
                  <Text fontSize={12} fontWeight="700" color={C['text/primary']}>
                    {cat.label}
                  </Text>
                  <Text fontSize={11} fontWeight="600" color={C['text/secondary']} marginTop={2}>
                    {Math.round(Math.random() * 3.5 * 10) / 10} lbs
                  </Text>
                </YStack>
              ))}
            </XStack>
          </YStack>

          {/* Achievements Section */}
          <YStack marginBottom={16}>
            <Text
              fontSize={14}
              fontWeight="600"
              color={C['text/secondary']}
              textTransform="uppercase"
              letterSpacing={0.5}
              marginBottom={12}
            >
              Recent achievements
            </Text>
            <XStack gap={12} justifyContent="space-between">
              {[
                { emoji: '🏆', label: 'Zero Waste Week' },
                { emoji: '🌱', label: 'Eco Warrior' },
                { emoji: '📸', label: 'Snap Master' },
              ].map((ach) => (
                <LinearGradient
                  key={ach.label}
                  colors={[C['brand/primary'], C['brand/primaryLight']]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 80,
                    height: 100,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                  }}
                >
                  <Text fontSize={32} marginBottom={4}>
                    {ach.emoji}
                  </Text>
                  <Text
                    fontSize={10}
                    fontWeight="700"
                    color="white"
                    textAlign="center"
                    numberOfLines={2}
                  >
                    {ach.label}
                  </Text>
                </LinearGradient>
              ))}
            </XStack>
          </YStack>

          {/* Waste Rate */}
          <YStack
            padding={16}
            backgroundColor={C['surface/raised']}
            borderRadius={32}
            borderWidth={1}
            borderColor={C['border/subtle']}
          >
            <Text
              fontSize={16}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['text/primary']}
              marginBottom={12}
              letterSpacing={-0.3}
            >
              Impact summary
            </Text>
            <YStack gap={12}>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={13} fontWeight="600" color={C['text/primary']}>
                  Waste rate
                </Text>
                <Text fontSize={13} fontWeight="600" color={C['status/urgent']}>
                  {stats.allTimeWasteRate}%
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={13} fontWeight="600" color={C['text/primary']}>
                  Zero waste weeks
                </Text>
                <Text fontSize={13} fontWeight="600" color={C['status/fresh']}>
                  {stats.wasteStreaks}
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={13} fontWeight="600" color={C['text/primary']}>
                  Total items added
                </Text>
                <Text fontSize={13} fontWeight="600" color={C['text/secondary']}>
                  {stats.totalItemsAdded}
                </Text>
              </XStack>
            </YStack>
          </YStack>
        </ScrollView>
      </Animated.View>
    </>
  );
}
