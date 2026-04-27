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
   * Create a new item (manual entry or from photo classification).
   * Sends to backend via GraphQL, then updates local DB.
   */
  async createItem(input: ItemCreateInput): Promise<{ id: string }> {
    const CREATE_ITEM = /* GraphQL */ `
      mutation CreateItem($input: CreateItemInput!) {
        createItem(input: $input) {
          id
          householdId
          foodName
          foodType
          category
          storageLocation
          expiryAt
          status
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      const result = await (client.graphql as Function)({
        query: CREATE_ITEM,
        variables: {
          input: {
            householdId: input.householdId,
            containerId: input.containerId,
            foodType: input.foodType,
            foodName: input.foodName,
            category: input.category,
            location: input.storageLocation,
            storedAt: input.storedAt,
            storedTz: input.storedTz,
            expiryAt: input.expiryAt,
            expirySource: input.expirySource,
            expiryConfidence: input.expiryConfidence,
            quantityText: input.quantityText,
            quantityValue: input.quantityValue,
            quantityUnit: input.quantityUnit,
            notes: input.notes,
            photoUrl: input.photoPath,
            barcode: input.barcode,
            priceUsd: input.priceUsd,
          },
        },
      });

      const created = result.data?.createItem;
      if (!created?.id) {
        throw new Error('No ID returned from createItem');
      }

      return { id: created.id };
    } catch (err) {
      console.error('[ItemsService] createItem failed:', err);
      throw new Error(`Failed to create item: ${err}`);
    }
  }

  /**
   * Update item fields (food name, expiry, location, notes, etc).
   */
  async updateItem(db: Database, householdId: string, id: string, input: ItemUpdateInput): Promise<void> {
    const UPDATE_ITEM = /* GraphQL */ `
      mutation UpdateItem($input: UpdateItemInput!) {
        updateItem(input: $input) {
          id
          foodName
          foodType
          category
          storageLocation
          expiryAt
          quantityText
          quantityValue
          quantityUnit
          notes
          photoUrl
          priceUsd
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: UPDATE_ITEM,
        variables: {
          input: {
            householdId,
            itemId: id,
            ...input,
          },
        },
      });

      const item = await db.get<Item>('items').find(id);
      await db.write(async () => {
        await item.update((record) => {
          if (input.foodName) record.foodName = input.foodName;
          if (input.foodType) record.foodType = input.foodType;
          if (input.storageLocation) record.storageLocation = input.storageLocation;
          if (input.expiryAt) record.expiryAt = input.expiryAt;
          if (input.quantityText !== undefined) record.quantityText = input.quantityText;
          if (input.quantityValue !== undefined) record.quantityValue = input.quantityValue;
          if (input.quantityUnit !== undefined) record.quantityUnit = input.quantityUnit;
          if (input.notes !== undefined) record.notes = input.notes;
          if (input.photoPath) record.photoUrl = input.photoPath;
          if (input.priceUsd !== undefined) record.priceUsd = input.priceUsd;
        });
      });
    } catch (err) {
      console.error('[ItemsService] updateItem failed:', err);
      throw new Error(`Failed to update item: ${err}`);
    }
  }

  /** Mark item as eaten. */
  async markItemEaten(db: Database, householdId: string, id: string): Promise<void> {
    const MARK_EATEN = /* GraphQL */ `
      mutation MarkItemEaten($input: MarkItemEatenInput!) {
        markItemEaten(input: $input) {
          id
          status
          eatenAt
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: MARK_EATEN,
        variables: { input: { householdId, itemId: id } },
      });

      // Update local DB
      const item = await db.get<Item>('items').find(id);
      await db.write(async () => {
        await item.update((record) => {
          record.status = 'eaten';
          record.eatenAt = new Date().toISOString();
        });
      });
    } catch (err) {
      console.error('[ItemsService] markItemEaten failed:', err);
      throw new Error(`Failed to mark item as eaten: ${err}`);
    }
  }

  /** Mark item as tossed. */
  async markItemTossed(db: Database, householdId: string, id: string): Promise<void> {
    const MARK_TOSSED = /* GraphQL */ `
      mutation MarkItemTossed($input: MarkItemTossedInput!) {
        markItemTossed(input: $input) {
          id
          status
          tossedAt
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: MARK_TOSSED,
        variables: { input: { householdId, itemId: id } },
      });

      const item = await db.get<Item>('items').find(id);
      await db.write(async () => {
        await item.update((record) => {
          record.status = 'tossed';
          record.tossedAt = new Date().toISOString();
        });
      });
    } catch (err) {
      console.error('[ItemsService] markItemTossed failed:', err);
      throw new Error(`Failed to mark item as tossed: ${err}`);
    }
  }

  /** Mark item as frozen. */
  async markItemFrozen(db: Database, householdId: string, id: string): Promise<void> {
    const MARK_FROZEN = /* GraphQL */ `
      mutation MarkItemFrozen($input: MarkItemFrozenInput!) {
        markItemFrozen(input: $input) {
          id
          status
          frozenAt
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: MARK_FROZEN,
        variables: { input: { householdId, itemId: id } },
      });

      const item = await db.get<Item>('items').find(id);
      await db.write(async () => {
        await item.update((record) => {
          record.status = 'frozen';
          record.frozenAt = new Date().toISOString();
        });
      });
    } catch (err) {
      console.error('[ItemsService] markItemFrozen failed:', err);
      throw new Error(`Failed to mark item as frozen: ${err}`);
    }
  }

  /** Mark item as partially consumed, updating quantity fields. */
  async markItemPartial(db: Database, householdId: string, id: string, input: MarkPartialInput): Promise<void> {
    const MARK_PARTIAL = /* GraphQL */ `
      mutation MarkItemPartial($input: MarkItemPartialInput!) {
        markItemPartial(input: $input) {
          id
          status
          quantityText
          quantityValue
          quantityUnit
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: MARK_PARTIAL,
        variables: {
          input: {
            householdId,
            itemId: id,
            quantityText: input.quantityText,
            quantityValue: input.quantityValue,
            quantityUnit: input.quantityUnit,
          },
        },
      });

      const item = await db.get<Item>('items').find(id);
      await db.write(async () => {
        await item.update((record) => {
          record.status = 'partial';
          record.quantityText = input.quantityText;
          record.quantityValue = input.quantityValue;
          record.quantityUnit = input.quantityUnit;
        });
      });
    } catch (err) {
      console.error('[ItemsService] markItemPartial failed:', err);
      throw new Error(`Failed to mark item as partial: ${err}`);
    }
  }

  /** Snooze expiry alert by N days. Phase B: snoozeItem mutation. */
  async snoozeItem(_db: Database, _id: string, _days: number): Promise<void> {
    throw new Error('ItemsService.snoozeItem — Phase B');
  }

  /**
   * Look up a scanned barcode via the Open Food Facts API (no key required).
   * Phase B: add MMKV caching layer.
   */
  async lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,serving_size,image_front_small_url`,
      );
      if (!res.ok) return null;
      const json = await res.json() as {
        status: number;
        product?: {
          product_name?: string;
          brands?: string;
          serving_size?: string;
          image_front_small_url?: string;
        };
      };
      if (json.status !== 1 || !json.product) return null;
      const p = json.product;
      return {
        product: p.product_name,
        brand: p.brands,
        servingSize: p.serving_size,
        imageUrl: p.image_front_small_url,
      };
    } catch {
      return null;
    }
  }

  /**
   * Call the classify-food Lambda (via AppSync mutation classifyFood).
   * Returns W4's Bedrock response. Consumed by the Photo scan mode.
   */
  async classifyPhoto(photoS3Key: string, householdId: string, itemId: string): Promise<ClassifyFoodResponse> {
    const CLASSIFY_FOOD = /* GraphQL */ `
      mutation ClassifyFood($input: ClassifyFoodInput!) {
        classifyFood(input: $input) {
          itemId
          classification {
            foodType
            foodName
            category
            confidence
          }
          cost
          cacheHit
          model
          promptVersion
        }
      }
    `;

    try {
      const result = await (client.graphql as Function)({
        query: CLASSIFY_FOOD,
        variables: {
          input: {
            householdId,
            itemId,
            photoUrl: photoS3Key,
          },
        },
      });

      return result.data?.classifyFood;
    } catch (err) {
      console.error('[ItemsService] classifyPhoto failed:', err);
      throw new Error(`Failed to classify photo: ${err}`);
    }
  }

  /**
   * Call the ocr-expiry-date Lambda (via AppSync mutation ocrExpiryDate).
   * Returns W4's Textract/Bedrock response. Consumed by the Date scan mode.
   */
  async ocrExpiryDate(photoS3Key: string, householdId: string, itemId: string): Promise<OcrExpiryDateResponse> {
    const OCR_EXPIRY_DATE = /* GraphQL */ `
      mutation OcrExpiryDate($input: OcrExpiryDateInput!) {
        ocrExpiryDate(input: $input) {
          itemId
          detectedDate
          confidence
          method
          rawText
          cost
        }
      }
    `;

    try {
      const result = await (client.graphql as Function)({
        query: OCR_EXPIRY_DATE,
        variables: {
          input: {
            householdId,
            itemId,
            photoUrl: photoS3Key,
          },
        },
      });

      return result.data?.ocrExpiryDate;
    } catch (err) {
      console.error('[ItemsService] ocrExpiryDate failed:', err);
      throw new Error(`Failed to extract expiry date: ${err}`);
    }
  }
}

export const itemsService = new ItemsService();
