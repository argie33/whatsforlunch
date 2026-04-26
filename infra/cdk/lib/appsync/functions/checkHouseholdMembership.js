/**
 * AppSync function: checkHouseholdMembership
 *
 * Called before every household-scoped mutation/query to verify:
 * 1. User is authenticated (has JWT)
 * 2. User is a member of the requested household
 * 3. User has the required role (owner, member, viewer)
 *
 * Sets ctx.stash.householdMember with the member record for downstream resolvers
 */

export function request(ctx) {
  const userId = ctx.identity.sub;
  const householdId = ctx.args.input?.householdId ?? ctx.args.householdId;

  if (!userId) {
    return util.error('Unauthorized: No user ID', 'UNAUTHENTICATED');
  }

  if (!householdId) {
    return util.error('Missing householdId', 'BAD_REQUEST');
  }

  // Query: USER#userId, MEMBER#householdId to get membership record
  return {
    operation: 'Query',
    query: {
      expression: 'begins_with(PK, :pk) AND begins_with(SK, :sk)',
      expressionNames: {},
      expressionValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}` },
        ':sk': { S: `MEMBER#${userId}` },
      },
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    return util.error('Failed to check household membership', 'INTERNAL_ERROR');
  }

  const items = ctx.result?.Items || [];
  if (items.length === 0) {
    return util.unauthorized('Not a member of this household');
  }

  const memberRecord = items[0];

  // Store for downstream resolvers
  ctx.stash.householdMember = memberRecord;
  ctx.stash.userRole = memberRecord.role;

  return ctx.prev.result;
}
