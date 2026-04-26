import { z } from 'zod';
import { UUIDSchema, ISODateSchema } from './entities';

/**
 * FoodRule — spoilage rules for different food types.
 * Cached in Lambda memory, updated daily via Lambda.
 */
export const FoodRuleSchema = z.object({
  foodType: z.string().min(1),
  displayName: z.string(),
  category: z.enum(['leftovers', 'produce', 'dairy', 'protein', 'pantry', 'prepared', 'other']),
  defaultDaysSafe: z.number().int().min(0).max(365),
  defaultDaysSafeByLocation: z.object({
    fridge: z.number().int().min(0).max(365),
    freezer: z.number().int().min(0).max(365),
    pantry: z.number().int().min(0).max(365),
    counter: z.number().int().min(0).max(365),
  }).optional(),
  storageRecommendations: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  version: z.number().int().positive(),
  updatedAt: ISODateSchema,
});

export type FoodRule = z.infer<typeof FoodRuleSchema>;

/**
 * AiClassificationResponse — Bedrock response for food photo.
 */
export const FoodAlternativeSchema = z.object({
  foodType: z.string(),
  confidence: z.number().min(0).max(1),
});

export const VisualWarningSchema = z.enum(['none', 'possible_mold', 'discoloration', 'freezer_burn']);

export const ClassifyFoodResponseSchema = z.object({
  foodType: z.string(),
  foodName: z.string(),
  daysSafe: z.number().int().min(0).max(365),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
  alternatives: z.array(FoodAlternativeSchema).max(3),
  visualWarning: VisualWarningSchema,
});

export type ClassifyFoodResponse = z.infer<typeof ClassifyFoodResponseSchema>;

/**
 * OcrExpiryDateResponse — Textract output for printed dates.
 */
export const DetectedDateSchema = z.object({
  rawText: z.string(),
  parsedAt: ISODateSchema,
  confidence: z.number().min(0).max(1),
  boundingBox: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
  }),
});

export const OcrExpiryDateResponseSchema = z.object({
  detectedDates: z.array(DetectedDateSchema),
  bestGuess: ISODateSchema.optional(),
  confidence: z.number().min(0).max(1),
});

export type OcrExpiryDateResponse = z.infer<typeof OcrExpiryDateResponseSchema>;

/**
 * AiClassificationRecord — stored in DynamoDB, tracks all AI calls.
 */
export const AiClassificationSchema = z.object({
  id: UUIDSchema,
  householdId: UUIDSchema,
  itemId: UUIDSchema,
  userId: UUIDSchema,
  taskType: z.enum(['classify_food', 'ocr_expiry_date', 'ocr_receipt']),
  modelVersion: z.string(),
  promptVersion: z.number().int().positive(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  cacheCreationTokens: z.number().int().nonnegative().default(0),
  cacheReadTokens: z.number().int().nonnegative().default(0),
  costUsd: z.number().nonnegative(),
  cacheHit: z.boolean(),
  latencyMs: z.number().int().nonnegative(),
  response: z.record(z.unknown()), // JSON blob of the response
  createdAt: ISODateSchema,
});

export type AiClassification = z.infer<typeof AiClassificationSchema>;

/**
 * AiQuotaUsage — per-user quota tracking.
 */
export const AiQuotaUsageSchema = z.object({
  userId: UUIDSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  tz: z.string(),
  classifyFood: z.number().int().nonnegative(),
  ocrExpiryDate: z.number().int().nonnegative(),
  ocrReceipt: z.number().int().nonnegative(),
  suggestRecipes: z.number().int().nonnegative(),
  suggestRestaurants: z.number().int().nonnegative(),
  totalCostUsd: z.number().nonnegative(),
});

export type AiQuotaUsage = z.infer<typeof AiQuotaUsageSchema>;
