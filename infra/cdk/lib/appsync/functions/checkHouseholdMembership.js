/**
 * AppSync function: checkHouseholdMembership
 *
 * Pipeline step for every household-scoped resolver.
 * Verifies the caller is a member of the requested household.
 * Sets ctx.stash.userRole for downstream checkOwnerRole checks.
 */

export function request(ctx) {
  const userId = ctx.identity.sub;
  const householdId = ctx.args.input?.householdId ?? ctx.args.householdId ?? ctx.args.id;

  if (!userId) util.error('Unauthorized', 'UNAUTHENTICATED');
  if (!householdId) util.error('Missing householdId', 'BAD_REQUEST');

  // GetItem is cheaper than Query; we know the exact key
  return {
    operation: 'GetItem',
    key: {
      PK: { S: `HOUSEHOLD#${householdId}` },
      SK: { S: `MEMBER#${userId}` },
    },
  };
}

export function response(ctx) {
  if (ctx.error) util.error('Membership check failed', 'INTERNAL_ERROR');
  if (!ctx.result) util.unauthorized('Not a member of this household');

  ctx.stash.householdMember = ctx.result;
  ctx.stash.userRole = ctx.result.role?.S ?? ctx.result.role;

  return ctx.prev.result;
}
