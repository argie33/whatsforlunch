// Query.getHouseholdInvite resolver
// Get invite details by token (for accepting invites)

const {
  ddb,
  TABLE_NAME,
} = require('./utils');

exports.handler = async (event) => {
  const token = event.arguments.token;

  try {
    // Find invite by scanning for token (could optimize with GSI if many invites)
    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'inviteToken = :token AND entityType = :type',
        ExpressionAttributeValues: {
          ':token': token,
          ':type': 'HouseholdInvite',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const invite = result.Items[0];

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      return null;
    }

    // Check if already accepted
    if (invite.acceptedAt) {
      return null;
    }

    return mapInviteToGraphQL(invite);
  } catch (error) {
    console.error('Error getting household invite:', error);
    throw error;
  }
};

function mapInviteToGraphQL(invite) {
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
}
