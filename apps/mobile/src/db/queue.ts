import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'wfl-sync-queue' });
const QUEUE_KEY = 'ops';

export type OpType =
  | 'createItem'
  | 'updateItem'
  | 'deleteItem'
  | 'markItemEaten'
  | 'markItemTossed'
  | 'markItemFrozen'
  | 'markItemPartial';

export interface QueuedOp {
  id: string;
  type: OpType;
  localId: string;
  cloudId: string;
  householdId: string;
  payload: Record<string, unknown>;
  retryCount: number;
  enqueuedAt: number;
}

const MAX_RETRIES = 5;

function load(): QueuedOp[] {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedOp[];
  } catch {
    return [];
  }
}

function save(ops: QueuedOp[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(ops));
}

export const writeQueue = {
  enqueue(op: Omit<QueuedOp, 'id' | 'retryCount' | 'enqueuedAt'>): QueuedOp {
    const queued: QueuedOp = {
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      retryCount: 0,
      enqueuedAt: Date.now(),
    };
    const ops = load();
    // Replace any prior op for the same localId + type to avoid duplicate pushes
    const deduped = ops.filter(
      (o) => !(o.localId === op.localId && o.type === op.type),
    );
    deduped.push(queued);
    save(deduped);
    return queued;
  },

  peek(): QueuedOp[] {
    return load();
  },

  size(): number {
    return load().length;
  },

  remove(opId: string): void {
    const ops = load().filter((o) => o.id !== opId);
    save(ops);
  },

  markRetry(opId: string): boolean {
    const ops = load();
    const idx = ops.findIndex((o) => o.id === opId);
    if (idx === -1) return false;
    ops[idx].retryCount += 1;
    if (ops[idx].retryCount >= MAX_RETRIES) {
      // Drop permanently exhausted ops
      ops.splice(idx, 1);
      save(ops);
      return false;
    }
    save(ops);
    return true;
  },

  clear(): void {
    storage.delete(QUEUE_KEY);
  },
};
