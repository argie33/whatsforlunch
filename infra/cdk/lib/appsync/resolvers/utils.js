// Shared resolver utilities for AppSync
// All resolvers import and use these helpers

const aws = require('aws-sdk');

const ddb = new aws.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get current ISO timestamp
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Get epoch milliseconds
function getCurrentEpoch() {
  return Date.now();
}

// Build common attributes for all entities
function buildCommonAttributes(overrides = {}) {
  return {
    id: generateUUID(),
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    _version: 1,
    _lastChangedAt: getCurrentEpoch(),
    clientId: overrides.clientId || generateUUID(),
    entityType: overrides.entityType || 'Unknown',
    ...overrides,
  };
}

// Check user is authenticated and get user ID from Cognito
function getUserId(context) {
  const claims = context.identity.claims;
  if (!claims || !claims.sub) {
    throw new Error('Unauthenticated');
  }
  return claims.sub;
}

// Check user is member of household
async function checkHouseholdMembership(userId, householdId) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
    },
  };

  const result = await ddb.get(params).promise();
  if (!result.Item) {
    throw new Error('User is not a member of this household');
  }
  return result.Item;
}

// Get household and verify ownership for admin ops
async function checkHouseholdOwner(userId, householdId) {
  const member = await checkHouseholdMembership(userId, householdId);
  if (member.role !== 'owner') {
    throw new Error('Only household owner can perform this action');
  }
  return member;
}

// Query helper: Execute DynamoDB query
async function query(params) {
  const result = await ddb.query(params).promise();
  return result.Items || [];
}

// Get helper: Fetch single item
async function getItem(pk, sk) {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  };
  const result = await ddb.get(params).promise();
  return result.Item || null;
}

// Put helper: Create/update item
async function putItem(item) {
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };
  await ddb.put(params).promise();
  return item;
}

// Update helper with optimistic concurrency
async function updateItemWithVersion(pk, sk, updates, expectedVersion) {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: 'SET #updatedAt = :now, #version = #version + :inc ' +
      Object.keys(updates)
        .map((k, i) => `${i > 0 ? ', ' : ''}#${k} = :${k}`)
        .join(''),
    ExpressionAttributeNames: {
      '#updatedAt': 'updatedAt',
      '#version': '_version',
      ...Object.fromEntries(Object.keys(updates).map(k => [`#${k}`, k])),
    },
    ExpressionAttributeValues: {
      ':now': getCurrentTimestamp(),
      ':inc': 1,
      ':expectedVersion': expectedVersion,
      ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [`:${k}`, v])),
    },
    ConditionExpression: '#version = :expectedVersion',
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await ddb.update(params).promise();
    return result.Attributes;
  } catch (error) {
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('Version conflict: item was modified');
    }
    throw error;
  }
}

// Delete helper: Soft delete
async function softDeleteItem(pk, sk) {
  const params = {
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: 'SET #deletedAt = :now, #updatedAt = :now',
    ExpressionAttributeNames: {
      '#deletedAt': 'deletedAt',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':now': getCurrentTimestamp(),
    },
    ReturnValues: 'ALL_NEW',
  };
  const result = await ddb.update(params).promise();
  return result.Attributes;
}

// Error handling
function createError(code, message, userMessage = null) {
  return {
    errorType: code,
    message: message,
    errorInfo: {
      code,
      userMessage: userMessage || message,
      requestId: context.requestId,
    },
  };
}

// Invoke W4 AI Lambda functions
async function invokeW4Lambda(functionName, payload) {
  const lambda = new aws.Lambda();

  const params = {
    FunctionName: `wfl-w4-${functionName}-${process.env.ENVIRONMENT || 'dev'}`,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  try {
    const response = await lambda.invoke(params).promise();
    if (response.FunctionError) {
      throw new Error(`W4 Lambda error: ${response.FunctionError}`);
    }
    return JSON.parse(response.Payload);
  } catch (error) {
    console.error(`Error invoking W4 Lambda ${functionName}:`, error);
    throw error;
  }
}

// Log activity record for household audit trail
async function logActivity(householdId, actorId, action, resourceType, resourceId, resourceData) {
  try {
    const activity = buildCommonAttributes({
      entityType: 'Activity',
      PK: `HOUSEHOLD#${householdId}`,
      SK: `ACTIVITY#${getCurrentEpoch()}#${actorId}`,
      id: generateUUID(),
      householdId,
      actorId,
      action,
      resourceType,
      resourceId,
      resourceData: resourceData || {},
      timestamp: getCurrentTimestamp(),
    });

    await putItem(activity);
    return activity;
  } catch (error) {
    console.warn(`Failed to log activity: ${error.message}`);
    // Don't throw - logging failures should not block mutations
  }
}

module.exports = {
  ddb,
  TABLE_NAME,
  generateUUID,
  getCurrentTimestamp,
  getCurrentEpoch,
  buildCommonAttributes,
  getUserId,
  checkHouseholdMembership,
  checkHouseholdOwner,
  query,
  getItem,
  putItem,
  updateItemWithVersion,
  softDeleteItem,
  createError,
  invokeW4Lambda,
  logActivity,
};
