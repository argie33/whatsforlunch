// In-memory mock database for local development without Docker
const storage = new Map<string, Record<string, unknown>>();

export async function put(item: Record<string, unknown>) {
  const key = `${item.PK}#${item.SK}`;
  storage.set(key, item);
}

export async function get(pk: string, sk: string) {
  const key = `${pk}#${sk}`;
  const result = storage.get(key);
  console.log(
    `[db-mock] GET: ${key} => ${result ? 'FOUND' : 'NOT FOUND'} (${storage.size} items in storage)`,
  );
  return result ?? null;
}

export async function query(pk: string, skPrefix?: string) {
  const results: Record<string, unknown>[] = [];
  for (const [key, item] of storage.entries()) {
    if (key.startsWith(`${pk}#`)) {
      if (!skPrefix || (item.SK as string)?.startsWith(skPrefix)) {
        results.push(item);
      }
    }
  }
  return results;
}

export async function scanByEntityType(entityType: string) {
  const results: Record<string, unknown>[] = [];
  for (const item of storage.values()) {
    if (item.entityType === entityType) {
      results.push(item);
    }
  }
  return results;
}

export async function remove(pk: string, sk: string) {
  const key = `${pk}#${sk}`;
  storage.delete(key);
}
