import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { generateClient } from 'aws-amplify/api';
import { ShoppingListRepository } from '@/db/repositories';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';
import { writeQueue } from '@/db/queue';

const client = generateClient();

export interface ShoppingListItemCreateInput {
  householdId: string;
  name: string;
  quantity?: string;
  category?: string;
  notes?: string;
  addedByUserId: string;
  autoSuggested?: boolean;
}

export interface ShoppingListItemUpdateInput {
  id: string;
  householdId: string;
  name?: string;
  quantity?: string;
  category?: string;
  notes?: string;
}

export interface ShoppingListStats {
  total: number;
  purchased: number;
  pending: number;
}

export class ShoppingListService {
  /** Get all shopping items for a household (cached via live query). */
  observeAll(db: Database, householdId: string) {
    const repo = new ShoppingListRepository(db);
    return repo.observeByHousehold(householdId);
  }

  /** Get only unpurchased items (cached via live query). */
  observePending(db: Database, householdId: string) {
    const repo = new ShoppingListRepository(db);
    return repo.observePending(householdId);
  }

  /** Fetch all items synchronously. */
  async fetchAll(db: Database, householdId: string): Promise<ShoppingListItem[]> {
    const repo = new ShoppingListRepository(db);
    return repo.collection
      .query(Q.where('household_id', householdId), Q.where('deleted_at', Q.eq(null)))
      .fetch();
  }

  /** Fetch only unpurchased items synchronously. */
  async fetchPending(db: Database, householdId: string): Promise<ShoppingListItem[]> {
    const repo = new ShoppingListRepository(db);
    return repo.collection
      .query(
        Q.where('household_id', householdId),
        Q.where('purchased_at', Q.eq(null)),
        Q.where('deleted_at', Q.eq(null)),
      )
      .fetch();
  }

  /** Get a single shopping list item. */
  async getItem(db: Database, id: string): Promise<ShoppingListItem | null> {
    const repo = new ShoppingListRepository(db);
    return repo.findById(id);
  }

  /** Create a new shopping list item. */
  async addItem(db: Database, input: ShoppingListItemCreateInput): Promise<ShoppingListItem> {
    const repo = new ShoppingListRepository(db);
    const item = await repo.create({
      householdId: input.householdId,
      name: input.name,
      quantity: input.quantity,
      category: input.category,
      notes: input.notes,
      addedByUserId: input.addedByUserId,
      autoSuggested: input.autoSuggested,
    });

    writeQueue.enqueue({
      type: 'addShoppingListItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        notes: item.notes,
        addedByUserId: item.addedByUserId,
        autoSuggested: item.autoSuggested,
      },
    });

    return item;
  }

  /** Update a shopping list item. */
  async updateItem(db: Database, input: ShoppingListItemUpdateInput): Promise<ShoppingListItem> {
    const repo = new ShoppingListRepository(db);
    const item = await repo.findById(input.id);
    if (!item) throw new Error('Shopping list item not found');

    await repo.db.write(async () => {
      await item.update((record) => {
        if (input.name !== undefined) record.name = input.name;
        if (input.quantity !== undefined) record.quantity = input.quantity;
        if (input.category !== undefined) record.category = input.category;
        if (input.notes !== undefined) record.notes = input.notes;
        record.lastChangedAt = Date.now();
      });
    });

    writeQueue.enqueue({
      type: 'updateShoppingListItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        notes: item.notes,
      },
    });

    return item;
  }

  /** Mark an item as purchased. */
  async markPurchased(db: Database, id: string, userId: string): Promise<ShoppingListItem> {
    const repo = new ShoppingListRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error('Shopping list item not found');

    await repo.markPurchased(item, userId);

    writeQueue.enqueue({
      type: 'markShoppingItemPurchased',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {
        purchasedAt: Date.now(),
        purchasedByUserId: userId,
      },
    });

    return item;
  }

  /** Mark an item as not purchased. */
  async markUnpurchased(db: Database, id: string): Promise<ShoppingListItem> {
    const repo = new ShoppingListRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error('Shopping list item not found');

    await repo.db.write(async () => {
      await item.update((record) => {
        record.purchasedAt = undefined;
        record.purchasedByUserId = undefined;
        record.lastChangedAt = Date.now();
      });
    });

    writeQueue.enqueue({
      type: 'markShoppingItemUnpurchased',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });

    return item;
  }

  /** Delete a shopping list item. */
  async deleteItem(db: Database, id: string): Promise<void> {
    const repo = new ShoppingListRepository(db);
    const item = await repo.findById(id);
    if (!item) throw new Error('Shopping list item not found');

    await repo.softDelete(item);

    writeQueue.enqueue({
      type: 'deleteShoppingListItem',
      localId: item.id,
      cloudId: item.cloudId,
      householdId: item.householdId,
      payload: {},
    });
  }

  /** Get stats about the shopping list. */
  async getStats(db: Database, householdId: string): Promise<ShoppingListStats> {
    const all = await this.fetchAll(db, householdId);
    const purchased = all.filter((i) => i.purchasedAt).length;

    return {
      total: all.length,
      purchased,
      pending: all.length - purchased,
    };
  }

  /** Get items by category. */
  async getByCategory(
    db: Database,
    householdId: string,
    category: string,
  ): Promise<ShoppingListItem[]> {
    const all = await this.fetchAll(db, householdId);
    return all.filter((i) => i.category === category);
  }
}

export const shoppingListService = new ShoppingListService();
