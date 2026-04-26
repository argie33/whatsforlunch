import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { ShoppingListItem } from '../models/ShoppingListItem';

export interface CreateShoppingListItemInput {
  householdId: string;
  name: string;
  quantity?: string;
  category?: string;
  notes?: string;
  addedByUserId: string;
  autoSuggested?: boolean;
}

export class ShoppingListRepository extends BaseRepository<ShoppingListItem> {
  protected get collection(): Collection<ShoppingListItem> {
    return this.db.get<ShoppingListItem>('shopping_list_items');
  }

  observeByHousehold(householdId: string): Observable<ShoppingListItem[]> {
    return this.collection
      .query(
        Q.where('household_id', householdId),
        Q.where('deleted_at', Q.eq(null)),
      )
      .observe() as unknown as Observable<ShoppingListItem[]>;
  }

  observePending(householdId: string): Observable<ShoppingListItem[]> {
    return this.collection
      .query(
        Q.where('household_id', householdId),
        Q.where('purchased_at', Q.eq(null)),
        Q.where('deleted_at', Q.eq(null)),
      )
      .observe() as unknown as Observable<ShoppingListItem[]>;
  }

  async create(input: CreateShoppingListItemInput): Promise<ShoppingListItem> {
    return this.db.write(async () => {
      return this.collection.create((record) => {
        record.cloudId = this.generateId();
        record.householdId = input.householdId;
        record.name = input.name;
        if (input.quantity) record.quantity = input.quantity;
        if (input.category) record.category = input.category;
        if (input.notes) record.notes = input.notes;
        record.addedByUserId = input.addedByUserId;
        record.autoSuggested = input.autoSuggested ?? false;
        record.version = 0;
        record.lastChangedAt = this.now();
      });
    });
  }

  async markPurchased(item: ShoppingListItem, userId: string): Promise<void> {
    await this.db.write(async () => {
      await item.update((record) => {
        record.purchasedAt = this.now();
        record.purchasedByUserId = userId;
        record.lastChangedAt = this.now();
      });
    });
  }

  async softDelete(item: ShoppingListItem): Promise<void> {
    await this.db.write(async () => {
      await item.update((record) => {
        record.deletedAt = this.now();
        record.lastChangedAt = this.now();
      });
    });
  }

  async upsertFromCloud(data: {
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
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<ShoppingListItem> {
    return this.db.write(async () => {
      const existing = await this.findByCloudId(data.id);
      if (existing) {
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          record.name = data.name;
          if (data.quantity != null) record.quantity = data.quantity;
          if (data.category != null) record.category = data.category;
          if (data.notes != null) record.notes = data.notes;
          if (data.purchasedAt != null) record.purchasedAt = data.purchasedAt;
          if (data.purchasedByUserId != null) record.purchasedByUserId = data.purchasedByUserId;
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.collection.create((record) => {
        record.cloudId = data.id;
        record.householdId = data.householdId;
        record.name = data.name;
        if (data.quantity != null) record.quantity = data.quantity;
        if (data.category != null) record.category = data.category;
        if (data.notes != null) record.notes = data.notes;
        record.addedByUserId = data.addedByUserId;
        if (data.purchasedAt != null) record.purchasedAt = data.purchasedAt;
        if (data.purchasedByUserId != null) record.purchasedByUserId = data.purchasedByUserId;
        record.autoSuggested = data.autoSuggested;
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }
}
