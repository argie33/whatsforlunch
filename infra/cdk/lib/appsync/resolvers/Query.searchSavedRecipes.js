// Query.searchSavedRecipes resolver
// Search saved recipes by title or recipe ID

const { getUserId, checkHouseholdMembership, query } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const { householdId, query: searchQuery } = event.arguments;

  try {
    // Verify user is member of household
    await checkHouseholdMembership(userId, householdId);

    // Get all saved recipes for the household
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'RECIPE#',
      },
    };

    const result = await query(params);

    // Filter out soft-deleted recipes
    let recipes = result.items.filter((item) => !item.deletedAt);

    // Search by title or recipe ID (case-insensitive)
    const queryLower = searchQuery.toLowerCase();
    recipes = recipes.filter((recipe) => {
      const titleMatch = recipe.title.toLowerCase().includes(queryLower);
      const recipeIdMatch = recipe.recipeId.toLowerCase().includes(queryLower);
      return titleMatch || recipeIdMatch;
    });

    // Sort by saved date descending
    recipes.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return recipes.map((recipe) => ({
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
  } catch (error) {
    console.error('Error searching saved recipes:', error);
    throw error;
  }
};
