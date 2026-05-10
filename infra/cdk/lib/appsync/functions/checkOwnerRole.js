/**
 * AppSync function: checkOwnerRole
 *
 * Called before owner-only operations (delete household, change settings, etc.)
 * Verifies that the user has owner role in the household
 */

export function request(ctx) {
  if (ctx.stash.userRole !== 'owner') {
    util.error('Forbidden: owner role required', 'FORBIDDEN');
  }
  return {}; // NONE data source — no DB call needed
}

export function response(ctx) {
  return ctx.prev.result;
}
