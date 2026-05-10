// Query.listSavedRecipes resolver
// List saved recipes for a household with pagination

const { getUserId, checkHouseholdMembership, query } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const { householdId, limit = 50, nextToken } = event.arguments;

  try {
    // Verify user is member of household
    await checkHouseholdMembership(userId, householdId);

    // Build query for saved recipes in household
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'RECIPE#',
      },
      ScanIndexForward: false, // Newest first
      Limit: Math.min(limit, 100), // Cap at 100
    };

    // Handle pagination token
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await query(params);

    // Filter out soft-deleted recipes
    const items = result.items
      .filter((item) => !item.deletedAt)
      .map((recipe) => ({
        id: recipe.id,
        householdId: recipe.householdId,
        recipeId: recipe.recipeId,
        title: recipe.title,
        imageUrl: recipe.imageUrl,
        rating: recipe.rating,
        notes: recipe.notes,
        savedAt: recipe.savedAt,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        _version: recipe._version,
        _lastChangedAt: recipe._lastChangedAt,
      }));

    // Encode next token for pagination
    const nextTokenStr = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return {
      items,
      nextToken: nextTokenStr,
    };
  } catch (error) {
    console.error('Error listing saved recipes:', error);
    throw error;
  }
};
