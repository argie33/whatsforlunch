const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const recipeId = event.arguments.id;

  try {
    await checkHouseholdMembership(userId, householdId);

    // Find recipe
    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id AND entityType = :type',
        ExpressionAttributeValues: {
          ':id': recipeId,
          ':type': 'SavedRecipe',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      throw new Error('Recipe not found');
    }

    const recipe = result.Items[0];

    // Soft delete
    const params = {
      TableName: TABLE_NAME,
      Key: { PK: recipe.PK, SK: recipe.SK },
      UpdateExpression: 'SET #deletedAt = :now, #updatedAt = :now, #version = #version + :inc',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#updatedAt': 'updatedAt',
        '#version': '_version',
      },
      ExpressionAttributeValues: {
        ':now': getCurrentTimestamp(),
        ':inc': 1,
      },
      ReturnValues: 'ALL_NEW',
    };

    await ddb.update(params).promise();

    return true;
  } catch (error) {
    console.error('Error deleting saved recipe:', error);
    throw error;
  }
};
