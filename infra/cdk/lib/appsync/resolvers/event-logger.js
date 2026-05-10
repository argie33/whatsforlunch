// Event Logger for Audit Trail
// Logs all item changes for audit and replay capabilities

const { v4: uuid } = require('uuid');
const { ddb, TABLE_NAME, getCurrentTimestamp } = require('./utils');

/**
 * Log an item event (created, modified, status changed, etc)
 * Used for audit trail and event sourcing
 */
async function logItemEvent(householdId, itemId, eventType, details = {}) {
  const eventId = uuid();
  const timestamp = getCurrentTimestamp();

  const event = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM_EVENT#${itemId}#${timestamp}#${eventId}`,
    id: eventId,
    entityType: 'ItemEvent',
    householdId,
    itemId,
    eventType, // created, photoAdded, aiClassified, ocrProcessed, edited, markedEaten, markedTossed, markedFrozen, markedPartial, transferred, snoozed
    details, // Arbitrary details about the event
    createdAt: timestamp,
    _version: 1,
    _lastChangedAt: Date.now(),
    // GSI for querying events by item
    GSI3PK: `ITEM#${itemId}`,
    GSI3SK: timestamp,
  };

  await ddb
    .put({
      TableName: TABLE_NAME,
      Item: event,
    })
    .promise();

  return event;
}

/**
 * Get all events for an item (for audit trail)
 */
async function getItemEvents(householdId, itemId, limit = 50) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': `ITEM_EVENT#${itemId}`,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
    .promise();

  return result.Items || [];
}

/**
 * Get all events for a user's items
 */
async function getUserItemEvents(userId, limit = 100) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
    .promise();

  return result.Items || [];
}

/**
 * Log household event
 */
async function logHouseholdEvent(householdId, eventType, details = {}) {
  const eventId = uuid();
  const timestamp = getCurrentTimestamp();

  const event = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `HOUSEHOLD_EVENT#${timestamp}#${eventId}`,
    id: eventId,
    entityType: 'HouseholdEvent',
    householdId,
    eventType, // memberAdded, memberRemoved, roleChanged, updated, etc
    details,
    createdAt: timestamp,
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  await ddb
    .put({
      TableName: TABLE_NAME,
      Item: event,
    })
    .promise();

  return event;
}

/**
 * Log shopping list event
 */
async function logShoppingListEvent(householdId, itemId, eventType, details = {}) {
  const eventId = uuid();
  const timestamp = getCurrentTimestamp();

  const event = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `SHOP_EVENT#${itemId}#${timestamp}#${eventId}`,
    id: eventId,
    entityType: 'ShoppingListEvent',
    householdId,
    itemId,
    eventType, // added, updated, purchased, deleted
    details,
    createdAt: timestamp,
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  await ddb
    .put({
      TableName: TABLE_NAME,
      Item: event,
    })
    .promise();

  return event;
}

module.exports = {
  logItemEvent,
  getItemEvents,
  getUserItemEvents,
  logHouseholdEvent,
  logShoppingListEvent,
};
