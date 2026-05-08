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
    if (!searchQuery.trim() || !householdId) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      const repo = new ItemRepository(db);
      const allItems = await repo.findByHousehold(householdId);
      const filtered = allItems.filter(
        (item) =>
          item.foodName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          item.status === 'active',
      );
      setResults(filtered);
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
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
      <View style={{ flex: 1, backgroundColor: '#FBFAF7' }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 16,
            paddingBottom: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E8E5DE',
          }}
        >
          <Text fontSize={28} fontWeight="800" color="#0F1411" marginBottom={16}>
            Search
          </Text>
          <XStack
            height={44}
            borderRadius={12}
            backgroundColor="#F2F0EB"
            alignItems="center"
            paddingHorizontal={12}
            gap={8}
          >
            <Search size={20} color="#5C615E" />
            <Input
              flex={1}
              placeholder={t('search.placeholder', 'Search your items')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              borderWidth={0}
              backgroundColor="transparent"
              placeholderTextColor="#8B908D"
              fontSize={16}
            />
            {searchQuery && (
              <Pressable onPress={handleClearSearch}>
                <X size={18} color="#5C615E" />
              </Pressable>
            )}
          </XStack>
        </View>

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
              <Text fontSize={16} fontWeight="800" color="#0F1411" marginBottom={12}>
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
                    backgroundColor="#FFFFFF"
                    borderRadius={10}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <XStack alignItems="center" gap={10}>
                      <Text fontSize={16}>🔍</Text>
                      <Text fontSize={14} color="#0F1411" fontWeight="500">
                        {search}
                      </Text>
                    </XStack>
                    <Text fontSize={12} color="#8B908D">
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
              <Text fontSize={16} fontWeight="700" color="#0F1411" marginBottom={8}>
                No items found
              </Text>
              <Text fontSize={13} color="#5C615E" textAlign="center">
                Try searching for a different item or add it first.
              </Text>
            </YStack>
          ) : (
            // Search results
            <YStack padding={16}>
              <Text fontSize={13} color="#5C615E" fontWeight="600" marginBottom={12}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </Text>
              {results.map((item) => (
                <YStack
                  key={item.id}
                  padding={12}
                  backgroundColor="#FFFFFF"
                  borderRadius={10}
                  marginBottom={8}
                >
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1}>
                      <Text fontSize={15} fontWeight="700" color="#0F1411">
                        {item.foodName}
                      </Text>
                      <XStack gap={8} marginTop={6}>
                        <Text fontSize={11} color="#5C615E">
                          📍 {item.storageLocation}
                        </Text>
                        {item.expiryAt && (
                          <Text fontSize={11} color="#C24A3E">
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
