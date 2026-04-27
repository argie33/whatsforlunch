/**
 * AppSync Resolver: Mutation.createHousehold
 * Creates a new household with the user as owner
 */

export const request = (ctx) => {
  const userId = ctx.identity.sub;
  const input = ctx.args.input;
  const householdId = util.autoId();
  const now = util.time.nowISO8601();

  return {
    operation: 'TransactWriteItems',
    transactWriteItems: [
      // Create household metadata
      {
        operation: 'PutItem',
        key: {
          PK: { S: `HOUSEHOLD#${householdId}` },
          SK: { S: 'META' },
        },
        attributeValues: {
          entityType: { S: 'Household' },
          id: { S: householdId },
          name: { S: input.name },
          ownerId: { S: userId },
          imageUrl: input.imageUrl ? { S: input.imageUrl } : { NULL: true },
          memberCount: { N: '1' },
          createdAt: { S: now },
          updatedAt: { S: now },
          _version: { N: '1' },
          _lastChangedAt: { N: String(Date.now()) },
          // GSI1
          GSI1PK: { S: `USER#${userId}` },
          GSI1SK: { S: `HOUSEHOLD#${householdId}` },
        },
      },
      // Add user as household owner member
      {
        operation: 'PutItem',
        key: {
          PK: { S: `HOUSEHOLD#${householdId}` },
          SK: { S: `MEMBER#${userId}` },
        },
        attributeValues: {
          entityType: { S: 'HouseholdMember' },
          userId: { S: userId },
          role: { S: 'owner' },
          joinedAt: { S: now },
          // GSI1
          GSI1PK: { S: `USER#${userId}` },
          GSI1SK: { S: `HOUSEHOLD#${householdId}` },
        },
      },
    ],
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to create household', 'INTERNAL_ERROR');
  }
  // Return the created household metadata
  return {
    id: util.autoId(), // Will be set by transact write
    name: ctx.args.input.name,
    ownerId: ctx.identity.sub,
    memberCount: 1,
    members: [
      {
        userId: ctx.identity.sub,
        role: 'owner',
        joinedAt: util.time.nowISO8601(),
      },
    ],
    createdAt: util.time.nowISO8601(),
    updatedAt: util.time.nowISO8601(),
    _version: 1,
    _lastChangedAt: Date.now(),
  };
};
