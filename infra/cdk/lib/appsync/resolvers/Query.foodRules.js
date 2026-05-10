// Query.foodRules resolver
// Returns food rules (cached by AppSync)
// Client can pass version to check if rules have changed

const { ddb, TABLE_NAME } = require('./utils');

exports.handler = async (event) => {
  const clientVersion = event.arguments.version;

  try {
    // Get all food rules
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'RULES',
          ':sk': 'FOOD#',
        },
      })
      .promise();

    const rules = result.Items || [];

    // Check if client has latest version
    const currentVersion = rules.length > 0 ? Math.max(...rules.map(r => r.version || 0)) : 0;

    if (clientVersion && clientVersion === currentVersion) {
      // Client has latest version, return empty array
      return [];
    }

    // Return all rules
    return rules.map(r => ({
      foodType: r.foodType,
      displayName: r.displayName,
      category: r.category,
      aliases: r.aliases || [],
      fridgeDaysSafe: r.fridgeDaysSafe,
      freezerDaysSafe: r.freezerDaysSafe,
      pantryDaysSafe: r.pantryDaysSafe,
      counterHoursSafe: r.counterHoursSafe,
      description: r.description,
      iconKey: r.iconKey,
      version: r.version,
    }));
  } catch (error) {
    console.error('Error fetching food rules:', error);
    return {
      errorType: 'QUERY_ERROR',
      message: error.message,
    };
  }
};
