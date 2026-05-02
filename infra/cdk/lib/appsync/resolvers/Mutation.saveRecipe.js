const { buildCommonAttributes, getUserId, checkHouseholdMembership, putItem } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;
  const householdId = input.householdId;

  try {
    await checkHouseholdMembership(userId, householdId);

    const recipeId = input.recipeId;
    const now = buildCommonAttributes().createdAt;

    const recipe = buildCommonAttributes({
      entityType: 'SavedRecipe',
      PK: `HOUSEHOLD#${householdId}`,
      SK: `RECIPE#${recipeId}`,
      id: buildCommonAttributes().id,
      householdId,
      recipeId,
      title: input.title,
      imageUrl: input.imageUrl || null,
      rating: input.rating || null,
      notes: input.notes || null,
      savedAt: now,
      clientId: input.clientId,
    });

    await putItem(recipe);

    return {
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
    };
  } catch (error) {
    console.error('Error saving recipe:', error);
    throw error;
  }
};
