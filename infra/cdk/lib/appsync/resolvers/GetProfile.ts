/**
 * AppSync Resolver: Query.getProfile
 * Returns the authenticated user's profile
 */

export const request = (ctx) => {
  const userId = ctx.identity.sub;
  return {
    operation: 'GetItem',
    key: {
      PK: { S: `USER#${userId}` },
      SK: { S: 'PROFILE' },
    },
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to get profile', 'INTERNAL_ERROR');
  }
  return ctx.result;
};
