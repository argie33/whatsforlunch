// Validation Helpers
// Input validation for resolvers using shared Zod schemas

const { z } = require('zod');

// Shared base schemas
const UUIDSchema = z.string().uuid();
const ISODateSchema = z.string().datetime();

const ValidationSchemas = {
  // Item validation
  CreateItemInput: z.object({
    householdId: UUIDSchema,
    containerId: z.string().uuid().optional(),
    foodType: z.string().min(1).max(100),
    quantity: z.number().positive().optional(),
    quantityUnit: z.string().optional(),
    storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter', 'lunchbox']),
    expiryAt: ISODateSchema,
    expirySource: z.enum(['rule', 'ai', 'ocr', 'barcode', 'user']),
    notes: z.string().max(500).optional(),
    barcode: z.string().optional(),
    photoUrl: z.string().url().optional(),
  }),

  UpdateItemInput: z.object({
    householdId: UUIDSchema,
    id: UUIDSchema,
    foodType: z.string().min(1).max(100).optional(),
    storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter', 'lunchbox']).optional(),
    quantity: z.number().positive().optional(),
    quantityUnit: z.string().optional(),
    expiryAt: ISODateSchema.optional(),
    notes: z.string().max(500).optional(),
    _version: z.number().int().positive(),
  }),

  // Household validation
  CreateHouseholdInput: z.object({
    name: z.string().min(1).max(100),
    imageUrl: z.string().url().optional(),
  }),

  UpdateHouseholdInput: z.object({
    householdId: UUIDSchema,
    name: z.string().min(1).max(100).optional(),
    imageUrl: z.string().url().optional(),
  }),

  // Container validation
  CreateContainerInput: z.object({
    householdId: UUIDSchema,
    nickname: z.string().min(1).max(100).optional(),
    imageUrl: z.string().url().optional(),
  }),

  UpdateContainerInput: z.object({
    householdId: UUIDSchema,
    containerId: UUIDSchema,
    nickname: z.string().min(1).max(100).optional(),
    imageUrl: z.string().url().optional(),
  }),

  // Shopping list validation
  AddShoppingItemInput: z.object({
    householdId: UUIDSchema,
    name: z.string().min(1).max(200),
    quantity: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().max(500).optional(),
    linkedFoodType: z.string().optional(),
  }),

  UpdateShoppingItemInput: z.object({
    id: UUIDSchema,
    name: z.string().min(1).max(200).optional(),
    quantity: z.string().optional(),
    category: z.string().optional(),
    notes: z.string().max(500).optional(),
    linkedFoodType: z.string().optional(),
    _version: z.number().int().positive(),
  }),

  // Profile validation
  UpdateProfileInput: z.object({
    displayName: z.string().min(1).max(100).optional(),
    photoUrl: z.string().url().optional(),
    timeZone: z.string().optional(),
    units: z.enum(['imperial', 'metric']).optional(),
    locale: z.string().optional(),
    dietaryPreferences: z.array(z.string()).optional(),
    cuisinePreferences: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
  }),

  // Invite validation
  InviteInput: z.object({
    householdId: UUIDSchema,
    invitedEmail: z.string().email().optional(),
    role: z.enum(['owner', 'member']).optional(),
  }),
};

/**
 * Validate input against a schema
 * Returns { valid: boolean, data?: object, error?: string }
 */
function validateInput(input, schemaName) {
  const schema = ValidationSchemas[schemaName];

  if (!schema) {
    return {
      valid: false,
      error: `Unknown schema: ${schemaName}`,
    };
  }

  try {
    const data = schema.parse(input);
    return { valid: true, data };
  } catch (error) {
    return {
      valid: false,
      error: error.errors?.[0]?.message || error.message,
    };
  }
}

/**
 * Validate and return data, or throw error
 */
function validateInputOrThrow(input, schemaName) {
  const result = validateInput(input, schemaName);
  if (!result.valid) {
    throw new Error(`Validation failed: ${result.error}`);
  }
  return result.data;
}

/**
 * Validate that a user has proper permissions for a resource
 */
function validatePermission(userRole, requiredRole) {
  const roleHierarchy = {
    owner: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Validate version for optimistic concurrency
 */
function validateVersion(currentVersion, expectedVersion) {
  if (currentVersion !== expectedVersion) {
    throw new Error(`Version conflict: expected ${expectedVersion}, got ${currentVersion}`);
  }
}

/**
 * Validate expiry date is in future
 */
function validateExpiryDate(expiryAt) {
  const expiry = new Date(expiryAt);
  const now = new Date();

  if (expiry <= now) {
    throw new Error('Expiry date must be in the future');
  }
}

/**
 * Validate quantity is positive
 */
function validateQuantity(quantity) {
  if (quantity !== undefined && quantity <= 0) {
    throw new Error('Quantity must be positive');
  }
}

module.exports = {
  ValidationSchemas,
  validateInput,
  validateInputOrThrow,
  validatePermission,
  validateVersion,
  validateExpiryDate,
  validateQuantity,
};
