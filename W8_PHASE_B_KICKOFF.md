# W8 Phase B — Mobile Sync Engine & Conflict Resolution

**Status**: Kickoff  
**Blockers**: None — W5 Phase C complete ✅  
**Target**: Days 22-28  
**Owner**: W8 (Mobile Sync)

---

## Phase B Scope

Implement local-first sync with conflict resolution:

### Core Sync Operations

1. **Pull**: Fetch changes from W2 AppSync → merge into WatermelonDB
   - [ ] Query AppSync for items/containers changed since last sync
   - [ ] Fetch only records with `_last_changed_at > lastSyncTime`
   - [ ] Handle pagination (large household)
   - [ ] Merge into local database with conflict detection
   - [ ] Update `lastSyncTime` after successful pull

2. **Push**: Send local changes to W2 AppSync
   - [ ] Queue local changes (created, updated, deleted)
   - [ ] Batch operations for efficiency
   - [ ] Send to AppSync mutations
   - [ ] Retry on network failure
   - [ ] Clear queue after successful push

3. **Conflict Resolution**: Handle divergent states
   - [ ] Detect: local version ≠ remote version + local modified after remote
   - [ ] Strategy: Last-write-wins (compare timestamps)
   - [ ] User notification: "Item was updated elsewhere"
   - [ ] Option to merge/overwrite/keep local

4. **Network State Management**
   - [ ] Detect connectivity (reachability)
   - [ ] Queue operations while offline
   - [ ] Auto-sync when online (backoff strategy)
   - [ ] Show sync status in UI (syncing, synced, offline)

5. **Data Versioning**
   - [ ] Track `_version` (incrementing number per record)
   - [ ] Track `_last_changed_at` (ISO timestamp)
   - [ ] Track `_last_changed_by_user_id` (who changed it)
   - [ ] Use for conflict detection

---

## WatermelonDB Schema (Already in Place)

All tables have sync metadata:

```typescript
// Every model has:
_version: number;           // Increment on each change
_last_changed_at: number;   // Milliseconds since epoch
deleted_at?: number;        // Soft delete timestamp

// Example from Item model:
@field('_version') _version!: number;
@field('_last_changed_at') _lastChangedAt!: number;
@field('deleted_at') deletedAt?: number;
```

---

## Sync Service Structure

### Core Methods

