/**
 * AppSync Resolver: Mutation.updateProfile
 * Updates the authenticated user's profile
 */

export const request = (ctx) => {
  const userId = ctx.identity.sub;
  const input = ctx.args.input;
  const now = util.time.nowISO8601();

  // Build update expression dynamically based on provided fields
  const updateFields = {};
  const expressionValues = {};
  let updateExpression = 'SET updatedAt = :now, _lastChangedAt = :lastChangedAt, _version = if_not_exists(_version, :zero) + :inc';

  expressionValues[':now'] = { S: now };
  expressionValues[':lastChangedAt'] = { N: String(Date.now()) };
  expressionValues[':zero'] = { N: '0' };
  expressionValues[':inc'] = { N: '1' };

  // Optional fields
  if (input.displayName) {
    updateExpression += ', displayName = :displayName';
    expressionValues[':displayName'] = { S: input.displayName };
  }
  if (input.photoUrl) {
    updateExpression += ', photoUrl = :photoUrl';
    expressionValues[':photoUrl'] = { S: input.photoUrl };
  }
  if (input.timeZone) {
    updateExpression += ', timeZone = :timeZone';
    expressionValues[':timeZone'] = { S: input.timeZone };
  }
  if (input.units) {
    updateExpression += ', units = :units';
    expressionValues[':units'] = { S: input.units };
  }
  if (input.locale) {
    updateExpression += ', locale = :locale';
    expressionValues[':locale'] = { S: input.locale };
  }
  if (input.dietaryPreferences !== undefined) {
    updateExpression += ', dietaryPreferences = :dietaryPreferences';
    expressionValues[':dietaryPreferences'] = {
      L: input.dietaryPreferences.map(p => ({ S: p })),
    };
  }
  if (input.cuisinePreferences !== undefined) {
    updateExpression += ', cuisinePreferences = :cuisinePreferences';
    expressionValues[':cuisinePreferences'] = {
      L: input.cuisinePreferences.map(p => ({ S: p })),
    };
  }
  if (input.allergies !== undefined) {
    updateExpression += ', allergies = :allergies';
    expressionValues[':allergies'] = {
      L: input.allergies.map(a => ({ S: a })),
    };
  }
  if (input.defaultHouseholdId) {
    updateExpression += ', defaultHouseholdId = :defaultHouseholdId';
    expressionValues[':defaultHouseholdId'] = { S: input.defaultHouseholdId };
  }

  return {
    operation: 'UpdateItem',
    key: {
      PK: { S: `USER#${userId}` },
      SK: { S: 'PROFILE' },
    },
    update: {
      expression: updateExpression,
      expressionValues,
    },
    returnValues: 'ALL_NEW',
  };
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to update profile', 'INTERNAL_ERROR');
  }
  return ctx.result;
};
