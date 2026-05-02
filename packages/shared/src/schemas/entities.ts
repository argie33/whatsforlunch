import { z } from 'zod';

export const UUIDSchema = z.string().uuid();
export const ISODateSchema = z.string().datetime();

export const GeoPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export const ProfileSchema = z.object({
  id: UUIDSchema,
  email: z.string().email(),
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  timeZone: z.string(),
  units: z.enum(['metric', 'imperial']),
  locale: z.string(),
  dietaryPreferences: z.array(z.string()),
  cuisinePreferences: z.array(z.string()),
  allergies: z.array(z.string()),
  defaultHouseholdId: UUIDSchema.optional(),
  homeLocation: GeoPointSchema.optional(),
  subscriptionTier: z.enum(['free', 'premium', 'family']),
  subscriptionExpiresAt: ISODateSchema.optional(),
  aiQuotaUsedToday: z.number().int().nonnegative(),
  aiQuotaResetAt: ISODateSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

export const HouseholdMemberSchema = z.object({
  userId: UUIDSchema,
  displayName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  role: z.enum(['owner', 'member', 'viewer']),
  joinedAt: ISODateSchema,
});

export const HouseholdSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1),
  ownerId: UUIDSchema,
  imageUrl: z.string().url().optional(),
  memberCount: z.number().int().positive(),
  members: z.array(HouseholdMemberSchema),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const HouseholdInviteSchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  token: z.string(),
  expiresAt: ISODateSchema,
  createdBy: UUIDSchema,
  acceptedBy: UUIDSchema.optional(),
  acceptedAt: ISODateSchema.optional(),
});

export const ActivitySchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  actorId: UUIDSchema,
  actor: HouseholdMemberSchema.optional(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: UUIDSchema,
  resourceData: z.record(z.any()).optional(),
  timestamp: ISODateSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const FoodPreferenceSchema = z.object({
  foodType: z.string(),
  foodName: z.string(),
  count: z.number().int().positive(),
  score: z.number().min(0).max(1),
});

export const CuisineScoreSchema = z.object({
  cuisine: z.string(),
  score: z.number().min(0).max(1),
});

export const LearnedPreferencesSchema = z.object({
  userId: UUIDSchema,
  topEaten: z.array(FoodPreferenceSchema),
  topTossed: z.array(FoodPreferenceSchema),
  cuisineAffinity: z.array(CuisineScoreSchema),
  lastUpdatedAt: ISODateSchema,
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const SavedRecipeSchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  recipeId: UUIDSchema,
  title: z.string().min(1),
  imageUrl: z.string().url().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
  savedAt: ISODateSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const ContainerSchema = z.object({
  id: UUIDSchema,
  qrToken: z.string(),
  householdId: UUIDSchema,
  nickname: z.string().optional(),
  imageUrl: z.string().url().optional(),
  claimedAt: ISODateSchema,
  claimedBy: UUIDSchema,
  archivedAt: ISODateSchema.optional(),
  currentItem: z.lazy(() => ItemSchema.optional()),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const BarcodeDataSchema = z
  .object({
    brand: z.string().optional(),
    product: z.string().optional(),
    servingSize: z.string().optional(),
    imageUrl: z.string().url().optional(),
  })
  .optional();

export const NutritionalDataSchema = z
  .object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
    sodium: z.number().optional(),
  })
  .optional();

export const ItemSchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  containerId: UUIDSchema.optional(),
  addedByUserId: UUIDSchema,
  foodType: z.string(),
  foodName: z.string(),
  category: z.enum([
    'protein',
    'grain',
    'dairy',
    'produce',
    'leftover',
    'sauce',
    'baked',
    'prepared',
    'beverage',
  ]),
  storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter', 'lunchbox']),
  quantityText: z.string().optional(),
  quantityValue: z.number().optional(),
  quantityUnit: z.string().optional(),
  storedAt: ISODateSchema,
  storedTz: z.string(),
  expiryAt: ISODateSchema,
  expirySource: z.enum(['rule', 'ai', 'ocr', 'barcode', 'user']),
  expiryConfidence: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  barcode: z.string().optional(),
  barcodeData: BarcodeDataSchema,
  priceUsd: z.number().nonnegative().optional(),
  nutritionalData: NutritionalDataSchema,
  status: z.enum(['active', 'partial', 'eaten', 'tossed', 'frozen', 'transferred']),
  eatenAt: ISODateSchema.optional(),
  tossedAt: ISODateSchema.optional(),
  frozenAt: ISODateSchema.optional(),
  transferredToContainerId: UUIDSchema.optional(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  deletedAt: ISODateSchema.optional(),
  _version: z.number().int().positive(),
  _lastChangedAt: ISODateSchema,
});

export const FoodRuleSchema = z.object({
  foodType: z.string(),
  displayName: z.string(),
  category: z.enum([
    'protein',
    'grain',
    'dairy',
    'produce',
    'leftover',
    'sauce',
    'baked',
    'prepared',
    'beverage',
  ]),
  aliases: z.array(z.string()),
  fridgeDaysSafe: z.number().int().positive(),
  freezerDaysSafe: z.number().int().positive().optional(),
  pantryDaysSafe: z.number().int().positive().optional(),
  counterHoursSafe: z.number().int().positive().optional(),
  description: z.string().optional(),
  iconKey: z.string().optional(),
  version: z.number().int().nonnegative(),
});

export const ItemEventSchema = z.object({
  id: UUIDSchema,
  itemId: UUIDSchema,
  actorUserId: UUIDSchema,
  eventType: z.enum([
    'created',
    'photoAdded',
    'aiClassified',
    'ocrProcessed',
    'edited',
    'markedEaten',
    'markedTossed',
    'markedFrozen',
    'markedPartial',
    'transferred',
    'snoozed',
  ]),
  payload: z.record(z.any()).optional(),
  createdAt: ISODateSchema,
});

export const DeviceSchema = z.object({
  id: UUIDSchema,
  expoPushToken: z.string(),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string(),
  osVersion: z.string(),
  model: z.string(),
  lastSeenAt: ISODateSchema,
  pushEnabled: z.boolean(),
});

export const ShoppingListItemSchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  name: z.string(),
  quantity: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  addedByUserId: UUIDSchema,
  purchasedAt: ISODateSchema.optional(),
  purchasedByUserId: UUIDSchema.optional(),
  autoSuggested: z.boolean(),
  linkedFoodType: z.string().optional(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Household = z.infer<typeof HouseholdSchema>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type Activity = z.infer<typeof ActivitySchema>;
export type FoodPreference = z.infer<typeof FoodPreferenceSchema>;
export type CuisineScore = z.infer<typeof CuisineScoreSchema>;
export type LearnedPreferences = z.infer<typeof LearnedPreferencesSchema>;
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;
export type Container = z.infer<typeof ContainerSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type FoodRule = z.infer<typeof FoodRuleSchema>;
export type ItemEvent = z.infer<typeof ItemEventSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;
