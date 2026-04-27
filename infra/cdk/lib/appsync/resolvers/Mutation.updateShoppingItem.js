// Mutation.updateShoppingItem resolver
// Update shopping list item

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
    // Get item to find household
    const getResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${input.id}`,
          ':sk': 'SHOP#',
        },
      })
      .promise();

    // Find the specific item
    let item = null;
    for (const i of getResult.Items || []) {
      if (i.id === input.id) {
        item = i;
        break;
      }
    }

    if (!item) {
      return { errorType: 'NOT_FOUND', message: 'Shopping item not found' };
    }

    await checkHouseholdMembership(userId, item.householdId);

    // Check version
    if (input.expectedVersion !== item._version) {
      return { errorType: 'CONFLICT', message: 'Item was modified' };
    }

    const updated = {
      ...item,
      name: input.name !== undefined ? input.name : item.name,
      quantity: input.quantity !== undefined ? input.quantity : item.quantity,
      category: input.category !== undefined ? input.category : item.category,
      notes: input.notes !== undefined ? input.notes : item.notes,
      linkedFoodType: input.linkedFoodType !== undefined ? input.linkedFoodType : item.linkedFoodType,
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
    console.error('Error updating shopping item:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};
