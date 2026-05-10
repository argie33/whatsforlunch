import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { generateClient } from '@/lib/aws-amplify-api-shim';
import { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { writeQueue } from '@/db/queue';
import { trackItemMarkedEaten, trackItemTossed } from '@/lib/analytics';
import { CLASSIFY_FOOD, OCR_EXPIRY_DATE } from '@/db/graphql';
import type { ClassifyFoodResponse, OcrExpiryDateResponse } from '@wfl/shared/src/schemas/ai';

// ─── Input / result types (mirror docs/03_API_SPEC.md GraphQL inputs) ────────

export type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter' | 'lunchbox';
export type ItemStatus = 'active' | 'partial' | 'eaten' | 'tossed' | 'frozen' | 'transferred';
export type ExpirySource = 'rule' | 'ai' | 'ocr' | 'barcode' | 'user';

export interface ItemCreateInput {
  householdId: string;
  containerId?: string;
  addedByUserId: string;
  foodType: string;
  foodName: string;
  category: string;
  storageLocation: StorageLocation;
  storedAt?: string;
  storedTz?: string;
  expiryAt: string;
  expirySource: ExpirySource;
  expiryConfidence?: number;
  quantityText?: string;
  quantityValue?: number;
  quantityUnit?: string;
  notes?: string;
  photoPath?: string;
  barcode?: string;
  nutritionalData?: NutritionalData;
  priceUsd?: number;
  clientId?: string;
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
  nutritionalData?: NutritionalData;
  priceUsd?: number;
}

export interface BarcodeResult {
  brand?: string;
  product?: string;
  servingSize?: string;
  imageUrl?: string;
}

export interface NutritionalData {
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
}

export interface MarkPartialInput {
  quantityText: string;
  quantityValue?: number;
  quantityUnit?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const client = generateClient();

export class ItemsService {
  /** All active items for a household, sorted by soonest expiry first. */
  async getHouseholdItems(db: Database, householdId: string): Promise<Item[]> {
    return db
      .get<Item>('items')
      .query(
        Q.where('household_id', householdId),
        Q.where('status', 'active'),
        Q.sortBy('expiry_at', Q.asc),
      )
      .fetch();
  }

  /** Items expiring within N days (for the dashboard "soon" and "urgent" buckets). */
  async getExpiringItems(db: Database, householdId: string, daysAhead = 14): Promise<Item[]> {
    const cutoff = Date.now() + daysAhead * 24 * 60 * 60 * 1000;
    return db
      .get<Item>('items')
      .query(
        Q.where('household_id', householdId),
        Q.where('status', 'active'),
        Q.where('expiry_at', Q.lte(cutoff)),
        Q.sortBy('expiry_at', Q.asc),
      )
      .fetch();
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
   * Create a new item — optimistic local write then enqueue cloud push.
   * Returns the WatermelonDB record so callers have an id immediately.
   */
  async createItem(db: Database, input: ItemCreateInput): Promise<Item> {
    const repo = new ItemRepository(db);
    const now = Date.now();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const item = await repo.create({
      householdId: input.householdId,
      containerId: input.containerId,
      addedByUserId: input.addedByUserId,
      foodType: input.foodType,
      foodName: input.foodName,
      category: input.category,
      storageLocation: input.storageLocation,
      storedAt: input.storedAt ? new Date(input.storedAt).getTime() : now,
      storedTz: input.storedTz ?? tz,
      expiryAt: new Date(input.expiryAt).getTime(),
      expirySource: input.expirySource,
      expiryConfidence: input.expiryConfidence,
      quantityText: input.quantityText,
      quantityValue: input.quantityValue,
      quantityUnit: input.quantityUnit,
      notes: input.notes,
      photoUrl: input.photoPath,
      barcode: input.barcode,
      caloriesPer100g: input.nutritionalData?.caloriesPer100g,
      proteinPer100g: input.nutritionalData?.proteinPer100g,
      carbsPer100g: input.nutritionalData?.carbsPer100g,
      fatPer100g: input.nutritionalData?.fatPer100g,
      fiberPer100g: input.nutritionalData?.fiberPer100g,
      sugarPer100g: input.nutritionalData?.sugarPer100g,
      sodiumPer100g: input.nutritionalData?.sodiumPer100g,
      priceUsd: input.priceUsd,
    });

    writeQueue.enqueue({
      type: 'createItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: input.householdId,
      payload: {
        householdId: input.householdId,
        containerId: input.containerId ?? null,
        foodType: input.foodType,
        foodName: input.foodName,
        category: input.category,
        storageLocation: input.storageLocation,
        storedAt: input.storedAt ?? new Date(now).toISOString(),
        storedTz: input.storedTz ?? tz,
        expiryAt: input.expiryAt,
        expirySource: input.expirySource,
        expiryConfidence: input.expiryConfidence ?? null,
        quantityText: input.quantityText ?? null,
        quantityValue: input.quantityValue ?? null,
        quantityUnit: input.quantityUnit ?? null,
        notes: input.notes ?? null,
        photoPath: input.photoPath ?? null,
        barcode: input.barcode ?? null,
        nutritionalData: input.nutritionalData ?? null,
        priceUsd: input.priceUsd ?? null,
        clientId: input.clientId ?? item.cloudId,
      },
    });

    return item;
  }

  /** Update mutable item fields — optimistic local write + enqueue. */
  async updateItem(db: Database, id: string, input: ItemUpdateInput): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);

    await repo.update(item, {
      foodName: input.foodName,
      foodType: input.foodType,
      storageLocation: input.storageLocation,
      expiryAt: input.expiryAt ? new Date(input.expiryAt).getTime() : undefined,
      quantityText: input.quantityText,
      quantityValue: input.quantityValue,
      quantityUnit: input.quantityUnit,
      notes: input.notes,
      photoUrl: input.photoPath,
      priceUsd: input.priceUsd,
    });

    writeQueue.enqueue({
      type: 'updateItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        id: item.cloudId,
        householdId: item.householdId,
        ...(input.foodName != null && { foodName: input.foodName }),
        ...(input.foodType != null && { foodType: input.foodType }),
        ...(input.storageLocation != null && { storageLocation: input.storageLocation }),
        ...(input.expiryAt != null && { expiryAt: input.expiryAt }),
        ...(input.quantityText != null && { quantityText: input.quantityText }),
        ...(input.quantityValue != null && { quantityValue: input.quantityValue }),
        ...(input.quantityUnit != null && { quantityUnit: input.quantityUnit }),
        ...(input.notes != null && { notes: input.notes }),
        ...(input.photoPath != null && { photoPath: input.photoPath }),
      },
    });
  }

  /** Mark item as eaten — optimistic local write + enqueue. */
  async markItemEaten(db: Database, id: string): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await repo.update(item, { status: 'eaten', eatenAt: Date.now() });
    writeQueue.enqueue({
      type: 'markItemEaten',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });
    trackItemMarkedEaten(item.expiryAt);
  }

  /** Mark item as tossed — optimistic local write + enqueue. */
  async markItemTossed(db: Database, id: string): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await repo.update(item, { status: 'tossed', tossedAt: Date.now() });
    writeQueue.enqueue({
      type: 'markItemTossed',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });
    trackItemTossed(item.expiryAt);
  }

  /** Mark item as frozen — optimistic local write + enqueue. */
  async markItemFrozen(db: Database, id: string): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await repo.update(item, { status: 'frozen', frozenAt: Date.now() });
    writeQueue.enqueue({
      type: 'markItemFrozen',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });
  }

  /** Mark item as partially consumed, updating quantity fields. */
  async markItemPartial(db: Database, id: string, input: MarkPartialInput): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await repo.update(item, {
      status: 'partial',
      quantityText: input.quantityText,
      quantityValue: input.quantityValue,
      quantityUnit: input.quantityUnit,
    });
    writeQueue.enqueue({
      type: 'markItemPartial',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        quantityText: input.quantityText,
        quantityValue: input.quantityValue ?? null,
        quantityUnit: input.quantityUnit ?? null,
      },
    });
  }

  /** Snooze expiry alert by extending expiryAt by N days. */
  async snoozeItem(db: Database, id: string, days: number): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    const newExpiry = (item.expiryAt ?? Date.now()) + days * 24 * 60 * 60 * 1000;
    await repo.update(item, { expiryAt: newExpiry });
    writeQueue.enqueue({
      type: 'updateItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        id: item.cloudId,
        householdId: item.householdId,
        expiryAt: new Date(newExpiry).toISOString(),
      },
    });
  }

  /** Soft-delete an item (sets deletedAt, filters out of all queries). */
  async deleteItem(db: Database, id: string): Promise<void> {
    const repo = new ItemRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error(`Item ${id} not found`);
    await repo.softDelete(item);
    writeQueue.enqueue({
      type: 'deleteItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });
  }

  /**
   * Look up a scanned barcode via the Open Food Facts API (no key required).
   */
  async lookupBarcode(
    barcode: string,
  ): Promise<(BarcodeResult & { nutritionalData?: NutritionalData }) | null> {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,serving_size,image_front_small_url,nutriments`,
      );
      if (!res.ok) return null;
      const json = (await res.json()) as {
        status: number;
        product?: {
          product_name?: string;
          brands?: string;
          serving_size?: string;
          image_front_small_url?: string;
          nutriments?: {
            'energy-kcal_100g'?: number;
            proteins_100g?: number;
            carbohydrates_100g?: number;
            fat_100g?: number;
            fiber_100g?: number;
            sugars_100g?: number;
            sodium_100g?: number;
          };
        };
      };
      if (json.status !== 1 || !json.product) return null;
      const p = json.product;
      return {
        product: p.product_name,
        brand: p.brands,
        servingSize: p.serving_size,
        imageUrl: p.image_front_small_url,
        nutritionalData: p.nutriments
          ? {
              caloriesPer100g: p.nutriments['energy-kcal_100g'],
              proteinPer100g: p.nutriments.proteins_100g,
              carbsPer100g: p.nutriments.carbohydrates_100g,
              fatPer100g: p.nutriments.fat_100g,
              fiberPer100g: p.nutriments.fiber_100g,
              sugarPer100g: p.nutriments.sugars_100g,
              sodiumPer100g: p.nutriments.sodium_100g,
            }
          : undefined,
      };
    } catch {
      return null;
    }
  }

  /** Call the classify-food Lambda via AppSync. Returns item with AI classification. */
  async classifyPhoto(db: Database, householdId: string, photoUrl: string): Promise<Item | null> {
    try {
      const result = await (client.graphql as Function)({
        query: CLASSIFY_FOOD,
        variables: { householdId, photoUrl },
      });
      if (!result.data?.classifyFood) return null;
      const cloudItem = result.data.classifyFood;
      const repo = new ItemRepository(db);
      return await repo.upsertFromCloud(cloudItem);
    } catch (err) {
      console.error('[ItemsService] classifyPhoto failed:', err);
      throw err;
    }
  }

  /** Call the ocr-expiry-date Lambda via AppSync. Returns detected expiry date string. */
  async ocrExpiryDate(householdId: string, photoUrl: string): Promise<string | null> {
    try {
      const result = await (client.graphql as Function)({
        query: OCR_EXPIRY_DATE,
        variables: { householdId, photoUrl },
      });
      return result.data?.ocrExpiryDate ?? null;
    } catch (err) {
      console.error('[ItemsService] ocrExpiryDate failed:', err);
      throw err;
    }
  }
}

export const itemsService = new ItemsService();
