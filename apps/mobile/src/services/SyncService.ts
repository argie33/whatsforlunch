import { AppState, AppStateStatus } from 'react-native';
import { Database } from '@nozbe/watermelondb';
import { SyncEngine, SyncState, DeltaSyncPayload, CloudItem } from '../db/sync';
import { writeQueue, QueuedOp } from '../db/queue';
import { graphQLRequest } from '../lib/graphql-client';
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
  ON_ITEM_UPDATE,
  ON_HOUSEHOLD_UPDATE,
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
    // TODO: Re-enable subscriptions when WebSocket support is available
    // this.startSubscriptions(householdId);
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
    const lastSyncTimestamp = lastSync ? new Date(lastSync).toISOString() : null;

    const result = await graphQLRequest<{ deltaSync: DeltaSyncPayload }>(DELTA_SYNC, {
      input: { householdId, lastSyncTimestamp },
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
        const r = await graphQLRequest<{ createItem: any }>(CREATE_ITEM, {
          input: { ...payload, clientId: cloudId },
        });
        return r?.createItem ?? null;
      }
      case 'updateItem': {
        const r = await graphQLRequest<{ updateItem: any }>(UPDATE_ITEM, {
          input: { id: cloudId, ...payload },
        });
        return r?.updateItem ?? null;
      }
      case 'deleteItem': {
        await graphQLRequest<{ deleteItem: any }>(DELETE_ITEM, {
          id: cloudId,
          householdId,
        });
        return null;
      }
      case 'markItemEaten': {
        const r = await graphQLRequest<{ markItemEaten: any }>(MARK_ITEM_EATEN, {
          id: cloudId,
          householdId,
        });
        return r?.markItemEaten ?? null;
      }
      case 'markItemTossed': {
        const r = await graphQLRequest<{ markItemTossed: any }>(MARK_ITEM_TOSSED, {
          id: cloudId,
          householdId,
        });
        return r?.markItemTossed ?? null;
      }
      case 'markItemFrozen': {
        const r = await graphQLRequest<{ markItemFrozen: any }>(MARK_ITEM_FROZEN, {
          id: cloudId,
          householdId,
        });
        return r?.markItemFrozen ?? null;
      }
      case 'markItemPartial': {
        const r = await graphQLRequest<{ markItemPartial: any }>(MARK_ITEM_PARTIAL, {
          id: cloudId,
          householdId,
          input: payload,
        });
        return r?.markItemPartial ?? null;
      }
      case 'claimContainer': {
        const r = await graphQLRequest<{ claimContainer: any }>(CLAIM_CONTAINER, {
          input: { householdId, qrToken: payload.qrToken, ...payload },
        });
        const c = r?.claimContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      case 'updateContainer': {
        const r = await graphQLRequest<{ updateContainer: any }>(UPDATE_CONTAINER, {
          input: { containerId: cloudId, householdId, ...payload },
        });
        const c = r?.updateContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      case 'archiveContainer': {
        const r = await graphQLRequest<{ archiveContainer: any }>(ARCHIVE_CONTAINER, {
          input: { containerId: cloudId, householdId },
        });
        const c = r?.archiveContainer;
        return c ? { id: c.id, _version: c._version, _lastChangedAt: c._lastChangedAt } : null;
      }
      default:
        return null;
    }
  }

  // ─── Real-time subscriptions ───────────────────────────────────────────────

  private startSubscriptions(householdId: string): void {
    // Item changes (create/update/mark*)
    const itemSub = (client.graphql as Function)({
      query: ON_ITEM_UPDATE,
      variables: { householdId },
    }).subscribe({
      next: ({ data }: { data: { onItemUpdate: CloudItem } }) => {
        const item = data?.onItemUpdate;
        if (!item) return;
        this.engine
          .applyDelta({
            containers: [],
            items: [item],
            shoppingList: [],
            serverTimestamp: new Date().toISOString(),
          })
          .catch(console.error);
      },
      error: (err: unknown) => {
        console.error('[SyncService] onItemUpdate subscription error', err);
      },
    });
    this.subscriptionHandles.push(() => itemSub.unsubscribe());

    // Container / household-level changes
    const householdSub = (client.graphql as Function)({
      query: ON_HOUSEHOLD_UPDATE,
      variables: { householdId },
    }).subscribe({
      next: ({ data }: { data: { onHouseholdUpdate: unknown } }) => {
        const container = data?.onHouseholdUpdate;
        if (!container) return;
        this.engine
          .applyDelta({
            containers: [
              container as Parameters<typeof this.engine.applyDelta>[0]['containers'][0],
            ],
            items: [],
            shoppingList: [],
            serverTimestamp: new Date().toISOString(),
          })
          .catch(console.error);
      },
      error: (err: unknown) => {
        console.error('[SyncService] onHouseholdUpdate subscription error', err);
      },
    });
    this.subscriptionHandles.push(() => householdSub.unsubscribe());
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private emit(patch: Partial<SyncState>): void {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((l) => l(this.state));
  }
}

export const createSyncService = (db: Database): SyncService => new SyncService(db);
