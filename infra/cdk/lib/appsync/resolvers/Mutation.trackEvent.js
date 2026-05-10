import { Analytics, EventTypes } from './analytics.js';
import Joi from 'joi';

const analytics = new Analytics();

// Validation schema
const eventSchema = Joi.object({
  userId: Joi.string().required(),
  householdId: Joi.string().required(),
  eventType: Joi.string()
    .valid(...Object.values(EventTypes))
    .required(),
  metadata: Joi.object().optional(),
});

export async function handler(event) {
  const { userId, householdId, eventType, metadata = {} } = event.arguments;

  try {
    // Validate input
    const { error, value } = eventSchema.validate({
      userId,
      householdId,
      eventType,
      metadata,
    });

    if (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
      };
    }

    // Track the event
    const trackedEvent = await analytics.trackEvent({
      userId: value.userId,
      householdId: value.householdId,
      eventType: value.eventType,
      metadata: value.metadata,
    });

    return {
      success: true,
      eventId: trackedEvent.SK,
      message: `Event ${eventType} tracked successfully`,
    };
  } catch (error) {
    console.error('[Mutation.trackEvent] Error:', error.message);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
}
