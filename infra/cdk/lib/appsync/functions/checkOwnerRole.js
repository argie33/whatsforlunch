/**
 * AppSync function: checkOwnerRole
 *
 * Called before owner-only operations (delete household, change settings, etc.)
 * Verifies that the user has owner role in the household
 */

export function request(ctx) {
  const userRole = ctx.stash.userRole;

  if (userRole !== 'owner') {
    return util.error('Forbidden: Only household owner can perform this action', 'FORBIDDEN');
  }

  return ctx.prev.result;
}

export function response(ctx) {
  return ctx.prev.result;
}
