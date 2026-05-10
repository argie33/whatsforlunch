/**
 * AppSync Resolver: Query.listHouseholds
 * Lists all households the user belongs to
 * Uses GSI1: USER#{userId} → HOUSEHOLD#{householdId}
 */

export const request = (ctx) => {
  const userId = ctx.identity.sub;

  return {
    operation: 'Query',
    query: {
      expression: 'GSI1PK = :gsi1pk',
      expressionValues: {
        ':gsi1pk': { S: `USER#${userId}` },
      },
    },
    index: 'GSI1',
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to list households', 'INTERNAL_ERROR');
  }
  return ctx.result.items || [];
};
