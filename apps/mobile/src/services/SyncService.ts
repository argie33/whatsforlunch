import { AppState, AppStateStatus } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { SyncEngine, SyncState, DeltaSyncPayload, CloudItem } from '../db/sync';
import { writeQueue, QueuedOp } from '../db/queue';
import { executeGraphQL } from '../lib/graphql-client';
import {
  DELTA_SYNC,
  CREATE_ITEM,
  UPDATE_ITEM,
  DELETE_ITEM,
  MARK_ITEM_EATEN,
  MARK_ITEM_TOSSED,
  MARK_ITEM_FROZEN,
  MARK_ITEM_PARTIAL,
  CLAIM_CONTAINER,
  UPDATE_CONTAINER,
  ARCHIVE_CONTAINER,
  ADD_SHOPPING_LIST_ITEM,
  UPDATE_SHOPPING_LIST_ITEM,
  DELETE_SHOPPING_LIST_ITEM,
  MARK_SHOPPING_ITEM_PURCHASED,
  MARK_SHOPPING_ITEM_UNPURCHASED,
} from '../db/graphql';

// Jitter range for retry back-off (ms)
const RETRY_BASE_MS = 2_000;
const MAX_RETRY_DELAY_MS = 60_000;

type Unsubscribe = () => void;

export class SyncService {
  private readonly engine: SyncEngine;
  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  };
  private subscribers: ((s: SyncState) => void)[] = [];
  private subscriptionHandles: Unsubscribe[] = [];
  private appStateUnsub?: Unsubscribe;
  private draining = false;

  constructor(db: Database) {
    this.engine = new SyncEngine(db);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: (s: SyncState) => void): Unsubscribe {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener);
    };
  }

  /**
   * Start background sync: subscribe to real-time events, sync on foreground.
   */
  start(householdId: string): void {
    // Enable subscriptions for real-time updates (AppSync in production, polling fallback)
    this.startSubscriptions(householdId);
    this.appStateUnsub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.sync(householdId).catch(console.error);
      }
    }).remove;
    // Initial sync
    this.sync(householdId).catch(console.error);
  }

  stop(): void {
    this.subscriptionHandles.forEach((u) => u());
    this.subscriptionHandles = [];
    this.appStateUnsub?.();
  }

  /**
   * Full sync: pull deltas then drain the write queue.
   */
  async sync(householdId: string): Promise<void> {
    if (this.state.status === 'syncing') return;
    this.emit({ status: 'syncing', error: null });
    try {
      await this.pull(householdId);
      await this.drainQueue();
      this.emit({ status: 'idle', lastSyncedAt: Date.now(), pendingCount: writeQueue.size() });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      this.emit({ status: 'error', error: message });
    }
  }

  /**
   * Enqueue a mutation to be pushed. Increments pendingCount immediately so
   * UI can show the pending indicator before the network call completes.
   */
  enqueue(op: Omit<QueuedOp, 'id' | 'retryCount' | 'enqueuedAt'>): void {
    writeQueue.enqueue(op);
    this.emit({ pendingCount: writeQueue.size() });
  }

  // ─── Pull ──────────────────────────────────────────────────────────────────

  private async pull(householdId: string): Promise<void> {
    const lastSync = this.state.lastSyncedAt;
    const lastSyncAt = lastSync ? new Date(lastSync).toISOString() : new Date(0).toISOString();

    const result = await executeGraphQL<{ deltaSync: DeltaSyncPayload }>(DELTA_SYNC, {
      householdId,
      lastSyncAt,
    });

    const data = result?.deltaSync as DeltaSyncPayload | undefined;
    if (!data) return;

    await this.engine.applyDelta(data);
  }

  // ─── Push ──────────────────────────────────────────────────────────────────

  private async drainQueue(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const ops = writeQueue.peek();
      for (const op of ops) {
        await this.submitOp(op);
      }
    } finally {
      this.draining = false;
    }
    this.emit({ pendingCount: writeQueue.size() });
  }

  private async submitOp(op: QueuedOp): Promise<void> {
    try {
      const confirmed = await this.callMutation(op);
      if (confirmed) {
        await this.engine.confirmPush([
          {
            localId: op.localId,
            cloudId: confirmed.id,
            version: confirmed._version,
            lastChangedAt: confirmed._lastChangedAt,
          },
        ]);
      }
      writeQueue.remove(op.id);
    } catch (err) {
      const keep = writeQueue.markRetry(op.id);
      if (!keep) {
        console.error(`[SyncService] Op ${op.type}/${op.cloudId} exhausted retries, dropped`);
      }
      // Don't rethrow — continue draining other ops
    }
  }

  private async callMutation(
    op: QueuedOp,
  ): Promise<{ id: string; _version: number; _lastChangedAt: number } | null> {
    const { type, cloudId, householdId, payload } = op;

    switch (type) {
      case 'createItem': {
        const r = await executeGraphQL<{ createItem: any }>(CREATE_ITEM, {
          input: { ...payload, clientId: cloudId },
        });
        return r?.createItem ?? null;
      }
      case 'updateItem': {
        const r = await executeGraphQL<{ updateItem: any }>(UPDATE_ITEM, {
          input: { id: cloudId, ...payload },
        });
        return r?.updateItem ?? null;
      }
      case 'deleteItem': {
        await executeGraphQL<{ deleteItem: any }>(DELETE_ITEM, {
          householdId,
          id: cloudId,
        });
        return null;
      }
      case 'markItemEaten': {
        const r = await executeGraphQL<{ markItemEaten: any }>(MARK_ITEM_EATEN, {
          id: cloudId,
          householdId,
        });
        return r?.markItemEaten ?? null;
      }
      case 'markItemTossed': {
        const r = await executeGraphQL<{ markItemTossed: any }>(MARK_ITEM_TOSSED, {
          id: cloudId,
          householdId,
        });
        return r?.markItemTossed ?? null;
      }
      case 'markItemFrozen': {
        const r = await executeGraphQL<{ markItemFrozen: any }>(MARK_ITEM_FROZEN, {
          id: cloudId,
          householdId,
        });
        return r?.markItemFrozen ?? null;
      }
      case 'markItemPartial': {
        const r = await executeGraphQL<{ markItemPartial: any }>(MARK_ITEM_PARTIAL, {
          id: cloudId,
          householdId,
          input: payload,
        });
        return r?.markItemPartial ?? null;
      }
      case 'claimContainer': {
        const r = await executeGraphQL<{ claimContainer: any }>(CLAIM_CONTAINER, {
          input: { householdId, qrToken: payload.qrToken, ...payload },
        });
        const c = r?.claimContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      case 'updateContainer': {
        const r = await executeGraphQL<{ updateContainer: any }>(UPDATE_CONTAINER, {
          input: { containerId: cloudId, householdId, ...payload },
        });
        const c = r?.updateContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      case 'archiveContainer': {
        const r = await executeGraphQL<{ archiveContainer: any }>(ARCHIVE_CONTAINER, {
          input: { containerId: cloudId, householdId },
        });
        const c = r?.archiveContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      case 'addShoppingListItem': {
        const r = await executeGraphQL<{ addShoppingListItem: any }>(ADD_SHOPPING_LIST_ITEM, {
          input: { ...payload, clientId: cloudId },
        });
        return r?.addShoppingListItem ?? null;
      }
      case 'updateShoppingListItem': {
        const r = await executeGraphQL<{ updateShoppingListItem: any }>(UPDATE_SHOPPING_LIST_ITEM, {
          input: { id: cloudId, ...payload },
        });
        return r?.updateShoppingListItem ?? null;
      }
      case 'deleteShoppingListItem': {
        await executeGraphQL<{ deleteShoppingListItem: any }>(DELETE_SHOPPING_LIST_ITEM, {
          id: cloudId,
          householdId,
        });
        return null;
      }
      case 'markShoppingItemPurchased': {
        const r = await executeGraphQL<{ markShoppingItemPurchased: any }>(
          MARK_SHOPPING_ITEM_PURCHASED,
          {
            id: cloudId,
            householdId,
          },
        );
        return r?.markShoppingItemPurchased ?? null;
      }
      case 'markShoppingItemUnpurchased': {
        const r = await executeGraphQL<{ markShoppingItemUnpurchased: any }>(
          MARK_SHOPPING_ITEM_UNPURCHASED,
          {
            id: cloudId,
            householdId,
          },
        );
        return r?.markShoppingItemUnpurchased ?? null;
      }
      default:
        return null;
    }
  }

  // ─── Real-time subscriptions ───────────────────────────────────────────────

  private startSubscriptions(householdId: string): void {
    // Try AppSync subscriptions (production); fall back to polling (local dev)
    const pollInterval = setInterval(() => {
      if (this.state.status !== 'syncing') {
        this.sync(householdId).catch((err) => {
          console.error('Subscription poll failed:', err);
          this.emit({ error: 'Real-time sync temporarily unavailable' });
        });
      }
    }, 30_000); // Poll every 30 seconds as fallback

    this.subscriptionHandles.push(() => clearInterval(pollInterval));

    // In production with real AppSync, subscribe to:
    // - onItemChanged: when items are added/modified/deleted
    // - onHouseholdChanged: when household settings change
    // - onContainerChanged: when containers are claimed/updated
    // This would replace polling with WebSocket real-time updates
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private emit(patch: Partial<SyncState>): void {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((l) => l(this.state));
  }
}

export const createSyncService = (db: Database): SyncService => new SyncService(db);
