import * as localDb from './db-local.js';

// Real local database (no silent fallbacks)
// All operations are direct, errors surface immediately

export class DatabaseError extends Error {
  constructor(operation: string, cause: Error) {
    super(`Database error during ${operation}: ${cause.message}`);
    this.name = 'DatabaseError';
  }
}

export async function put(item: Record<string, unknown>): Promise<void> {
  if (!item.PK || !item.SK) {
    throw new Error('Database error: item must have PK and SK');
  }
  try {
    await localDb.put(item);
  } catch (error) {
    throw new DatabaseError('put', error as Error);
  }
}

export async function get(pk: string, sk: string): Promise<Record<string, unknown> | null> {
  try {
    return await localDb.get(pk, sk);
  } catch (error) {
    throw new DatabaseError('get', error as Error);
  }
}

export async function query(pk: string, skPrefix?: string): Promise<Record<string, unknown>[]> {
  try {
    return await localDb.query(pk, skPrefix);
  } catch (error) {
    throw new DatabaseError('query', error as Error);
  }
}

export async function scanByEntityType(entityType: string): Promise<Record<string, unknown>[]> {
  try {
    return await localDb.scanByEntityType(entityType);
  } catch (error) {
    throw new DatabaseError('scanByEntityType', error as Error);
  }
}

export async function remove(pk: string, sk: string): Promise<void> {
  try {
    await localDb.remove(pk, sk);
  } catch (error) {
    throw new DatabaseError('remove', error as Error);
  }
}
