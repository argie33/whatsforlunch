import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Text, YStack, XStack, Card, Button, Checkbox } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { useAuthIds } from '@/features/auth';
import { shoppingListService } from '@/services';
import { useDatabase } from '@/db';
import { executeGraphQL } from '@/lib/graphql-client';
import { ANALYZE_RECEIPT } from '@/db/graphql';
import { lightTheme } from '@/theme/tokens';

// FileSystem only available on native platforms
let FileSystem: any = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
}

const C = lightTheme;

interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function ReceiptReviewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    photoPath?: string;
    items?: string;
    totalAmount?: string;
    date?: string;
  }>();
  const { householdId, userId } = useAuthIds();
  const db = useDatabase();

  const [items, setItems] = useState<ReceiptLineItem[]>(
    params.items ? JSON.parse(params.items) : [],
  );
  const [totalAmount, setTotalAmount] = useState(
    params.totalAmount ? parseFloat(params.totalAmount) : 0,
  );
  const [receiptDate, setReceiptDate] = useState(params.date || new Date().toISOString());
  const [loading, setLoading] = useState(!!params.photoPath);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(items.map((_, idx) => idx)),
  );
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!params.photoPath || !householdId) return;

    const analyzeReceiptPhoto = async () => {
      try {
        const photoPath = Array.isArray(params.photoPath) ? params.photoPath[0] : params.photoPath;
        const base64 = await FileSystem.readAsStringAsync(photoPath, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const result = await executeGraphQL(ANALYZE_RECEIPT, {
          input: {
            householdId,
            imageBase64: base64,
          },
        });

        if (result.data?.analyzeReceipt?.success) {
          const {
            lineItems,
            totalAmount: extractedTotal,
            invoiceReceiptDate,
          } = result.data.analyzeReceipt;
          setItems(lineItems || []);
          setTotalAmount(extractedTotal || 0);
          if (invoiceReceiptDate) {
            setReceiptDate(invoiceReceiptDate);
          }
          setSelectedItems(
            new Set((lineItems || []).map((_: ReceiptLineItem, idx: number) => idx)),
          );
        } else {
          console.error('[ReceiptReview] Analysis failed:', result.data?.analyzeReceipt?.error);
        }
      } catch (error) {
        console.error('[ReceiptReview] Photo analysis error:', error);
      } finally {
        setLoading(false);
      }
    };

    analyzeReceiptPhoto();
  }, [params.photoPath, householdId]);

  const handleToggleItem = (index: number) => {
    const next = new Set(selectedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedItems(next);
  };

  const handleAddToShoppingList = async () => {
    if (!householdId || !userId || selectedItems.size === 0) return;

    setAdding(true);
    try {
      const itemsToAdd = items.filter((_, idx) => selectedItems.has(idx));

      for (const item of itemsToAdd) {
        await shoppingListService.addItem(db, {
          householdId,
          name: item.description,
          category: 'groceries',
          addedByUserId: userId,
        });
      }

      router.replace('/(main)/shopping');
    } catch (error) {
      console.error('[ReceiptReview] Add failed:', error);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <YStack alignItems="center" gap="$4">
          <ActivityIndicator size="large" color="#48C77E" />
          <Text fontSize={16} color="$text/secondary">
            {t('receipt.analyzing', 'Analyzing receipt...')}
          </Text>
        </YStack>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        paddingTop={insets.top + 12}
        borderBottomWidth={1}
        borderBottomColor="$border"
        alignItems="center"
        gap="$3"
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} />
        </TouchableOpacity>
        <YStack flex={1}>
          <Text fontSize={20} fontWeight="600" fontFamily="Fraunces" letterSpacing={-0.3}>
            {t('receipt.review', 'Review Receipt')}
          </Text>
          <Text fontSize={12} color="$text/secondary">
            {t('receipt.selectItems', 'Select items to add')}
          </Text>
        </YStack>
      </XStack>

      <ScrollView style={styles.scrollView}>
        <YStack padding="$4" gap="$3">
          {/* Receipt Summary */}
          <Card padding="$3" backgroundColor={C['surface/raised']}>
            <XStack justifyContent="space-between" alignItems="center">
              <YStack>
                <Text fontSize={12} color="$text/secondary">
                  {t('receipt.total', 'Total')}
                </Text>
                <Text fontSize={20} fontWeight="bold" fontFamily="Fraunces" letterSpacing={-0.4}>
                  ${totalAmount.toFixed(2)}
                </Text>
              </YStack>
              <YStack alignItems="flex-end">
                <Text fontSize={12} color="$text/secondary">
                  {t('receipt.itemsFound', 'Items found')}
                </Text>
                <Text fontSize={20} fontWeight="bold">
                  {items.length}
                </Text>
              </YStack>
            </XStack>
          </Card>

          {/* Items List */}
          <YStack gap="$2">
            <Text fontSize={14} fontWeight="600" fontFamily="Fraunces" letterSpacing={-0.2}>
              {t('receipt.items', 'Items')}
            </Text>
            {items.length === 0 ? (
              <Card padding="$4" backgroundColor={C['surface/raised']}>
                <Text textAlign="center" color="$text/secondary">
                  {t('receipt.noItems', 'No items found in receipt')}
                </Text>
              </Card>
            ) : (
              items.map((item, idx) => (
                <Card
                  key={idx}
                  padding="$3"
                  backgroundColor={C['surface/raised']}
                  borderColor={selectedItems.has(idx) ? C['brand/primary'] : C['border/subtle']}
                  borderWidth={1}
                >
                  <XStack alignItems="center" gap="$3">
                    <Checkbox
                      checked={selectedItems.has(idx)}
                      onCheckedChange={() => handleToggleItem(idx)}
                      size="$5"
                    />
                    <YStack flex={1}>
                      <Text fontSize={14} fontWeight="500">
                        {item.description}
                      </Text>
                      <XStack gap="$2" marginTop="$2">
                        <Text fontSize={12} color="$text/secondary">
                          {item.quantity}x ${item.unitPrice.toFixed(2)}
                        </Text>
                        <Text fontSize={12} fontWeight="600">
                          = ${item.totalPrice.toFixed(2)}
                        </Text>
                      </XStack>
                    </YStack>
                  </XStack>
                </Card>
              ))
            )}
          </YStack>

          {/* Summary of selected */}
          {selectedItems.size > 0 && (
            <Card padding="$3" backgroundColor={C['status/freshBg']}>
              <Text fontSize={14} color={C['status/fresh']} fontWeight="600">
                {t('receipt.adding', '{{count}} items will be added', {
                  count: selectedItems.size,
                })}
              </Text>
            </Card>
          )}
        </YStack>

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>

      {/* Footer Buttons */}
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        paddingBottom={insets.bottom + 12}
        gap="$3"
        borderTopWidth={1}
        borderTopColor="$border"
      >
        <Button flex={1} variant="outlined" onPress={() => router.back()} disabled={adding}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          flex={1}
          onPress={handleAddToShoppingList}
          disabled={adding || selectedItems.size === 0}
          backgroundColor="$green10"
        >
          {adding ? t('common.saving', 'Saving...') : t('receipt.add', 'Add to List')}
        </Button>
      </XStack>
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
