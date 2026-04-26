import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';
import { Container } from './Container';

export class Item extends Model {
  static table = 'items';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('container_id') containerId?: string;
  @field('added_by_user_id') addedByUserId!: string;
  @field('food_type') foodType!: string;
  @field('food_name') foodName!: string;
  @field('category') category!: string;
  @field('storage_location') storageLocation!: string;
  @field('quantity_text') quantityText?: string;
  @field('quantity_value') quantityValue?: number;
  @field('quantity_unit') quantityUnit?: string;
  @field('stored_at') storedAt!: number;
  @field('stored_tz') storedTz!: string;
  @field('expiry_at') expiryAt!: number;
  @field('expiry_source') expirySource!: string;
  @field('expiry_confidence') expiryConfidence?: number;
  @field('notes') notes?: string;
  @field('photo_url') photoUrl?: string;
  @field('barcode') barcode?: string;
  @field('price_usd') priceUsd?: number;
  @field('status') status!: string;
  @field('eaten_at') eatenAt?: number;
  @field('tossed_at') tossedAt?: number;
  @field('frozen_at') frozenAt?: number;
  @field('transferred_to_container_id') transferredToContainerId?: string;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;

  @relation('containers', 'container_id') container?: Container;
}
