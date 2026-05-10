import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { Activity } from '../models/Activity';

export class ActivityRepository extends BaseRepository<Activity> {
  protected get collection(): Collection<Activity> {
    return this.db.get<Activity>('activities');
  }

  async getByHouseholdId(householdId: string): Promise<Activity[]> {
    return this.collection.query(Q.where('household_id', Q.eq(householdId))).fetch();
  }

  observeByHouseholdId(householdId: string): Observable<Activity[]> {
    return this.collection
      .query(Q.where('household_id', Q.eq(householdId)), Q.sortBy('timestamp', Q.desc))
      .observeWithColumns(['timestamp']);
  }

  async getByHouseholdAndActor(householdId: string, actorId: string): Promise<Activity[]> {
    return this.collection
      .query(Q.and(Q.where('household_id', Q.eq(householdId)), Q.where('actor_id', Q.eq(actorId))))
      .fetch();
  }

  observeByHouseholdAndActor(householdId: string, actorId: string): Observable<Activity[]> {
    return this.collection
      .query(
        Q.and(Q.where('household_id', Q.eq(householdId)), Q.where('actor_id', Q.eq(actorId))),
        Q.sortBy('timestamp', Q.desc),
      )
      .observeWithColumns(['timestamp']);
  }

  async deleteByHouseholdId(householdId: string): Promise<void> {
    return this.db.write(async () => {
      const activities = await this.getByHouseholdId(householdId);
      await Promise.all(activities.map((a) => a.markAsDeleted()));
    });
  }
}
