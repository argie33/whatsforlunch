import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { Item } from '../models/Item';

export interface CreateItemInput {
  householdId: string;
  containerId?: string;
  addedByUserId: string;
  foodType: string;
  foodName: string;
  category: string;
  storageLocation: string;
  quantityText?: string;
  quantityValue?: number;
  quantityUnit?: string;
  storedAt: number;
  storedTz: string;
  expiryAt: number;
  expirySource: string;
  expiryConfidence?: number;
  notes?: string;
  photoUrl?: string;
  barcode?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
  priceUsd?: number;
}

export interface UpdateItemInput {
  foodName?: string;
  foodType?: string;
  category?: string;
  storageLocation?: string;
  quantityText?: string;
  quantityValue?: number;
  quantityUnit?: string;
  expiryAt?: number;
  expirySource?: string;
  expiryConfidence?: number;
  notes?: string;
  photoUrl?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  sugarPer100g?: number;
  sodiumPer100g?: number;
  priceUsd?: number;
  status?: string;
  eatenAt?: number;
  tossedAt?: number;
  frozenAt?: number;
  transferredToContainerId?: string;
}

export class ItemRepository extends BaseRepository<Item> {
  protected get collection(): Collection<Item> {
    return this.db.get<Item>('items');
  }

  async create(input: CreateItemInput): Promise<Item> {
    return this.db.write(async () => {
      const cloudId = this.generateId();
      return this.collection.create((item) => {
        item.cloudId = cloudId;
        item.householdId = input.householdId;
        if (input.containerId) item.containerId = input.containerId;
        item.addedByUserId = input.addedByUserId;
        item.foodType = input.foodType;
        item.foodName = input.foodName;
        item.category = input.category;
        item.storageLocation = input.storageLocation;
        if (input.quantityText) item.quantityText = input.quantityText;
        if (input.quantityValue != null) item.quantityValue = input.quantityValue;
        if (input.quantityUnit) item.quantityUnit = input.quantityUnit;
        item.storedAt = input.storedAt;
        item.storedTz = input.storedTz;
        item.expiryAt = input.expiryAt;
        item.expirySource = input.expirySource;
        if (input.expiryConfidence != null) item.expiryConfidence = input.expiryConfidence;
        if (input.notes) item.notes = input.notes;
        if (input.photoUrl) item.photoUrl = input.photoUrl;
        if (input.barcode) item.barcode = input.barcode;
        if (input.caloriesPer100g != null) item.caloriesPer100g = input.caloriesPer100g;
        if (input.proteinPer100g != null) item.proteinPer100g = input.proteinPer100g;
        if (input.carbsPer100g != null) item.carbsPer100g = input.carbsPer100g;
        if (input.fatPer100g != null) item.fatPer100g = input.fatPer100g;
        if (input.fiberPer100g != null) item.fiberPer100g = input.fiberPer100g;
        if (input.sugarPer100g != null) item.sugarPer100g = input.sugarPer100g;
        if (input.sodiumPer100g != null) item.sodiumPer100g = input.sodiumPer100g;
        if (input.priceUsd != null) item.priceUsd = input.priceUsd;
        item.status = 'active';
        item.version = 0;
        item.lastChangedAt = this.now();
      });
    });
  }

