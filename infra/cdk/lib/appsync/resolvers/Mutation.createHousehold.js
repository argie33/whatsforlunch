// Mutation.createHousehold resolver
// Create a new household owned by current user

const {
  buildCommonAttributes,
  getUserId,
  putItem,
  generateUUID,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  try {
    const householdId = generateUUID();
    const now = buildCommonAttributes().createdAt;

    // Create household metadata
    const household = buildCommonAttributes({
      entityType: 'Household',
      PK: `HOUSEHOLD#${householdId}`,
      SK: 'META',
      id: householdId,
      name: input.name,
      ownerId: userId,
      imageUrl: input.imageUrl || null,
      memberCount: 1,
      clientId: input.clientId,
    });

    // Create household member (owner)
    const member = buildCommonAttributes({
      entityType: 'HouseholdMember',
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
      userId,
      role: 'owner',
      joinedAt: now,
      GSI1PK: `USER#${userId}`,
      GSI1SK: `HOUSEHOLD#${householdId}`,
    });

    // Save both
    await putItem(household);
    await putItem(member);

    return {
      id: household.id,
      name: household.name,
      ownerId: household.ownerId,
      imageUrl: household.imageUrl,
      memberCount: 1,
      members: [{
        userId,
        role: 'owner',
        joinedAt: now,
      }],
      createdAt: household.createdAt,
      updatedAt: household.updatedAt,
      _version: household._version,
      _lastChangedAt: household._lastChangedAt,
    };
  } catch (error) {
    console.error('Error creating household:', error);
    return {
      errorType: 'MUTATION_ERROR',
      message: error.message,
    };
  }
};
