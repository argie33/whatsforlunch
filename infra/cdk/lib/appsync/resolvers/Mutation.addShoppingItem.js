// Mutation.addShoppingItem resolver
// Add item to household shopping list

const {
  buildCommonAttributes,
  getUserId,
  checkHouseholdMembership,
  putItem,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  try {
    await checkHouseholdMembership(userId, input.householdId);

    const itemId = buildCommonAttributes().id;
    const now = buildCommonAttributes().createdAt;

    const item = buildCommonAttributes({
      entityType: 'ShoppingListItem',
      PK: `HOUSEHOLD#${input.householdId}`,
      SK: `SHOP#${itemId}`,
      id: itemId,
      householdId: input.householdId,
      name: input.name,
      quantity: input.quantity || null,
      category: input.category || null,
      notes: input.notes || null,
      addedByUserId: userId,
      purchasedAt: null,
      purchasedByUserId: null,
      autoSuggested: false,
      linkedFoodType: input.linkedFoodType || null,
      clientId: input.clientId,
    });

    await putItem(item);

    return {
      id: item.id,
      householdId: item.householdId,
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      notes: item.notes,
      addedByUserId: item.addedByUserId,
      purchasedAt: item.purchasedAt,
      purchasedByUserId: item.purchasedByUserId,
      autoSuggested: item.autoSuggested,
      linkedFoodType: item.linkedFoodType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch (error) {
    console.error('Error adding shopping item:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};
