// Mutation.deleteShoppingItem resolver
// Remove shopping list item

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
  const itemId = event.arguments.id;

  try {
    // Find item
    let item = null;
    let householdId = null;

    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id AND entityType = :type',
        ExpressionAttributeValues: {
          ':id': itemId,
          ':type': 'ShoppingListItem',
        },
      })
      .promise();

    if (result.Items && result.Items.length > 0) {
      item = result.Items[0];
      householdId = item.householdId;
    }

    if (!item) {
      throw new Error('Resource not found');
    }

    await checkHouseholdMembership(userId, householdId);

    const updated = {
      ...item,
      deletedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return {
      id: updated.id,
      householdId: updated.householdId,
      name: updated.name,
      quantity: updated.quantity,
      category: updated.category,
      notes: updated.notes,
      addedByUserId: updated.addedByUserId,
      purchasedAt: updated.purchasedAt,
      purchasedByUserId: updated.purchasedByUserId,
      autoSuggested: updated.autoSuggested,
      linkedFoodType: updated.linkedFoodType,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    console.error('Error deleting shopping item:', error);
    throw error;
  }
};
