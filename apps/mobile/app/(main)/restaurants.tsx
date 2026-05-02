import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
  StyleSheet,
} from 'react-native';
import { Text, YStack, XStack, Pressable as TamaguiPressable } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react-native';

import { useAuthIds } from '@/features/auth';
import { executeGraphQL } from '@/lib/graphql-client';
import { GET_NEARBY_RESTAURANTS } from '@/db/graphql';
import { useUserPreferences } from '@/features/settings/useUserPreferences';

interface DeliveryPlatform {
  platform: string;
  deepLink: string;
}

interface Restaurant {
  placeId: string;
  name: string;
  address: string;
  cuisineTypes: string[];
  rating: number;
  priceLevel?: number;
  distanceMeters: number;
  isOpenNow: boolean;
  deliveryPlatforms: DeliveryPlatform[];
  aiScore: number;
  aiReason: string;
}

export default function RestaurantsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { householdId } = useAuthIds();
  const { prefs } = useUserPreferences();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadRestaurants = useCallback(async () => {
    if (!householdId) return;

    try {
      setLoading(true);
      setLocationError(null);

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(t('restaurants.locationDenied'));
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Fetch nearby restaurants
      const data = await executeGraphQL<{ getNearbyRestaurants: Restaurant[] }>(
        GET_NEARBY_RESTAURANTS,
        { householdId, latitude, longitude },
      );

      setRestaurants(data?.getNearbyRestaurants || []);
    } catch (e) {
      console.error('Failed to load restaurants:', e);
      Alert.alert(t('common.error'), String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [householdId, t]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const toggleExpanded = (placeId: string) => {
    const next = new Set(expanded);
    if (next.has(placeId)) {
      next.delete(placeId);
    } else {
      next.add(placeId);
    }
    setExpanded(next);
  };

  const handleDeliveryPress = async (platform: DeliveryPlatform) => {
    try {
      await Linking.openURL(platform.deepLink);
    } catch (err) {
      Alert.alert(t('common.error'), `Could not open ${platform.platform}`);
    }
  };

  const formatDistance = (meters: number): string => {
    if (prefs.units === 'metric') {
      const km = Math.round(meters / 100) / 10;
      return `${km} km`;
    }
    const miles = Math.round((meters / 1609.34) * 10) / 10;
    return `${miles} mi`;
  };

  const renderPrice = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(Math.min(level, 3));
  };

  return (
    <YStack flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <YStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        paddingTop={insets.top + 12}
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
        backgroundColor="$surface/raised"
      >
        <Text fontSize={24} fontWeight="bold">
          {t('restaurants.screenTitle')}
        </Text>
        <Text fontSize={14} color="$text/secondary" marginTop={4}>
          {restaurants.length > 0
            ? t('restaurants.subtitle', {
                distance: formatDistance(Math.max(...restaurants.map((r) => r.distanceMeters))),
                cuisines: Array.from(new Set(restaurants.flatMap((r) => r.cuisineTypes)))
                  .slice(0, 2)
                  .join(', '),
              })
            : t('restaurants.noRestaurants')}
        </Text>
      </YStack>

      {/* Location Error */}
      {locationError && (
        <YStack backgroundColor="$status/urgentMuted" paddingHorizontal="$4" paddingVertical="$3">
          <Text fontSize={13} color="$status/urgent">
            {locationError}
          </Text>
        </YStack>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRestaurants();
            }}
          />
        }
      >
        <YStack paddingHorizontal="$4">
          {loading && !refreshing ? (
            <YStack marginTop={40} alignItems="center">
              <Text fontSize={16} color="$text/secondary">
                {t('restaurants.loading')}
              </Text>
            </YStack>
          ) : restaurants.length === 0 ? (
            <YStack marginTop={40} alignItems="center">
              <Text fontSize={16} color="$text/secondary">
                {t('restaurants.noRestaurants')}
              </Text>
            </YStack>
          ) : (
          restaurants.map((restaurant) => {
            const isExpanded = expanded.has(restaurant.placeId);
            return (
              <YStack key={restaurant.placeId} marginVertical="$2">
                <TamaguiPressable onPress={() => toggleExpanded(restaurant.placeId)}>
                  <YStack
                    padding="$3"
                    backgroundColor="$surface/raised"
                    borderRadius="$md"
                  >
                    {/* Header Row */}
                    <XStack justifyContent="space-between" alignItems="flex-start">
                      <YStack flex={1}>
                        <Text fontWeight="bold" fontSize={16}>
                          {restaurant.name}
                        </Text>
                        <Text fontSize={12} color="$text/secondary" marginTop={4}>
                          {restaurant.cuisineTypes.join(' • ')}
                        </Text>
                        <XStack marginTop={6} alignItems="center" gap="$1">
                          <Text fontSize={12} fontWeight="600">
                            ⭐ {restaurant.rating.toFixed(1)}
                          </Text>
                          <Text fontSize={12} color="$text/secondary">
                            {renderPrice(restaurant.priceLevel)}
                          </Text>
                          <Text fontSize={12} color="$text/secondary">
                            {formatDistance(restaurant.distanceMeters)}
                          </Text>
                        </XStack>
                      </YStack>
                      <YStack paddingLeft="$2">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </YStack>
                    </XStack>

                    {/* Status Badge */}
                    <YStack marginTop="$2">
                      <YStack
                        paddingHorizontal="$2"
                        paddingVertical={4}
                        borderRadius="$sm"
                        backgroundColor={restaurant.isOpenNow ? '$status/freshMuted' : '$surface/sunken'}
                        alignSelf="flex-start"
                      >
                        <Text
                          fontSize={11}
                          color={restaurant.isOpenNow ? '$status/fresh' : '$text/secondary'}
                          fontWeight="500"
                        >
                          {restaurant.isOpenNow ? t('restaurants.openNow') : t('restaurants.closed')}
                        </Text>
                      </YStack>
                    </YStack>

                    {/* AI Reason Chip */}
                    <XStack marginTop="$2" alignItems="center" gap="$1">
                      <Zap size={14} color="$brand/primary" />
                      <Text fontSize={12} color="$brand/primary" fontWeight="500">
                        {restaurant.aiReason}
                      </Text>
                    </XStack>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <YStack
                        marginTop="$3"
                        paddingTop="$3"
                        borderTopWidth={1}
                        borderTopColor="$border/subtle"
                      >
                        <Text fontSize={12} color="$text/secondary" marginBottom="$2">
                          {restaurant.address}
                        </Text>

                        {/* Delivery Options */}
                        <YStack gap="$2">
                          {restaurant.deliveryPlatforms.map((platform) => (
                            <YStack key={platform.platform}>
                              <TamaguiPressable onPress={() => handleDeliveryPress(platform)}>
                                <YStack
                                  paddingHorizontal="$3"
                                  paddingVertical="$2"
                                  backgroundColor="$brand/primary"
                                  borderRadius="$sm"
                                  alignItems="center"
                                >
                                  <Text fontSize={13} color="$white" fontWeight="600">
                                    {t('restaurants.orderOn', { platform: platform.platform })}
                                  </Text>
                                </YStack>
                              </TamaguiPressable>
                            </YStack>
                          ))}
                        </YStack>
                      </YStack>
                    )}
                  </YStack>
                </TamaguiPressable>
              </YStack>
            );
          })
        )}
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBFAF7',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
