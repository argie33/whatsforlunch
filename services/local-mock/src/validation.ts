/**
 * SECURITY: Input validation to prevent injection and invalid data
 *
 * All user inputs must be validated before processing. This prevents:
 * - GraphQL injection
 * - Invalid data in database
 * - DoS via extremely large inputs
 * - Logic errors from unexpected data types
 */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: unknown): string {
  if (typeof email !== 'string' || !email.trim()) {
    throw new Error('Email is required');
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    throw new Error('Email is too long (max 254 characters)');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  return trimmed;
}

export function validateString(
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 1000,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

export function validateUrl(url: unknown, fieldName: string): string {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    throw new Error(`${fieldName} URL is too long (max 2048 characters)`);
  }
  try {
    new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} is not a valid URL`);
  }
  return trimmed;
}

export function validateNumber(
  value: unknown,
  fieldName: string,
  min?: number,
  max?: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a valid number`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }
  if (max !== undefined && value > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }
  return value;
}

export function validateDate(date: unknown, fieldName: string): string {
  if (typeof date !== 'string') {
    throw new Error(`${fieldName} must be an ISO 8601 date string`);
  }
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(`${fieldName} is not a valid date`);
  }
  // Validate it's not in the past (for future expiry dates)
  if (parsed < new Date()) {
    throw new Error(`${fieldName} cannot be in the past`);
  }
  return date;
}

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  validValues: readonly T[],
): T {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  if (!validValues.includes(value as T)) {
    throw new Error(`${fieldName} must be one of: ${validValues.join(', ')}`);
  }
  return value as T;
}

export function validateCreateItemInput(input: Record<string, unknown>): void {
  if (!input.householdId || typeof input.householdId !== 'string') {
    throw new Error('householdId is required');
  }
  if (!input.foodName || typeof input.foodName !== 'string') {
    throw new Error('foodName is required');
  }
  validateString(input.foodName, 'foodName', 1, 200);
  validateString(input.storageLocation, 'storageLocation', 1, 50);
  validateString(input.category, 'category', 1, 50);
  if (input.expiryAt) {
    validateDate(input.expiryAt, 'expiryAt');
  }
  if (input.photoUrl) {
    validateUrl(input.photoUrl, 'photoUrl');
  }
}

export function validateCreateHouseholdInput(input: Record<string, unknown>): void {
  if (!input.name || typeof input.name !== 'string') {
    throw new Error('Household name is required');
  }
  validateString(input.name, 'Household name', 1, 200);
  if (input.imageUrl) {
    validateUrl(input.imageUrl, 'imageUrl');
  }
}

export function validateInviteInput(email: string, role: string): void {
  validateEmail(email);
  validateEnum(role, 'role', ['owner', 'member', 'viewer']);
}
