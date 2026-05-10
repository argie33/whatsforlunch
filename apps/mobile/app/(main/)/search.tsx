import React, { useState, useMemo } from 'react';
import { ScrollView, View, Pressable, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';

const C = lightTheme;

interface SearchResult {
  id: string;
  type: 'item' | 'recipe';
  title: string;
  subtitle: string;
  icon: string;
}

const RECENT_SEARCHES = ['broccoli', 'milk', 'leftover pasta', 'chicken'];

const MOCK_ITEMS: SearchResult[] = [
  { id: '1', type: 'item', title: 'Organic Broccoli', subtitle: 'Expires in 1 day', icon: '🥬' },
  { id: '2', type: 'item', title: 'Greek Yogurt', subtitle: 'Fridge • 2 available', icon: '🥛' },
  { id: '3', type: 'item', title: 'Almond Butter', subtitle: 'Pantry • 1 available', icon: '🥜' },
];

const MOCK_RECIPES: SearchResult[] = [
  { id: '1', type: 'recipe', title: 'Roasted Broccoli', subtitle: '15 min • Easy', icon: '🥦' },
  { id: '2', type: 'recipe', title: 'Yogurt Parfait', subtitle: '5 min • Easy', icon: '🍨' },
  { id: '3', type: 'recipe', title: 'Butter Cookies', subtitle: '30 min • Medium', icon: '🍪' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);

  // TODO: Wire to searchService.search(db, householdId, query)

  const results = useMemo(() => {
    if (!query) return { items: [], recipes: [] };
    const lowerQuery = query.toLowerCase();
    return {
      items: MOCK_ITEMS.filter((item) => item.title.toLowerCase().includes(lowerQuery)),
      recipes: MOCK_RECIPES.filter((recipe) => recipe.title.toLowerCase().includes(lowerQuery)),
    };
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      setRecentSearches([searchQuery, ...recentSearches.slice(0, 3)]);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    if (result.type === 'item') {
      router.push(`/items/${result.id}` as any);
    } else {
      router.push(`/recipes/${result.id}` as any);
    }
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
          {/* === Search Bar === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.full,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <Text fontSize={16}>🔍</Text>
            <TextInput
              value={query}
              onChangeText={handleSearch}
              placeholder="Search items or recipes..."
              placeholderTextColor={C['text/secondary']}
              style={{
                flex: 1,
                fontSize: 14,
                color: C['text/primary'],
              }}
            />
            {query && (
              <Pressable onPress={() => setQuery('')}>
                <Text fontSize={14}>✕</Text>
              </Pressable>
            )}
          </View>

          {/* === Voice Button === */}
          {!query && (
            <Pressable
              onPress={() => router.push('/voice' as any)}
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: R.md,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                marginBottom: 24,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text fontSize={16}>🎤</Text>
              <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                Voice Search
              </Text>
            </Pressable>
          )}

          {/* === Results === */}
          {query ? (
            <>
              {results.items.length === 0 && results.recipes.length === 0 ? (
                <View
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: R.lg,
                    padding: 32,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    alignItems: 'center',
                  }}
                >
                  <Text fontSize={48} marginBottom={12}>
                    🔍
                  </Text>
                  <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                    No results
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                    Try searching for items in your inventory or recipes
                  </Text>
                </View>
              ) : (
                <>
                  {results.items.length > 0 && (
                    <>
                      <Text
                        fontSize={12}
                        fontWeight="700"
                        color={C['text/secondary']}
                        letterSpacing={0.3}
                        marginBottom={10}
                      >
                        ITEMS
                      </Text>
                      <YStack gap={8} marginBottom={20}>
                        {results.items.map((item) => (
                          <Pressable
                            key={item.id}
                            onPress={() => handleResultPress(item)}
                            style={{
                              backgroundColor: C['surface/raised'],
                              borderRadius: R.md,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: C['border/subtle'],
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <Text fontSize={20}>{item.icon}</Text>
                            <YStack flex={1} gap={2}>
                              <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                                {item.title}
                              </Text>
                              <Text fontSize={11} color={C['text/secondary']}>
                                {item.subtitle}
                              </Text>
                            </YStack>
                            <Text fontSize={14} color={C['text/secondary']}>
                              →
                            </Text>
                          </Pressable>
                        ))}
                      </YStack>
                    </>
                  )}

                  {results.recipes.length > 0 && (
                    <>
                      <Text
                        fontSize={12}
                        fontWeight="700"
                        color={C['text/secondary']}
                        letterSpacing={0.3}
                        marginBottom={10}
                      >
                        RECIPES
                      </Text>
                      <YStack gap={8}>
                        {results.recipes.map((recipe) => (
                          <Pressable
                            key={recipe.id}
                            onPress={() => handleResultPress(recipe)}
                            style={{
                              backgroundColor: C['surface/raised'],
                              borderRadius: R.md,
                              padding: 12,
                              borderWidth: 1,
                              borderColor: C['border/subtle'],
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <Text fontSize={20}>{recipe.icon}</Text>
                            <YStack flex={1} gap={2}>
                              <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                                {recipe.title}
                              </Text>
                              <Text fontSize={11} color={C['text/secondary']}>
                                {recipe.subtitle}
                              </Text>
                            </YStack>
                            <Text fontSize={14} color={C['text/secondary']}>
                              →
                            </Text>
                          </Pressable>
                        ))}
                      </YStack>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* === Recent Searches === */}
              <Text
                fontSize={12}
                fontWeight="700"
                color={C['text/secondary']}
                letterSpacing={0.3}
                marginBottom={10}
              >
                RECENT SEARCHES
              </Text>
              <YStack gap={8} marginBottom={28}>
                {recentSearches.map((search, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleSearch(search)}
                    style={{
                      backgroundColor: C['surface/raised'],
                      borderRadius: R.md,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderWidth: 1,
                      borderColor: C['border/subtle'],
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <XStack alignItems="center" gap={8}>
                      <Text fontSize={14}>🕐</Text>
                      <Text fontSize={13} color={C['text/primary']}>
                        {search}
                      </Text>
                    </XStack>
                    <Text fontSize={14} color={C['text/secondary']}>
                      →
                    </Text>
                  </Pressable>
                ))}
              </YStack>

              {/* === Tips === */}
              <Text
                fontSize={12}
                fontWeight="700"
                color={C['text/secondary']}
                letterSpacing={0.3}
                marginBottom={10}
              >
                SEARCH TIPS
              </Text>
              <YStack gap={8}>
                {[
                  { tip: 'Item names', ex: '"milk", "broccoli"' },
                  { tip: 'Recipes', ex: '"pasta", "stir fry"' },
                  { tip: 'Status', ex: '"expiring soon"' },
                ].map((item, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: C['surface/raised'],
                      borderRadius: R.md,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: C['border/subtle'],
                    }}
                  >
                    <Text fontSize={12} fontWeight="700" color={C['text/primary']}>
                      {item.tip}
                    </Text>
                    <Text fontSize={11} color={C['text/secondary']} marginTop={2}>
                      {item.ex}
                    </Text>
                  </View>
                ))}
              </YStack>
            </>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}
