const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  try {
    await checkHouseholdMembership(userId, input.householdId);

    // Find recipe
    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id AND entityType = :type',
        ExpressionAttributeValues: {
          ':id': input.id,
          ':type': 'SavedRecipe',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      throw new Error('Recipe not found');
    }

    const recipe = result.Items[0];

    const updated = {
      ...recipe,
      rating: input.rating !== undefined ? input.rating : recipe.rating,
      notes: input.notes !== undefined ? input.notes : recipe.notes,
      updatedAt: getCurrentTimestamp(),
      _version: recipe._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapRecipeToGraphQL(updated);
  } catch (error) {
    console.error('Error updating saved recipe:', error);
    throw error;
  }
};

function mapRecipeToGraphQL(r) {
  return {
    id: r.id,
    householdId: r.householdId,
    recipeId: r.recipeId,
    title: r.title,
    imageUrl: r.imageUrl,
    rating: r.rating,
    notes: r.notes,
    savedAt: r.savedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    _version: r._version,
    _lastChangedAt: r._lastChangedAt,
  };
}
