// Query.getProfile resolver
// Alias for Query.me - get authenticated user's profile

const {
  ddb,
  TABLE_NAME,
  getUserId,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
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
      return { errorType: 'NOT_FOUND', message: 'Profile not found' };
    }

    const profile = result.Items[0];
    return mapProfileToGraphQL(profile);
  } catch (error) {
    console.error('Error getting profile:', error);
    return { errorType: 'QUERY_ERROR', message: error.message };
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
