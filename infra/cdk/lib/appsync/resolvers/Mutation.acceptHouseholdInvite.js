// Mutation.acceptHouseholdInvite resolver
// Accept household invitation and become a member

const {
  ddb,
  TABLE_NAME,
  getUserId,
  putItem,
  getCurrentTimestamp,
} = require('./utils');
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const inviteToken = event.arguments.inviteToken;

  try {
    // Find the invite by GSI (INVITE token)
    let invite = null;
    let householdId = null;

    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'inviteToken = :token AND entityType = :type',
        ExpressionAttributeValues: {
          ':token': inviteToken,
          ':type': 'HouseholdInvite',
        },
      })
      .promise();

    if (result.Items && result.Items.length > 0) {
      invite = result.Items[0];
      householdId = invite.householdId;
    }

    if (!invite) {
      throw new Error('Resource not found');
    }

    // Check expiration
    if (new Date(invite.expiresAt) < new Date()) {
      throw new Error('Invite has expired');
    }

    // Check if already accepted
    if (invite.acceptedAt) {
      throw new Error('Invite already accepted');
    }

    // Create member record linking user to household
    const memberId = uuid();
    const member = {
      id: memberId,
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
      entityType: 'HouseholdMember',
      householdId,
      userId,
      role: invite.role || 'member',
      joinedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    // Update user's GSI1 to link them to this household
    member.GSI1PK = `USER#${userId}`;
    member.GSI1SK = `HOUSEHOLD#${householdId}`;

    // Mark invite as accepted
    const acceptedInvite = {
      ...invite,
      acceptedAt: getCurrentTimestamp(),
      acceptedByUserId: userId,
      updatedAt: getCurrentTimestamp(),
      _version: invite._version + 1,
      _lastChangedAt: Date.now(),
    };

    // Store both member and accepted invite
    await putItem(member);
    await putItem(acceptedInvite);

    return {
      id: acceptedInvite.id,
      inviteToken: acceptedInvite.inviteToken,
      householdId: acceptedInvite.householdId,
      role: acceptedInvite.role,
      acceptedAt: acceptedInvite.acceptedAt,
      acceptedByUserId: acceptedInvite.acceptedByUserId,
    };
  } catch (error) {
    console.error('Error accepting household invite:', error);
    throw error;
  }
};
