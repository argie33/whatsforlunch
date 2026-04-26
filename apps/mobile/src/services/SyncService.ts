import { Database } from '@nozbe/watermelondb';
import { SyncEngine, SyncState, DeltaSyncPayload } from '../db/sync';

const LAST_SYNC_KEY = 'wfl_last_sync_at';

export class SyncService {
  private readonly engine: SyncEngine;
  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingCount: 0,
    error: null,
  };
  private subscribers: Array<(state: SyncState) => void> = [];

  constructor(db: Database) {
    this.engine = new SyncEngine(db);
  }

  getState(): SyncState {
    return { ...this.state };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.subscribers.push(listener);
    return () => {
      this.subscribers = this.subscribers.filter((l) => l !== listener);
    };
  }

  private emit(patch: Partial<SyncState>): void {
    this.state = { ...this.state, ...patch };
    this.subscribers.forEach((l) => l(this.state));
  }

  /**
   * Full sync cycle: pull deltas then push local changes.
   * Phase B: wire in actual AppSync calls here.
   */
  async sync(householdId: string): Promise<void> {
    if (this.state.status === 'syncing') return;

    this.emit({ status: 'syncing', error: null });

    try {
      await this.pull(householdId);
      await this.push(householdId);
      const now = Date.now();
      this.emit({ status: 'idle', lastSyncedAt: now, pendingCount: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      this.emit({ status: 'error', error: message });
      throw err;
    }
  }

  /**
   * Pull phase: fetch deltas from cloud and apply locally.
   * Phase B: replace stub with real AppSync deltaSync query.
   */
  private async pull(householdId: string): Promise<void> {
    const lastSync = this.state.lastSyncedAt;
    const _lastSyncTimestamp = lastSync ? new Date(lastSync).toISOString() : null;

    // TODO Phase B: call AppSync deltaSync(input: { lastSyncTimestamp, householdId })
    // const result = await graphqlClient.query({ query: DELTA_SYNC, variables: { ... } });
    // await this.engine.applyDelta(result.data.deltaSync);

    // Stub: no-op until AppSync is deployed
    const stub: DeltaSyncPayload = {
      containers: [],
      items: [],
      shoppingList: [],
      serverTimestamp: new Date().toISOString(),
    };
    await this.engine.applyDelta(stub);
  }

  /**
   * Push phase: send locally-dirty records to cloud.
   * Phase B: replace stub with real AppSync mutations.
   */
  private async push(householdId: string): Promise<void> {
    const batch = await this.engine.collectPendingPush(householdId);
    const total = batch.items.length + batch.containers.length + batch.shoppingList.length;

    this.emit({ pendingCount: total });

    if (total === 0) return;

    // TODO Phase B: submit batch via AppSync mutations and call engine.confirmPush()
  }

  /**
   * Handle an AppSync subscription event (real-time push from cloud).
   * Called by the subscription listener when another household member makes a change.
   */
  async handleSubscriptionEvent(payload: DeltaSyncPayload): Promise<void> {
    await this.engine.applyDelta(payload);
  }
}

export const createSyncService = (db: Database): SyncService => new SyncService(db);
