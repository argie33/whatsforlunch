// Query.listShoppingItems resolver
// List shopping list items for a household

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const showPurchased = event.arguments.showPurchased || false;

  try {
    await checkHouseholdMembership(userId, householdId);

    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'SHOP#',
        },
      })
      .promise();

    let items = result.Items || [];

    // Filter out deleted items
    items = items.filter((i) => !i.deletedAt);

    // Filter out purchased items unless requested
    if (!showPurchased) {
      items = items.filter((i) => !i.purchasedAt);
    }

    return items.map(mapShoppingItemToGraphQL);
  } catch (error) {
    console.error('Error listing shopping items:', error);
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
