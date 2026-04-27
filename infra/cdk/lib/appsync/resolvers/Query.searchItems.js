// Query.searchItems resolver
// Search items by name in a household

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const query = event.arguments.query.toLowerCase();

  try {
    await checkHouseholdMembership(userId, householdId);

    // Query all items in household
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'ITEM#',
        },
      })
      .promise();

    let items = result.Items || [];

    // Filter by search query (name contains) and exclude deleted
    items = items.filter(
      (i) =>
        !i.deletedAt &&
        i.foodType &&
        (i.foodType.toLowerCase().includes(query) ||
          (i.notes && i.notes.toLowerCase().includes(query)))
    );

    // Sort by relevance (exact matches first, then contains)
    items.sort((a, b) => {
      const aExact = a.foodType.toLowerCase() === query ? 1 : 0;
      const bExact = b.foodType.toLowerCase() === query ? 1 : 0;
      return bExact - aExact;
    });

    return items.map(mapItemToGraphQL);
  } catch (error) {
    console.error('Error searching items:', error);
    return { errorType: 'QUERY_ERROR', message: error.message };
  }
};

function mapItemToGraphQL(item) {
  const now = Date.now();
  const expiryAtMs = new Date(item.expiryAt).getTime();
  const hoursUntilExpiry = Math.max(0, Math.floor((expiryAtMs - now) / (1000 * 60 * 60)));

  let statusColor = 'green';
  if (item.status === 'eaten' || item.status === 'tossed') {
    statusColor = 'gray';
  } else if (hoursUntilExpiry === 0) {
    statusColor = 'red';
  } else if (hoursUntilExpiry <= 24) {
    statusColor = 'orange';
  } else if (hoursUntilExpiry <= 72) {
    statusColor = 'yellow';
  }

  return {
    id: item.id,
    householdId: item.householdId,
    containerId: item.containerId,
    foodType: item.foodType,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    status: item.status,
    expiryAt: item.expiryAt,
    hoursUntilExpiry,
    statusColor,
    storageLocation: item.storageLocation,
    purchasedAt: item.purchasedAt,
    notes: item.notes,
    barcode: item.barcode,
    photoUrl: item.photoUrl,
    createdByUserId: item.createdByUserId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
  };
}
