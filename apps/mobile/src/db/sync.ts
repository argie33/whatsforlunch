import { Database } from '@nozbe/watermelondb';
import { ItemRepository } from './repositories/ItemRepository';
import { ContainerRepository } from './repositories/ContainerRepository';
import { HouseholdRepository } from './repositories/HouseholdRepository';
import { ShoppingListRepository } from './repositories/ShoppingListRepository';

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  pendingCount: number;
  error: string | null;
}

export interface DeltaSyncPayload {
  containers: CloudContainer[];
  items: CloudItem[];
  shoppingList: CloudShoppingListItem[];
  serverTimestamp: string;
}

export interface CloudContainer {
  id: string;
  householdId: string;
  qrToken: string;
  nickname?: string | null;
  imageUrl?: string | null;
  claimedAt: number;
  archivedAt?: number | null;
  _version: number;
  _lastChangedAt: number;
  deletedAt?: number | null;
}

export interface CloudItem {
  id: string;
  householdId: string;
  containerId?: string | null;
  addedByUserId: string;
  foodType: string;
  foodName: string;
  category: string;
  storageLocation: string;
  quantityText?: string | null;
  quantityValue?: number | null;
  quantityUnit?: string | null;
  storedAt: number;
  storedTz: string;
  expiryAt: number;
  expirySource: string;
  expiryConfidence?: number | null;
  notes?: string | null;
  photoUrl?: string | null;
  barcode?: string | null;
  priceUsd?: number | null;
  status: string;
  eatenAt?: number | null;
  tossedAt?: number | null;
  frozenAt?: number | null;
  transferredToContainerId?: string | null;
  _version: number;
  _lastChangedAt: number;
  deletedAt?: number | null;
}

export interface CloudShoppingListItem {
  id: string;
  householdId: string;
  name: string;
  quantity?: string | null;
  category?: string | null;
  notes?: string | null;
  addedByUserId: string;
  purchasedAt?: number | null;
  purchasedByUserId?: string | null;
  autoSuggested: boolean;
  _version: number;
  _lastChangedAt: number;
  deletedAt?: number | null;
}

export interface PushBatch {
  householdId: string;
  items: Array<{ cloudId: string; localId: string; data: Partial<CloudItem> }>;
  containers: Array<{ cloudId: string; localId: string; data: Partial<CloudContainer> }>;
  shoppingList: Array<{
    cloudId: string;
    localId: string;
    data: Partial<CloudShoppingListItem>;
  }>;
}

export class SyncEngine {
  private readonly db: Database;
  private readonly items: ItemRepository;
  private readonly containers: ContainerRepository;
  private readonly households: HouseholdRepository;
  private readonly shoppingList: ShoppingListRepository;

  constructor(db: Database) {
    this.db = db;
    this.items = new ItemRepository(db);
    this.containers = new ContainerRepository(db);
    this.households = new HouseholdRepository(db);
    this.shoppingList = new ShoppingListRepository(db);
  }

  /**
   * Apply a delta payload from the cloud (pull phase).
   * Inserts or updates local records, respecting per-field conflict rules.
   */
  async applyDelta(payload: DeltaSyncPayload): Promise<void> {
    await Promise.all([
      ...payload.containers.map((c) =>
        this.containers.upsertFromCloud({
          id: c.id,
          householdId: c.householdId,
          qrToken: c.qrToken,
          nickname: c.nickname,
          imageUrl: c.imageUrl,
          claimedAt: c.claimedAt,
          archivedAt: c.archivedAt,
          version: c._version,
          lastChangedAt: c._lastChangedAt,
          deletedAt: c.deletedAt,
        }),
      ),
      ...payload.items.map((item) =>
        this.items.upsertFromCloud({
          id: item.id,
          householdId: item.householdId,
          containerId: item.containerId,
          addedByUserId: item.addedByUserId,
          foodType: item.foodType,
          foodName: item.foodName,
          category: item.category,
          storageLocation: item.storageLocation,
          quantityText: item.quantityText,
          quantityValue: item.quantityValue,
          quantityUnit: item.quantityUnit,
          storedAt: item.storedAt,
          storedTz: item.storedTz,
          expiryAt: item.expiryAt,
          expirySource: item.expirySource,
          expiryConfidence: item.expiryConfidence,
          notes: item.notes,
          photoUrl: item.photoUrl,
          barcode: item.barcode,
          priceUsd: item.priceUsd,
          status: item.status,
          eatenAt: item.eatenAt,
          tossedAt: item.tossedAt,
          frozenAt: item.frozenAt,
          transferredToContainerId: item.transferredToContainerId,
          version: item._version,
          lastChangedAt: item._lastChangedAt,
          deletedAt: item.deletedAt,
        }),
      ),
      ...payload.shoppingList.map((s) =>
        this.shoppingList.upsertFromCloud({
          id: s.id,
          householdId: s.householdId,
          name: s.name,
          quantity: s.quantity,
          category: s.category,
          notes: s.notes,
          addedByUserId: s.addedByUserId,
          purchasedAt: s.purchasedAt,
          purchasedByUserId: s.purchasedByUserId,
          autoSuggested: s.autoSuggested,
          version: s._version,
          lastChangedAt: s._lastChangedAt,
          deletedAt: s.deletedAt,
        }),
      ),
    ]);
  }

  /**
   * Collect all locally-dirty records that need to be pushed to cloud.
   * Phase B: This will batch and submit via AppSync mutations.
   */
  async collectPendingPush(householdId: string): Promise<PushBatch> {
    // TODO Phase B: query records with version=0 (created locally, never confirmed)
    // and records where lastChangedAt > lastConfirmedSyncAt
    return {
      householdId,
      items: [],
      containers: [],
      shoppingList: [],
    };
  }

  /**
   * Mark local records as confirmed after a successful push.
   * Called by SyncService after AppSync mutations return confirmed versions.
   */
  async confirmPush(
    _confirmations: Array<{ localId: string; cloudId: string; version: number; lastChangedAt: number }>,
  ): Promise<void> {
    // TODO Phase B: update local records with confirmed cloud version/timestamp
  }
}