  async update(item: Item, input: UpdateItemInput): Promise<Item> {
    return this.db.write(async () => {
      return item.update((record) => {
        if (input.foodName != null) record.foodName = input.foodName;
        if (input.foodType != null) record.foodType = input.foodType;
        if (input.category != null) record.category = input.category;
        if (input.storageLocation != null) record.storageLocation = input.storageLocation;
        if (input.quantityText != null) record.quantityText = input.quantityText;
        if (input.quantityValue != null) record.quantityValue = input.quantityValue;
        if (input.quantityUnit != null) record.quantityUnit = input.quantityUnit;
        if (input.expiryAt != null) record.expiryAt = input.expiryAt;
        if (input.expirySource != null) record.expirySource = input.expirySource;
        if (input.expiryConfidence != null) record.expiryConfidence = input.expiryConfidence;
        if (input.notes != null) record.notes = input.notes;
        if (input.photoUrl != null) record.photoUrl = input.photoUrl;
        if (input.caloriesPer100g != null) record.caloriesPer100g = input.caloriesPer100g;
        if (input.proteinPer100g != null) record.proteinPer100g = input.proteinPer100g;
        if (input.carbsPer100g != null) record.carbsPer100g = input.carbsPer100g;
        if (input.fatPer100g != null) record.fatPer100g = input.fatPer100g;
        if (input.fiberPer100g != null) record.fiberPer100g = input.fiberPer100g;
        if (input.sugarPer100g != null) record.sugarPer100g = input.sugarPer100g;
        if (input.sodiumPer100g != null) record.sodiumPer100g = input.sodiumPer100g;
        if (input.priceUsd != null) record.priceUsd = input.priceUsd;
        if (input.status != null) record.status = input.status;
        if (input.eatenAt != null) record.eatenAt = input.eatenAt;
        if (input.tossedAt != null) record.tossedAt = input.tossedAt;
        if (input.frozenAt != null) record.frozenAt = input.frozenAt;
        if (input.transferredToContainerId != null) {
          record.transferredToContainerId = input.transferredToContainerId;
        }
        record.lastChangedAt = this.now();
      });
    });
  }

  async softDelete(item: Item): Promise<void> {
    await this.db.write(async () => {
      await item.update((record) => {
        record.deletedAt = this.now();
        record.lastChangedAt = this.now();
      });
    });
  }

  observeByHousehold(householdId: string): Observable<Item[]> {
    return this.collection
      .query(Q.where('household_id', householdId), Q.where('deleted_at', Q.eq(null)))
      .observe() as unknown as Observable<Item[]>;
  }

  observeByStatus(householdId: string, status: string): Observable<Item[]> {
    return this.collection
      .query(
        Q.where('household_id', householdId),
        Q.where('status', status),
        Q.where('deleted_at', Q.eq(null)),
      )
      .observe() as unknown as Observable<Item[]>;
  }

  observeExpiringSoon(householdId: string, withinMs: number): Observable<Item[]> {
    const cutoff = Date.now() + withinMs;
    return this.collection
      .query(
        Q.where('household_id', householdId),
        Q.where('status', 'active'),
        Q.where('expiry_at', Q.lte(cutoff)),
        Q.where('deleted_at', Q.eq(null)),
        Q.sortBy('expiry_at', Q.asc),
      )
      .observe() as unknown as Observable<Item[]>;
  }

  observeByContainer(containerId: string): Observable<Item[]> {
    return this.collection
      .query(Q.where('container_id', containerId), Q.where('deleted_at', Q.eq(null)))
      .observe() as unknown as Observable<Item[]>;
  }

  async findDirty(): Promise<Item[]> {
    // Returns items changed locally that haven't been confirmed by cloud yet (_version = 0)
    return this.collection.query(Q.where('_version', 0)).fetch();
  }

