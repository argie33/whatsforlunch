import { Item } from '@/db/models';

export interface ItemCreateInput {
  householdId: string;
  foodName: string;
  category: string;
  storageLocation: string;
  expiryAt: number;
  photoUrl?: string;
  barcode?: string;
  quantity?: string;
  notes?: string;
}

export class ItemsService {
  async getHouseholdItems(householdId: string): Promise<Item[]> {
    // Placeholder: will query WatermelonDB
    return [];
  }

  async getExpiringItems(
    householdId: string,
    daysAhead: number = 14
  ): Promise<Item[]> {
    // Placeholder: will query via AppSync deltaSync
    return [];
  }

  async createItem(input: ItemCreateInput): Promise<Item> {
    // Placeholder: will create via AppSync mutation
    throw new Error('Not implemented in Phase A');
  }

  async updateItem(itemId: string, updates: Partial<Item>): Promise<void> {
    // Placeholder: will update via AppSync mutation
  }

  async markItemEaten(itemId: string): Promise<void> {
    // Placeholder: will call AppSync mutation
  }

  async markItemTossed(itemId: string): Promise<void> {
    // Placeholder: will call AppSync mutation
  }

  async markItemFrozen(itemId: string): Promise<void> {
    // Placeholder: will call AppSync mutation
  }

  async deleteItem(itemId: string): Promise<void> {
    // Placeholder: will delete via AppSync mutation
  }

  async classifyPhoto(photoUrl: string): Promise<{ foodName: string; confidence: number }> {
    // Placeholder: will call AI Lambda via AppSync mutation
    throw new Error('Not implemented in Phase A');
  }

  async ocrExpiryDate(photoUrl: string): Promise<{ expiryDate: Date; confidence: number }> {
    // Placeholder: will call AI Lambda via AppSync mutation
    throw new Error('Not implemented in Phase A');
  }
}

export const itemsService = new ItemsService();
