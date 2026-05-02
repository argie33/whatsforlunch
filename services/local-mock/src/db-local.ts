// Real local in-memory database — no fallbacks, all operations are explicit
const storage = new Map<string, Record<string, unknown>>();

export async function put(item: Record<string, unknown>): Promise<void> {
  if (!item || typeof item !== 'object') {
    throw new Error('Cannot store invalid item');
  }
  const pk = item.PK as string | undefined;
  const sk = item.SK as string | undefined;
  if (!pk || !sk) {
    throw new Error('Item must have PK and SK properties');
  }
  const key = `${pk}#${sk}`;
  storage.set(key, item);
  console.log(`[db-local] put: ${key}`);
}

export async function get(pk: string, sk: string): Promise<Record<string, unknown> | null> {
  if (!pk || !sk) {
    throw new Error('pk and sk are required');
  }
  const key = `${pk}#${sk}`;
  const item = storage.get(key) ?? null;
  console.log(`[db-local] get: ${key} → ${item ? 'found' : 'not found'}`);
  return item;
}

export async function query(pk: string, skPrefix?: string): Promise<Record<string, unknown>[]> {
  if (!pk) {
    throw new Error('pk is required');
  }
  const results: Record<string, unknown>[] = [];
  for (const [key, item] of storage.entries()) {
    if (key.startsWith(`${pk}#`)) {
      if (!skPrefix || (item.SK as string)?.startsWith(skPrefix)) {
        results.push(item);
      }
    }
  }
  console.log(`[db-local] query: pk=${pk} skPrefix=${skPrefix} → ${results.length} results`);
  return results;
}

export async function scanByEntityType(entityType: string): Promise<Record<string, unknown>[]> {
  if (!entityType) {
    throw new Error('entityType is required');
  }
  const results: Record<string, unknown>[] = [];
  for (const item of storage.values()) {
    if (item.entityType === entityType) {
      results.push(item);
    }
  }
  console.log(`[db-local] scanByEntityType: ${entityType} → ${results.length} results`);
  return results;
}

export async function remove(pk: string, sk: string): Promise<void> {
  if (!pk || !sk) {
    throw new Error('pk and sk are required');
  }
  const key = `${pk}#${sk}`;
  const deleted = storage.delete(key);
  console.log(`[db-local] remove: ${key} → ${deleted ? 'deleted' : 'not found'}`);
}
