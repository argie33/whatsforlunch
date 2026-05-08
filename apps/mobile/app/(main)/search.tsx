import { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, Pressable, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack, Input } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { lightTheme } from '@/theme/tokens';
import { SearchBar } from '@/components/ui/SearchBar';

const C = lightTheme;

export default function SearchScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { householdId } = useAuthIds();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'spinach',
    'milk',
    'chicken breast',
  ]);

  useEffect(() => {
    if (!householdId) return;

    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (allItems) => {
        if (!searchQuery.trim()) {
          setResults([]);
          return;
        }
        const filtered = allItems.filter(
          (item: Item) =>
            item.foodName.toLowerCase().includes(searchQuery.toLowerCase()) &&
            item.status === 'active',
        );
        setResults(filtered);
      },
    });

    return () => sub.unsubscribe();
  }, [searchQuery, householdId, db]);

  const handleRecentSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 22,
            paddingBottom: 8,
          }}
        >
          <Text
            fontSize={28}
            fontWeight="800"
            color={C['text/primary']}
            marginBottom={16}
            letterSpacing={-0.8}
            fontFamily="Fraunces"
          >
            Search
          </Text>
        </View>

        {/* Search Bar */}
        <SearchBar
          placeholder={t('search.placeholder', 'Search your items')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleClearSearch}
        />

        {/* Content */}
        <ScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {searchQuery.trim() === '' ? (
            // No search query - show recent searches and popular
            <YStack padding={16}>
              <Text
                fontSize={16}
                fontWeight="800"
                fontFamily="Fraunces"
                color={C['text/primary']}
                marginBottom={12}
                letterSpacing={-0.3}
              >
                Recent searches
              </Text>
              {recentSearches.map((search, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => handleRecentSearch(search)}
                  style={{ marginBottom: 8 }}
                >
                  <XStack
                    padding={12}
                    backgroundColor={C['surface/raised']}
                    borderRadius={32}
                    alignItems="center"
                    justifyContent="space-between"
                    borderWidth={1}
                    borderColor={C['border/subtle']}
                  >
                    <XStack alignItems="center" gap={10}>
                      <Text fontSize={16}>🔍</Text>
                      <Text fontSize={14} color={C['text/primary']} fontWeight="500">
                        {search}
                      </Text>
                    </XStack>
                    <Text fontSize={12} color={C['text/tertiary']}>
                      →
                    </Text>
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          ) : results.length === 0 ? (
            // Search with no results
            <YStack
              flex={1}
              padding={24}
              alignItems="center"
              justifyContent="center"
              minHeight={300}
            >
              <Text fontSize={48} marginBottom={16}>
                🔍
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={8}>
                No items found
              </Text>
              <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                Try searching for a different item or add it first.
              </Text>
            </YStack>
          ) : (
            // Search results
            <YStack padding={16}>
              <Text fontSize={13} color={C['text/secondary']} fontWeight="600" marginBottom={12}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </Text>
              {results.map((item) => (
                <YStack
                  key={item.id}
                  padding={12}
                  backgroundColor={C['surface/raised']}
                  borderRadius={32}
                  marginBottom={8}
                  borderWidth={1}
                  borderColor={C['border/subtle']}
                >
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1}>
                      <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                        {item.foodName}
                      </Text>
                      <XStack gap={8} marginTop={6}>
                        <Text fontSize={11} color={C['text/secondary']}>
                          📍 {item.storageLocation}
                        </Text>
                        {item.expiryAt && (
                          <Text fontSize={11} color={C['status/urgent']}>
                            Expires {new Date(item.expiryAt).toLocaleDateString()}
                          </Text>
                        )}
                      </XStack>
                    </YStack>
                  </XStack>
                </YStack>
              ))}
            </YStack>
          )}
        </ScrollView>
      </View>
    </>
  );
}