```typescript
// apps/mobile/src/services/SyncService.ts

export class SyncService {
  // Full sync (pull + push)
  async sync(householdId: string): Promise<SyncResult> {
    const pullResult = await this.pull(householdId);
    const pushResult = await this.push(householdId);
    return {
      itemsDownloaded: pullResult.count,
      itemsUploaded: pushResult.count,
      conflicts: pullResult.conflicts,
      timestamp: Date.now(),
    };
  }

  // Pull remote changes
  private async pull(householdId: string): Promise<PullResult> {
    const lastSync = await this.getLastSyncTime(householdId);
    
    // Query AppSync for changes since last sync
    const response = await this.queryChangedItems(householdId, lastSync);
    
    // Merge into WatermelonDB
    const conflicts = await this.mergeChanges(response.items);
    
    // Update sync time
    await this.setLastSyncTime(householdId, Date.now());
    
    return {
      count: response.items.length,
      conflicts,
    };
  }

  // Push local changes
  private async push(householdId: string): Promise<PushResult> {
    const queue = await this.getSyncQueue(householdId);
    
    if (queue.length === 0) return { count: 0 };
    
    // Batch mutations to AppSync
    for (const item of queue) {
      if (item.deleted_at) {
        await this.deleteItemRemote(item.id);
      } else {
        await this.upsertItemRemote(item);
      }
      
      // Mark as synced
      await this.removeSyncQueue(item.id);
    }
    
    return { count: queue.length };
  }

  // Merge remote changes with local state
  private async mergeChanges(remoteItems: RemoteItem[]): Promise<Conflict[]> {
    const db = this.getDatabase();
    const conflicts: Conflict[] = [];
    
    for (const remote of remoteItems) {
      const local = await db.get('items').find(remote.id).catch(() => null);
      
      if (!local) {
        // New item: insert
        await db.get('items').create((item) => {
          item.id = remote.id;
          item.foodName = remote.food_name;
          item._version = remote._version;
          item._lastChangedAt = remote._last_changed_at;
        });
        continue;
      }
      
      // Check for conflict (local modified after remote)
      if (local._lastChangedAt > remote._last_changed_at && local._version > remote._version) {
        conflicts.push({
          itemId: remote.id,
          localVersion: local._version,
          remoteVersion: remote._version,
          resolution: 'local_wins', // Last-write-wins strategy
        });
        continue;
      }
      
      // No conflict: update local
      if (remote._version > local._version) {
        await local.update((item) => {
          item.foodName = remote.food_name;
          item.storageLocation = remote.storage_location;
          item._version = remote._version;
          item._lastChangedAt = remote._last_changed_at;
        });
      }
    }
    
    return conflicts;
  }

  // Queue local change for sync
  async queueChange(householdId: string, itemId: string): Promise<void> {
    const db = this.getDatabase();
    await db.get('sync_queue').create((row) => {
      row.householdId = householdId;
      row.itemId = itemId;
      row.timestamp = Date.now();
    });
  }

  // Get queued changes
  private async getSyncQueue(householdId: string): Promise<Item[]> {
    const db = this.getDatabase();
    const queue = await db.get('sync_queue')
      .query(Q.where('household_id', Q.eq(householdId)))
      .fetch();
    
    return queue.map((row) => this.getItem(row.itemId));
  }

  // Store last sync time
  private async setLastSyncTime(householdId: string, time: number): Promise<void> {
    const mmkv = new MMKV();
    mmkv.setNumber(`lastSync:${householdId}`, time);
  }

  private async getLastSyncTime(householdId: string): Promise<number> {
    const mmkv = new MMKV();
    return mmkv.getNumber(`lastSync:${householdId}`) || 0;
  }
}
```

---

## Integration Points

### 1. Dashboard Pull-to-Refresh

```typescript
// apps/mobile/app/(main)/index.tsx

import { SyncService } from '@/services/SyncService';

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const syncService = new SyncService();
      const result = await syncService.sync(PLACEHOLDER_HOUSEHOLD);
      
      console.log(`Synced: ${result.itemsDownloaded} down, ${result.itemsUploaded} up`);
      
      if (result.conflicts.length > 0) {
        // Show conflict notification
        showToast({
          type: 'info',
          message: `${result.conflicts.length} items updated elsewhere`,
        });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <FlashList
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      {...otherProps}
    />
  );
}
```

### 2. Auto-Sync on Item Change

```typescript
// apps/mobile/src/services/ItemsService.ts

import { SyncService } from './SyncService';

export class ItemsService {
  async createItem(input: ItemCreateInput): Promise<Item> {
    // Create locally
    const item = await db.create('items', input);
    
    // Queue for sync
    const syncService = new SyncService();
    await syncService.queueChange(input.householdId, item.id);
    
    return item;
  }

  async markItemEaten(id: string): Promise<void> {
    // Update locally
    const item = await db.get('items').find(id);
    await item.update((i) => {
      i.status = 'eaten';
      i.eatenAt = Date.now();
      i._version += 1;
      i._lastChangedAt = Date.now();
    });
    
    // Queue for sync (happens automatically via database trigger)
  }
}
```

### 3. Network State Monitoring

