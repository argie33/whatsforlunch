import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class ItemEvent extends Model {
  static table = 'item_events';

  @field('cloud_id') cloudId!: string;
  @field('item_id') itemId!: string;
  @field('actor_user_id') actorUserId!: string;
  @field('event_type') eventType!: string;
  @field('payload_json') payloadJson?: string;
  @field('created_at') createdAt!: number;
}
