import { generateClient } from 'aws-amplify/api';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Item } from '@/db/models/Item';
import type { ClassifyFoodResponse, OcrExpiryDateResponse } from '@wfl/shared/src/schemas/ai';

const client = generateClient();

// ─── Input / result types (mirror docs/03_API_SPEC.md GraphQL inputs) ────────

export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter' | 'lunchbox';
export type ItemStatus = 'active' | 'partial' | 'eaten' | 'tossed' | 'frozen' | 'transferred';
export type ExpirySource = 'rule' | 'ai' | 'ocr' | 'barcode' | 'user';

export interface ItemCreateInput {
  householdId: string;
  containerId?: string;
  foodType: string;
  foodName: string;
  category: string;
  storageLocation: StorageLocation;
  storedAt: string;      // ISO 8601
  storedTz: string;
  expiryAt: string;      // ISO 8601
  expirySource: ExpirySource;
  expiryConfidence?: number;
  quantityText?: string;
  quantityValue?: number;
  quantityUnit?: string;
  notes?: string;
  photoPath?: string;
  barcode?: string;
  priceUsd?: number;
  clientId: string;
}

export interface ItemUpdateInput {
  foodType?: string;
  foodName?: string;
  storageLocation?: StorageLocation;
  expiryAt?: string;
  quantityText?: string;
  quantityValue?: number;
  quantityUnit?: string;
  notes?: string;
  photoPath?: string;
  priceUsd?: number;
}

export interface BarcodeResult {
  brand?: string;
  product?: string;
  servingSize?: string;
  imageUrl?: string;
}

export interface MarkPartialInput {
  quantityText: string;
  quantityValue?: number;
  quantityUnit?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ItemsService {
  /** All active items for a household, sorted by soonest expiry first. */
  async getHouseholdItems(db: Database, householdId: string): Promise<Item[]> {
    return db.get<Item>('items').query(
      Q.where('household_id', householdId),
      Q.where('status', 'active'),
      Q.sortBy('expiry_at', Q.asc),
    ).fetch();
  }

  /** Items expiring within N days (for the dashboard "soon" and "urgent" buckets). */
  async getExpiringItems(db: Database, householdId: string, daysAhead = 14): Promise<Item[]> {
    const cutoff = Date.now() + daysAhead * 24 * 60 * 60 * 1000;
    return db.get<Item>('items').query(
      Q.where('household_id', householdId),
      Q.where('status', 'active'),
      Q.where('expiry_at', Q.lte(cutoff)),
      Q.sortBy('expiry_at', Q.asc),
    ).fetch();
  }

  /** Lookup a single item by local WatermelonDB id. */
  async getById(db: Database, id: string): Promise<Item | null> {
    try {
      return await db.get<Item>('items').find(id);
    } catch {
      return null;
    }
  }

  /**
   * Create a new item (manual entry).
   * Phase B: createItem mutation → optimistic local write.
   */
  async createItem(_input: ItemCreateInput): Promise<{ id: string }> {
    throw new Error('ItemsService.createItem — Phase B');
  }

  /**
   * Update item fields.
   * Phase B: updateItem mutation → optimistic local write.
   */
  async updateItem(_db: Database, _id: string, _input: ItemUpdateInput): Promise<void> {
    throw new Error('ItemsService.updateItem — Phase B');
  }

  /** Mark item as eaten. Phase B: markItemEaten mutation. */
  async markItemEaten(_db: Database, _id: string): Promise<void> {
    throw new Error('ItemsService.markItemEaten — Phase B');
  }

  /** Mark item as tossed. Phase B: markItemTossed mutation. */
  async markItemTossed(_db: Database, _id: string): Promise<void> {
    throw new Error('ItemsService.markItemTossed — Phase B');
  }

  /** Mark item as frozen. Phase B: markItemFrozen mutation. */
  async markItemFrozen(_db: Database, _id: string): Promise<void> {
    throw new Error('ItemsService.markItemFrozen — Phase B');
  }

  /** Mark item as partially consumed, updating quantity fields. */
  async markItemPartial(_db: Database, _id: string, _input: MarkPartialInput): Promise<void> {
    throw new Error('ItemsService.markItemPartial — Phase B');
  }

  /** Snooze expiry alert by N days. Phase B: snoozeItem mutation. */
  async snoozeItem(_db: Database, _id: string, _days: number): Promise<void> {
    throw new Error('ItemsService.snoozeItem — Phase B');
  }

  /**
   * Look up a scanned barcode via the Open Food Facts API (no key required).
   * Phase B: cache results locally; check local cache first.
   */
  async lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
    // Phase B: fetch from openfoodfacts.org/api/v2/product/{barcode}.json
    // and cache in local DB or MMKV.
    throw new Error('ItemsService.lookupBarcode — Phase B');
  }

  /**
   * Call the classify-food Lambda (via AppSync mutation classifyFood).
   * Returns W4's Bedrock response. Consumed by the Photo scan mode.
   */
  async classifyPhoto(_photoS3Key: string): Promise<ClassifyFoodResponse> {
    // Phase B: mutation classifyFood(input: { photoPath }) → ClassifyFoodResponse
    throw new Error('ItemsService.classifyPhoto — Phase B');
  }

  /**
   * Call the ocr-expiry-date Lambda (via AppSync mutation ocrExpiryDate).
   * Returns W4's Textract/Bedrock response. Consumed by the Date scan mode.
   */
  async ocrExpiryDate(_photoS3Key: string): Promise<OcrExpiryDateResponse> {
    // Phase B: mutation ocrExpiryDate(input: { photoPath }) → OcrExpiryDateResponse
    throw new Error('ItemsService.ocrExpiryDate — Phase B');
  }
}

export const itemsService = new ItemsService();