```typescript
// apps/mobile/src/lib/sync.ts

import NetInfo from '@react-native-community/netinfo';
import { SyncService } from '@/services/SyncService';

export function useSyncManager(householdId: string) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'offline'>('idle');

  useEffect(() => {
    let unsubscribe: () => void;

    // Monitor network state
    NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        setSyncStatus('offline');
        return;
      }

      // Network connected: attempt sync
      setSyncStatus('syncing');
      
      const syncService = new SyncService();
      syncService.sync(householdId)
        .then(() => setSyncStatus('idle'))
        .catch((error) => {
          console.error('Sync error:', error);
          setSyncStatus('offline');
        });
    });

    return unsubscribe;
  }, [householdId]);

  return syncStatus;
}
```

### 4. Sync Status Indicator

```typescript
// Show sync status in header

import { useSyncManager } from '@/lib/sync';

export function DashboardHeader() {
  const syncStatus = useSyncManager(householdId);

  return (
    <XStack alignItems="center" gap="$2">
      <Text>Kitchen</Text>
      {syncStatus === 'syncing' && (
        <ActivityIndicator size="small" color="$brand/primary" />
      )}
      {syncStatus === 'offline' && (
        <Icon name="wifi-off" size={16} color="$status/urgent" />
      )}
    </XStack>
  );
}
```

---

## Conflict Resolution Strategy

### Scenario 1: Last-Write-Wins (Default)

```
Local:  Item version 2, changed at 2:00pm, status='eaten'
Remote: Item version 1, changed at 1:00pm, status='active'

→ Local wins (newer timestamp). Item stays 'eaten'.
```

### Scenario 2: Remote Changes First

```
Local:  Item version 1, changed at 1:00pm, status='active'
Remote: Item version 2, changed at 2:00pm, status='eaten'

→ Remote wins (newer). Item becomes 'eaten'.
```

### Scenario 3: Concurrent Changes (Conflict)

```
Local:  Item version 2, changed at 2:00pm, marked as 'eaten'
Remote: Item version 3, changed at 2:30pm, storage='freezer'

→ Conflict detected. Show toast:
   "Item updated elsewhere. Your local change may be overwritten.
    Retry to push your local version."
```

---

## Sync Queue Table (WatermelonDB)

```typescript
@tableSchema({
  name: 'sync_queue',
  columns: [
    { name: 'household_id', type: 'string', isIndexed: true },
    { name: 'item_id', type: 'string' },
    { name: 'operation', type: 'string' }, // 'create', 'update', 'delete'
    { name: 'timestamp', type: 'number' },
  ]
})
export class SyncQueueRecord extends Model {
  @field('household_id') householdId!: string;
  @field('item_id') itemId!: string;
  @field('operation') operation!: 'create' | 'update' | 'delete';
  @field('timestamp') timestamp!: number;
}
```

---

## Testing Checklist for Phase B

- [ ] Pull from AppSync merges items correctly
- [ ] Push to AppSync queues local changes
- [ ] Conflict resolution picks correct version
- [ ] Last-write-wins strategy works
- [ ] Soft deletes (deleted_at) work
- [ ] Offline queue persists across app restart
- [ ] Auto-sync on reconnect works
- [ ] Pull-to-refresh triggers sync
- [ ] Sync status indicator shows state
- [ ] Network detection (online/offline) works
- [ ] No data loss during sync
- [ ] Concurrent edits resolved correctly

---

## Success Criteria

✅ Phase B complete when:
1. Pull from AppSync downloads changes
2. Push queues local changes
3. Conflict detection works (version comparison)
4. Last-write-wins strategy resolves conflicts
5. Sync status visible in UI
6. Offline queue persists
7. Auto-sync on reconnect
8. Pull-to-refresh triggers sync
9. No duplicate or lost data
10. Performance: sync <2s for typical household (50 items)

---

## Next Steps (Phase B+)

- **Wire to W2 AppSync**: Implement actual GraphQL mutations
- **Implement exponential backoff**: For retry logic
- **Add sync metrics**: Track sync time, conflicts, success rate
- **Handle large datasets**: Pagination for households with 1000+ items

---

**Status**: Ready to implement  
**Time**: 2-3 days for Phase B sync engine  
**Next**: Phase B+ integrate with W2 AppSync
