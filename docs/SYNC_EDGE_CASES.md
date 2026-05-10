# Sync Edge Cases

Documents known edge cases in the WFL offline sync system, the chosen resolution strategy, and where each is implemented.

---

## 1. Unconfirmed local write vs incoming cloud delta

**Scenario**: User creates an item on device A (cloudId not yet confirmed — `version = 0`). Before the push succeeds, device B updates the same item and the server pushes the delta to device A.

**Resolution**: `resolveField` treats `version = 0` as tentative. Cloud always wins — local value is overwritten.

**Rationale**: An unconfirmed write may have failed silently (network drop between enqueue and drain). Keeping the cloud value avoids phantom divergence. If the local write was genuinely new, the queue will re-push it and the server will reconcile via its own conflict logic.

**Implementation**: `apps/mobile/src/db/conflict.ts` — `resolveField`, line checking `localVersion === 0`.

---

## 2. Backward status transition in cloud delta

**Scenario**: Two devices each hold an item as `active`. Device A marks it `eaten`. The server echoes this back. Meanwhile a stale delta from before A's write carries `active` status and arrives on device A.

**Resolution**: `isForwardStatus` enforces a one-way state machine. `eaten → active` is rejected at the client. The item remains `eaten`.

**Status order**:
```
active (0) → partial (1) | frozen (1) → eaten (2) | tossed (2) | transferred (2)
```

Transitions within the same tier (e.g., `frozen → partial`) are permitted. No transition goes backwards.

**Implementation**: `apps/mobile/src/db/conflict.ts` — `isForwardStatus`, `resolveField` `status` case.

---

## 3. Simultaneous mark-eaten from two devices

**Scenario**: Device A and device B both tap "Mark Eaten" offline. Both enqueue a `markItemEaten` op. Both drain when online. Server processes both mutations; both succeed (idempotent). The delta sync brings `eaten` to both devices.

**Resolution**: Both devices land in terminal state `eaten`. `isForwardStatus('eaten', 'eaten')` is `true` (same tier), so the cloud write is accepted. No conflict.

---

## 4. Offline edit collapsed by deduplication

**Scenario**: User edits an item's notes three times while offline. Each edit triggers `writeQueue.enqueue` with `type = 'updateItem'` and the same `localId`.

**Resolution**: `enqueue` deduplicates by `localId + type`. Only the latest op survives. When the queue drains, a single `updateItem` mutation is sent to the server.

**Implementation**: `apps/mobile/src/db/queue.ts` — `enqueue` dedup logic.

---

## 5. Create + lifecycle ops queued offline for same item

**Scenario**: User creates a new container, adds an item to it, then marks the item as eaten — all while offline.

**Queue state**: Three distinct ops with different `type` values:
1. `createItem` (localId = X)
2. `markItemEaten` (localId = X)

`enqueue` does NOT dedup across different op types, so both ops are preserved in order.

**Drain order**: Ops are processed FIFO. If `createItem` succeeds and returns the confirmed `cloudId`, the `confirmPush` call stamps the local record. The subsequent `markItemEaten` uses `cloudId` from the QueuedOp, which was set at enqueue time from the local ID. **Caveat**: if `createItem` returned a different `cloudId` than the local one, the `markItemEaten` op will carry a stale `cloudId`.

**Mitigation**: After `confirmPush`, the `SyncService` should update any pending queue ops that reference the same `localId` with the confirmed `cloudId`. **This is not yet implemented — tracked as a follow-on.** For now the server de-dupes by `clientId` on `createItem`, and `markItemEaten` with an unrecognised ID returns a 404 which the queue marks as a retry.

---

## 6. Partial delta (server returns incomplete batch)

**Scenario**: AppSync returns a partial `deltaSync` response due to a connection drop mid-stream.

**Resolution**: `SyncService.pull` awaits the full GraphQL response. If the request fails, the catch block sets status to `error` and does not update `lastSyncedAt`. The next sync triggers a full re-pull from the previous `lastSyncedAt`.

**Risk**: If the request partially completes and the SDK returns partial data without throwing, some records may be applied without advancing `lastSyncedAt`. This could lead to duplicate applies on the next pull, which is safe because `upsertFromCloud` uses last-write-wins.

---

## 7. Retry exhaustion — permanent failure

**Scenario**: A queued op fails 5 consecutive times (network unreachable, server 5xx, etc.).

**Resolution**: `writeQueue.markRetry` returns `false` on the 5th failure and silently drops the op. The local record that triggered the op remains in WatermelonDB with `version = 0` (unconfirmed). On the next successful `deltaSync`, if the server does not include this record, the local record persists but is effectively orphaned from the cloud.

**Mitigation**: A future "stale unconfirmed" sweep should detect records with `version = 0` older than N days and surface them in a "needs attention" UI. Not yet implemented.

---

## 8. Clock skew between devices

**Scenario**: Device A has a system clock that is 5 minutes ahead of device B. Both update the same item's notes. LWW uses `_lastChangedAt` timestamps.

**Resolution**: LWW will incorrectly favor device A's edit because its timestamp is artificially higher. The server does not normalise client timestamps — it trusts them.

**Mitigation**: In production, Amplify Auth + AppSync pipeline resolvers stamp writes with the server-side `$util.time.nowISO8601()` in `_lastChangedAt`. The `_lastChangedAt` returned by mutation confirms the server timestamp. After `confirmPush`, the local record is updated with the server timestamp, which corrects future LWW decisions.

For local dev (DynamoDB Local), the server timestamp is generated by the local Node.js process, so clock skew does not apply.

---

## 9. Soft-delete tombstone propagation

**Scenario**: Device A deletes an item. The server sets `deletedAt` on the record and returns it in the next `deltaSync` for other devices.

**Resolution**: `upsertFromCloud` checks `deletedAt`. If set, the local record's `deletedAt` column is populated. UI queries use `Q.where('deleted_at', null)` to filter tombstoned records out of lists. The record persists in the local DB for audit/undo.

**Purge**: Tombstoned records older than 30 days should be purged from WatermelonDB. Not yet implemented.

---

## 10. Food rules version bump

**Scenario**: Server publishes a new `FoodRule` dataset (e.g., updated shelf-life data for dairy). All clients need to receive the update.

**Resolution**: `FoodRuleRepository.upsertAllFromCloud` uses `db.batch()` to atomically replace all food rules in a single DB transaction. `getLatestVersion()` is checked before each sync; if the cloud version is higher, a full food rule pull is triggered.

**Implementation**: `apps/mobile/src/db/repositories/FoodRuleRepository.ts`.

---

## 11. Race between subscription event and deltaSync pull

**Scenario**: AppSync subscription delivers an `onItemUpdate` event for item X at the same time `deltaSync` includes item X in its delta response.

**Resolution**: Both paths call `upsertFromCloud`. Whichever arrives first writes the record. The second call runs the same LWW logic — since timestamps are identical (same server event), the cloud value is accepted on both calls, resulting in the same final state. Idempotent.

---

## 12. SyncProvider receives null householdId on cold start

**Scenario**: App launches but Amplify Auth hasn't resolved yet, so `householdId` is `null`. `SyncProvider` calls `SyncService.start(null)`.

**Resolution**: `SyncService.start` skips if `householdId` is falsy. Once auth resolves and `householdId` becomes non-null, the `SyncProvider` calls `start(householdId)`.

**Implementation**: `apps/mobile/src/services/SyncContext.tsx` — `useEffect` watches `householdId`.
