// Per-field conflict resolution rules per docs/02_DATA_MODEL.md.
//
// Rule summary:
//   quantityValue  — server-side sum-delta; client sends delta, not absolute
//   status         — forward-only state machine; server wins
//   notes          — last-write-wins by _lastChangedAt
//   everything else — last-write-wins by _lastChangedAt

export type ItemStatus = 'active' | 'partial' | 'eaten' | 'tossed' | 'frozen' | 'transferred';

// Status transition graph — only forward moves are allowed.
const STATUS_ORDER: Record<ItemStatus, number> = {
  active: 0,
  partial: 1,
  frozen: 1,
  eaten: 2,
  tossed: 2,
  transferred: 2,
};

/**
 * Returns true if `next` is a valid forward transition from `current`.
 * Server enforces this; client uses it to decide whether to apply cloud status.
 */
export function isForwardStatus(current: string, next: string): boolean {
  const c = STATUS_ORDER[current as ItemStatus];
  const n = STATUS_ORDER[next as ItemStatus];
  if (c === undefined || n === undefined) return false;
  return n >= c;
}

/**
 * Decide whether to apply a cloud value over the local value.
 * Returns the value that should be kept.
 */
export function resolveField<T>(
  field: string,
  localValue: T,
  cloudValue: T,
  localChangedAt: number,
  cloudChangedAt: number,
  localVersion: number,
): T {
  // Unconfirmed local write (version=0) is treated as tentative — cloud always wins
  if (localVersion === 0) return cloudValue;

  switch (field) {
    case 'status':
      // Forward-only: apply cloud only if it's a valid forward move from local
      return isForwardStatus(String(localValue), String(cloudValue))
        ? cloudValue
        : localValue;

    default:
      // Last-write-wins by timestamp
      return cloudChangedAt >= localChangedAt ? cloudValue : localValue;
  }
}

/**
 * Merge a cloud item snapshot onto a set of local field values.
 * Returns the merged result — only fields where cloud wins are overwritten.
 */
export function mergeItem(
  local: {
    status: string;
    quantityText?: string;
    quantityValue?: number;
    notes?: string;
    expiryAt?: number;
    nickname?: string;
    lastChangedAt: number;
    version: number;
  },
  cloud: {
    status: string;
    quantityText?: string | null;
    quantityValue?: number | null;
    notes?: string | null;
    expiryAt?: number;
    lastChangedAt: number;
  },
): Partial<typeof local> {
  const merged: Partial<typeof local> = {};

  const lww = (f: keyof typeof local) =>
    resolveField(f, local[f], (cloud as Record<string, unknown>)[f], local.lastChangedAt, cloud.lastChangedAt, local.version);

  merged.status = resolveField('status', local.status, cloud.status, local.lastChangedAt, cloud.lastChangedAt, local.version) as string;
  if (cloud.quantityText != null) merged.quantityText = lww('quantityText') as string | undefined;
  if (cloud.quantityValue != null) merged.quantityValue = lww('quantityValue') as number | undefined;
  if (cloud.notes != null) merged.notes = lww('notes') as string | undefined;
  if (cloud.expiryAt != null) merged.expiryAt = lww('expiryAt') as number | undefined;

  return merged;
}
