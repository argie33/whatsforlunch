// Query.getItem resolver
// Get a single food item by ID

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
          ':type': 'Item',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const item = result.Items[0];

    // Check user is in the household
    await checkHouseholdMembership(userId, item.householdId);

    return mapItemToGraphQL(item);
  } catch (error) {
    console.error('Error getting item:', error);
    throw error;
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
