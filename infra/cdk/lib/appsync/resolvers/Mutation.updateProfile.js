// Mutation.updateProfile resolver
// Update authenticated user's profile

const {
  ddb,
  TABLE_NAME,
  getUserId,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  try {
    // Get current profile
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PROFILE',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      throw new Error('Resource not found');
    }

    const profile = result.Items[0];

    // Update fields if provided
    const updated = {
      ...profile,
      displayName: input.displayName !== undefined ? input.displayName : profile.displayName,
      photoUrl: input.photoUrl !== undefined ? input.photoUrl : profile.photoUrl,
      timeZone: input.timeZone !== undefined ? input.timeZone : profile.timeZone,
      units: input.units !== undefined ? input.units : profile.units,
      locale: input.locale !== undefined ? input.locale : profile.locale,
      dietaryPreferences: input.dietaryPreferences || profile.dietaryPreferences,
      cuisinePreferences: input.cuisinePreferences || profile.cuisinePreferences,
      allergies: input.allergies || profile.allergies,
      defaultHouseholdId: input.defaultHouseholdId || profile.defaultHouseholdId,
      homeLocation: input.homeLocation || profile.homeLocation,
      updatedAt: getCurrentTimestamp(),
      _version: profile._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapProfileToGraphQL(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

function mapProfileToGraphQL(p) {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    photoUrl: p.photoUrl,
    timeZone: p.timeZone,
    units: p.units,
    locale: p.locale,
    dietaryPreferences: p.dietaryPreferences,
    cuisinePreferences: p.cuisinePreferences,
    allergies: p.allergies,
    defaultHouseholdId: p.defaultHouseholdId,
    homeLocation: p.homeLocation,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    _version: p._version,
    _lastChangedAt: p._lastChangedAt,
  };
}
