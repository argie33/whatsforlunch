import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export class Profile extends Model {
  static table = 'profiles';

  @field('cloud_id') cloudId!: string;
  @field('email') email!: string;
  @field('display_name') displayName?: string;
  @field('photo_url') photoUrl?: string;
  @field('time_zone') timeZone!: string;
  @field('units') units!: string;
  @field('subscription_tier') subscriptionTier!: string;
  @field('ai_quota_used_today') aiQuotaUsedToday!: number;
  @field('digest_enabled') digestEnabled!: boolean;
  @field('digest_time') digestTime!: string;
  @field('digest_timezone') digestTimezone!: string;
  @field('digest_last_sent_at') digestLastSentAt?: number;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
  @field('deleted_at') deletedAt?: number;

  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
