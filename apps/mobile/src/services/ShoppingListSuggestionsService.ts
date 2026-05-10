import { Database, Q } from '@nozbe/watermelondb';
import { Item } from '@/db/models/Item';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';

export interface SuggestionItem {
  name: string;
  category?: string;
  frequency: number;
  reason: string;
  confidence: number;
}

class ShoppingListSuggestionsService {
  async getSuggestions(db: Database, householdId: string): Promise<SuggestionItem[]> {
    try {
      // Get items added in the last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const itemsTable = db.collections.get<Item>('items');
      const shoppingTable = db.collections.get<ShoppingListItem>('shopping_list_items');

      const recentItems = await itemsTable
        .query(
          Q.and(
            Q.where('household_id', householdId),
            Q.where('created_at', Q.gte(ninetyDaysAgo.getTime())),
          ),
        )
        .fetch();

      // Count frequency of items by name
      const frequencyMap = new Map<string, { count: number; category?: string }>();
      recentItems.forEach((item: Item) => {
        const key = (item as any).name.toLowerCase();
        const existing = frequencyMap.get(key) || { count: 0, category: (item as any).category };
        frequencyMap.set(key, {
          count: existing.count + 1,
          category: existing.category || (item as any).category,
        });
      });

      // Get items expiring in the next 14 days (candidates for replenishment)
      const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const expiringItems = await itemsTable
        .query(
          Q.and(
            Q.where('household_id', householdId),
            Q.where('expires_at', Q.lte(twoWeeksFromNow.getTime())),
            Q.where('expires_at', Q.gte(Date.now())),
            Q.where('status', 'active'),
          ),
        )
        .fetch();

      // Get current shopping list
      const shoppingItems = await shoppingTable.query(Q.where('household_id', householdId)).fetch();
      const shoppingNames = new Set(
        shoppingItems.map((s: ShoppingListItem) => (s as any).name.toLowerCase()),
      );

      // Generate suggestions
      const suggestions: SuggestionItem[] = [];
      const added = new Set<string>();

      // Add frequent items not in shopping list
      frequencyMap.forEach(({ count, category }, itemName: string) => {
        if (!shoppingNames.has(itemName) && !added.has(itemName) && count >= 2) {
          suggestions.push({
            name: itemName,
            category,
            frequency: count,
            reason: `You've bought this ${count} times recently`,
            confidence: Math.min(0.95, count * 0.2),
          });
          added.add(itemName);
        }
      });

      // Add expiring items that need replenishment
      expiringItems.forEach((item: Item) => {
        const lowerName = (item as any).name.toLowerCase();
        if (!shoppingNames.has(lowerName) && !added.has(lowerName)) {
          suggestions.push({
            name: (item as any).name,
            category: (item as any).category,
            frequency: 1,
            reason: 'Item expires soon — consider replenishing',
            confidence: 0.7,
          });
          added.add(lowerName);
        }
      });

      // Sort by confidence and frequency
      suggestions.sort((a, b) => {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        return b.frequency - a.frequency;
      });

      return suggestions.slice(0, 8); // Return top 8
    } catch (error) {
      console.error('[ShoppingListSuggestions] Error:', error);
      return [];
    }
  }
}

export const shoppingListSuggestionsService = new ShoppingListSuggestionsService();
export { ShoppingListSuggestionsService };
