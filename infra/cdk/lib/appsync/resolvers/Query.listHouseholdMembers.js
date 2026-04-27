// Query.listHouseholdMembers resolver
// List members of a household

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;

  try {
    await checkHouseholdMembership(userId, householdId);

    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'MEMBER#',
        },
      })
      .promise();

    let members = result.Items || [];

    // Filter out deleted members
    members = members.filter((m) => !m.deletedAt);

    return members.map(mapMemberToGraphQL);
  } catch (error) {
    console.error('Error listing household members:', error);
    return { errorType: 'QUERY_ERROR', message: error.message };
  }
};

function mapMemberToGraphQL(member) {
  return {
    id: member.id,
    householdId: member.householdId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    updatedAt: member.updatedAt,
  };
}
