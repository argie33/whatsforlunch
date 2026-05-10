/**
 * AppSync Resolver: Query.listItems
 * Lists items in a household, sorted by storedAt desc
 * Calls checkHouseholdMembership first (in resolver pipeline)
 */

export const request = (ctx) => {
  const householdId = ctx.args.householdId;
  const limit = ctx.args.limit || 50;

  return {
    operation: 'Query',
    query: {
      expression: 'PK = :pk AND begins_with(SK, :sk)',
      expressionValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}` },
        ':sk': { S: 'ITEM#' },
      },
    },
    limit,
    scanIndexForward: false, // Descending (newest first)
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to list items', 'INTERNAL_ERROR');
  }
  return ctx.result.items || [];
};
