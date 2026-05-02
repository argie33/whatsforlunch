// Query.getProfileById resolver
// Get another user's public profile

const {
  ddb,
  TABLE_NAME,
  getUserId,
} = require('./utils');

exports.handler = async (event) => {
  const userId = event.arguments.userId;

  try {
    // Get profile
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
      return null;
    }

    const profile = result.Items[0];

    // Return public fields only
    return {
      id: profile.id,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl,
    };
  } catch (error) {
    console.error('Error getting profile by ID:', error);
    throw error;
  }
};
