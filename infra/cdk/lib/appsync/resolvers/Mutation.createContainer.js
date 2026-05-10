// Mutation.createContainer resolver
// Claim a QR-coded container

const {
  buildCommonAttributes,
  getUserId,
  checkHouseholdMembership,
  putItem,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;
  const householdId = input.householdId;

  try {
    // Use user's default household if not specified
    if (!householdId) {
      // TODO: Get user's default household from Profile
      throw new Error('householdId required');
    }

    await checkHouseholdMembership(userId, householdId);

    const containerId = buildCommonAttributes().id;
    const now = buildCommonAttributes().createdAt;

    const container = buildCommonAttributes({
      entityType: 'Container',
      PK: `HOUSEHOLD#${householdId}`,
      SK: `CONTAINER#${containerId}`,
      id: containerId,
      householdId,
      qrToken: input.qrToken,
      nickname: input.nickname || null,
      imageUrl: null,
      claimedAt: now,
      claimedBy: userId,
      archivedAt: null,
      currentItemId: null,
      clientId: input.clientId,
      // Set GSI4 for QR lookup
      GSI4PK: `QR_TOKEN#${input.qrToken}`,
      GSI4SK: 'CONTAINER',
    });

    await putItem(container);

    return {
      id: container.id,
      qrToken: container.qrToken,
      householdId: container.householdId,
      nickname: container.nickname,
      imageUrl: container.imageUrl,
      claimedAt: container.claimedAt,
      claimedBy: container.claimedBy,
      archivedAt: container.archivedAt,
      currentItem: null,
      history: [],
      createdAt: container.createdAt,
      updatedAt: container.updatedAt,
      _version: container._version,
      _lastChangedAt: container._lastChangedAt,
    };
  } catch (error) {
    console.error('Error creating container:', error);
    throw error;
  }
};
