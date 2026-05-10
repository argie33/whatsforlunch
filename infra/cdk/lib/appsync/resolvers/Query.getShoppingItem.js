// Query.getShoppingItem resolver
// Get a single shopping list item by ID

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const itemId = event.arguments.id;

  try {
    // Find item
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

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];

    // Check user is in the household
    await checkHouseholdMembership(userId, item.householdId);

    return mapShoppingItemToGraphQL(item);
  } catch (error) {
    console.error('Error getting shopping item:', error);
    throw error;
  }
};

function mapShoppingItemToGraphQL(item) {
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
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
  };
}
