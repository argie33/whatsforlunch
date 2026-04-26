import { Database, Model, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';

export abstract class BaseRepository<T extends Model> {
  protected readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  protected abstract get collection(): Collection<T>;

  async findById(localId: string): Promise<T | null> {
    try {
      return await this.collection.find(localId);
    } catch {
      return null;
    }
  }

  async findByCloudId(cloudId: string): Promise<T | null> {
    const results = await this.collection
      .query(Q.where('cloud_id', cloudId))
      .fetch();
    return results[0] ?? null;
  }

  observeAll(): Observable<T[]> {
    return this.collection.query().observe() as unknown as Observable<T[]>;
  }

  protected now(): number {
    return Date.now();
  }

  protected generateId(): string {
    // Use crypto.randomUUID if available (RN 0.73+), otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: RFC-4122 v4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