  async upsertFromCloud(data: {
    id: string;
    householdId: string;
    containerId?: string | null;
    addedByUserId: string;
    foodType: string;
    foodName: string;
    category: string;
    storageLocation: string;
    quantityText?: string | null;
    quantityValue?: number | null;
    quantityUnit?: string | null;
    storedAt: number;
    storedTz: string;
    expiryAt: number;
    expirySource: string;
    expiryConfidence?: number | null;
    notes?: string | null;
    photoUrl?: string | null;
    barcode?: string | null;
    nutritionalData?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
    } | null;
    priceUsd?: number | null;
    status: string;
    eatenAt?: number | null;
    tossedAt?: number | null;
    frozenAt?: number | null;
    transferredToContainerId?: string | null;
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<Item> {
    return this.db.write(async () => {
      const existing = await this.findByCloudId(data.id);
      if (existing) {
        // Only apply if cloud version is newer
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          record.householdId = data.householdId;
          if (data.containerId != null) record.containerId = data.containerId;
          record.foodType = data.foodType;
          record.foodName = data.foodName;
          record.category = data.category;
          record.storageLocation = data.storageLocation;
          if (data.quantityText != null) record.quantityText = data.quantityText;
          if (data.quantityValue != null) record.quantityValue = data.quantityValue;
          if (data.quantityUnit != null) record.quantityUnit = data.quantityUnit;
          record.storedAt = data.storedAt;
          record.storedTz = data.storedTz;
          record.expiryAt = data.expiryAt;
          record.expirySource = data.expirySource;
          if (data.expiryConfidence != null) record.expiryConfidence = data.expiryConfidence;
          if (data.notes != null) record.notes = data.notes;
          if (data.photoUrl != null) record.photoUrl = data.photoUrl;
          if (data.barcode != null) record.barcode = data.barcode;
          if (data.nutritionalData) {
            if (data.nutritionalData.calories != null)
              record.caloriesPer100g = data.nutritionalData.calories;
            if (data.nutritionalData.protein != null)
              record.proteinPer100g = data.nutritionalData.protein;
            if (data.nutritionalData.carbs != null)
              record.carbsPer100g = data.nutritionalData.carbs;
            if (data.nutritionalData.fat != null) record.fatPer100g = data.nutritionalData.fat;
            if (data.nutritionalData.fiber != null)
              record.fiberPer100g = data.nutritionalData.fiber;
            if (data.nutritionalData.sugar != null)
              record.sugarPer100g = data.nutritionalData.sugar;
            if (data.nutritionalData.sodium != null)
              record.sodiumPer100g = data.nutritionalData.sodium;
          }
          if (data.priceUsd != null) record.priceUsd = data.priceUsd;
          record.status = data.status;
          if (data.eatenAt != null) record.eatenAt = data.eatenAt;
          if (data.tossedAt != null) record.tossedAt = data.tossedAt;
          if (data.frozenAt != null) record.frozenAt = data.frozenAt;
          if (data.transferredToContainerId != null) {
            record.transferredToContainerId = data.transferredToContainerId;
          }
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.collection.create((record) => {
        record.cloudId = data.id;
        record.householdId = data.householdId;
        if (data.containerId != null) record.containerId = data.containerId;
        record.addedByUserId = data.addedByUserId;
        record.foodType = data.foodType;
        record.foodName = data.foodName;
        record.category = data.category;
        record.storageLocation = data.storageLocation;
        if (data.quantityText != null) record.quantityText = data.quantityText;
        if (data.quantityValue != null) record.quantityValue = data.quantityValue;
        if (data.quantityUnit != null) record.quantityUnit = data.quantityUnit;
        record.storedAt = data.storedAt;
        record.storedTz = data.storedTz;
        record.expiryAt = data.expiryAt;
        record.expirySource = data.expirySource;
        if (data.expiryConfidence != null) record.expiryConfidence = data.expiryConfidence;
        if (data.notes != null) record.notes = data.notes;
        if (data.photoUrl != null) record.photoUrl = data.photoUrl;
        if (data.barcode != null) record.barcode = data.barcode;
        if (data.nutritionalData) {
          if (data.nutritionalData.calories != null)
            record.caloriesPer100g = data.nutritionalData.calories;
          if (data.nutritionalData.protein != null)
            record.proteinPer100g = data.nutritionalData.protein;
          if (data.nutritionalData.carbs != null) record.carbsPer100g = data.nutritionalData.carbs;
          if (data.nutritionalData.fat != null) record.fatPer100g = data.nutritionalData.fat;
          if (data.nutritionalData.fiber != null) record.fiberPer100g = data.nutritionalData.fiber;
          if (data.nutritionalData.sugar != null) record.sugarPer100g = data.nutritionalData.sugar;
          if (data.nutritionalData.sodium != null)
            record.sodiumPer100g = data.nutritionalData.sodium;
        }
        if (data.priceUsd != null) record.priceUsd = data.priceUsd;
        record.status = data.status;
        if (data.eatenAt != null) record.eatenAt = data.eatenAt;
        if (data.tossedAt != null) record.tossedAt = data.tossedAt;
        if (data.frozenAt != null) record.frozenAt = data.frozenAt;
        if (data.transferredToContainerId != null) {
          record.transferredToContainerId = data.transferredToContainerId;
        }
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }
}
