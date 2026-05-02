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
import { Text, YStack, XStack } from 'tamagui';
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
    <View style={styles.container}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingTop: insets.top + 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e5e5',
          backgroundColor: '#FBFAF7',
        }}
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
      </View>

      {/* Location Error */}
      {locationError && (
        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text fontSize={13} color="#991b1b">
            {locationError}
          </Text>
        </View>
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
        {loading && !refreshing ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$text/secondary">
              {t('restaurants.loading')}
            </Text>
          </View>
        ) : restaurants.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$text/secondary">
              {t('restaurants.noRestaurants')}
            </Text>
          </View>
        ) : (
          restaurants.map((restaurant) => {
            const isExpanded = expanded.has(restaurant.placeId);
            return (
              <TouchableOpacity
                key={restaurant.placeId}
                onPress={() => toggleExpanded(restaurant.placeId)}
                style={{ marginVertical: 10 }}
              >
                <View
                  style={{
                    padding: 12,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                  }}
                >
                  {/* Header Row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text fontWeight="bold" fontSize={16}>
                        {restaurant.name}
                      </Text>
                      <Text fontSize={12} color="$text/secondary" marginTop={4}>
                        {restaurant.cuisineTypes.join(' • ')}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center', gap: 6 }}
                      >
                        <Text fontSize={12} fontWeight="600">
                          ⭐ {restaurant.rating.toFixed(1)}
                        </Text>
                        <Text fontSize={12} color="$text/secondary">
                          {renderPrice(restaurant.priceLevel)}
                        </Text>
                        <Text fontSize={12} color="$text/secondary">
                          {formatDistance(restaurant.distanceMeters)}
                        </Text>
                      </View>
                    </View>
                    <View style={{ paddingLeft: 8 }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View style={{ marginTop: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        backgroundColor: restaurant.isOpenNow ? '#dcfce7' : '#f3f4f6',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text
                        fontSize={11}
                        color={restaurant.isOpenNow ? '#166534' : '#6b7280'}
                        fontWeight="500"
                      >
                        {restaurant.isOpenNow ? t('restaurants.openNow') : t('restaurants.closed')}
                      </Text>
                    </View>
                  </View>

                  {/* AI Reason Chip */}
                  <View
                    style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center', gap: 4 }}
                  >
                    <Zap size={14} color="#2F7D5B" />
                    <Text fontSize={12} color="#2F7D5B" fontWeight="500">
                      {restaurant.aiReason}
                    </Text>
                  </View>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <View
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#e5e5e5',
                      }}
                    >
                      <Text fontSize={12} color="$text/secondary" marginBottom={8}>
                        {restaurant.address}
                      </Text>

                      {/* Delivery Options */}
                      <View style={{ gap: 8 }}>
                        {restaurant.deliveryPlatforms.map((platform) => (
                          <TouchableOpacity
                            key={platform.platform}
                            onPress={() => handleDeliveryPress(platform)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: '#2F7D5B',
                              borderRadius: 6,
                              alignItems: 'center',
                            }}
                          >
                            <Text fontSize={13} color="white" fontWeight="600">
                              {t('restaurants.orderOn', { platform: platform.platform })}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
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
