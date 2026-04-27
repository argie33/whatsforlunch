/**
 * AppSync Resolver: Mutation.markItemEaten
 * Marks an item as eaten (status change)
 * Calls checkHouseholdMembership first (in resolver pipeline)
 */

export const request = (ctx) => {
  const input = ctx.args.input;
  const now = util.time.nowISO8601();
  const nowMs = Date.now();

  return {
    operation: 'UpdateItem',
    key: {
      PK: { S: `HOUSEHOLD#${input.householdId}` },
      SK: { S: `ITEM#${input.id}` },
    },
    update: {
      expression: 'SET #status = :status, eatenAt = :now, updatedAt = :now, _version = _version + :inc, _lastChangedAt = :lastChangedAt REMOVE GSI2PK, GSI2SK',
      expressionNames: {
        '#status': 'status',
      },
      expressionValues: {
        ':status': { S: 'eaten' },
        ':now': { S: now },
        ':lastChangedAt': { N: String(nowMs) },
        ':inc': { N: '1' },
      },
      conditionExpression: '#version = :version',
    },
    conditionExpression: `attribute_exists(#id) AND #version = :version`,
    expressionAttributeNames: {
      '#id': 'id',
      '#version': '_version',
    },
    expressionAttributeValues: {
      ':version': { N: String(input._version) },
    },
    returnValues: 'ALL_NEW',
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    if (ctx.error.errorType === 'ConditionalCheckFailedException') {
      return util.error('Item version mismatch', 'CONFLICT');
    }
    return util.error('Failed to mark item eaten', 'INTERNAL_ERROR');
  }
  return ctx.result;
};
