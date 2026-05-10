// Mutation.inviteToHousehold resolver
// Generate invitation link for household membership

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdOwner,
  putItem,
  getCurrentTimestamp,
} = require('./utils');
const { v4: uuid } = require('uuid');
const crypto = require('crypto');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const input = event.arguments.input;

  try {
    // Verify user is owner of household
    await checkHouseholdOwner(userId, householdId);

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteId = uuid();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const invite = {
      id: inviteId,
      PK: `HOUSEHOLD#${householdId}`,
      SK: `INVITE#${inviteToken}`,
      entityType: 'HouseholdInvite',
      householdId,
      inviteToken,
      invitedEmail: input.invitedEmail || null,
      invitedByUserId: userId,
      role: input.role || 'member',
      expiresAt,
      acceptedAt: null,
      acceptedByUserId: null,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(invite);

    return {
      id: invite.id,
      inviteToken: invite.inviteToken,
      householdId: invite.householdId,
      invitedEmail: invite.invitedEmail,
      invitedByUserId: invite.invitedByUserId,
      role: invite.role,
      expiresAt: invite.expiresAt,
      acceptedAt: invite.acceptedAt,
      createdAt: invite.createdAt,
    };
  } catch (error) {
    console.error('Error creating household invite:', error);
    throw error;
  }
};
