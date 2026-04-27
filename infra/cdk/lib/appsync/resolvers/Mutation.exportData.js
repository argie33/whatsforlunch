// Mutation.exportData resolver
// Export user's data as JSON string (GDPR compliance)

const {
  ddb,
  TABLE_NAME,
  getUserId,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
    // Get user profile
    const profileResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PROFILE',
        },
      })
      .promise();

    // Get all household memberships via GSI1
    const membershipsResult = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
      })
      .promise();

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profileResult.Items?.[0] || null,
      householdMemberships: membershipsResult.Items || [],
    };

    // Return as JSON string
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Error exporting data:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};
