import { Recommendations } from './ml-recommendations.js';
import { HybridCache } from './hybrid-cache.js';
import Joi from 'joi';

const recommendations = new Recommendations();
const cache = new HybridCache({
  redis: {
    endpoint: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    authToken: process.env.REDIS_AUTH_TOKEN,
  },
});

// Validation schema
const preferencesSchema = Joi.object({
  dietary: Joi.array().items(Joi.string()).optional(),
  cuisines: Joi.array().items(Joi.string()).optional(),
  cookingTime: Joi.string().valid('quick', 'medium', 'long', 'any').optional(),
  skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
});

export async function handler(event) {
  const { userId, preferences } = event.arguments;

  // Validate user
  if (!userId) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: 'userId is required',
    };
  }

  // Check authorization: user can only set their own preferences
  const authenticatedUserId = event.identity?.claims?.sub || event.identity?.accountId;
  if (authenticatedUserId !== userId) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You can only set your own preferences',
    };
  }

  try {
    // Validate preferences input
    const { error, value } = preferencesSchema.validate(preferences);
    if (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
      };
    }

    // Set preferences
    const success = await recommendations.setUserPreferences(userId, value);

    if (!success) {
      return {
        success: false,
        error: 'STORAGE_ERROR',
        message: 'Failed to save preferences',
      };
    }

    // Invalidate recommendation cache for this user
    const pattern = cache.generateKey('recommendations', userId, '*');
    await cache.invalidatePattern(pattern);

    return {
      success: true,
      message: 'Preferences updated successfully',
      preferences: value,
    };
  } catch (error) {
    console.error('[Mutation.setUserPreferences] Error:', error.message);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
}
