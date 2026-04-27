// Subscription.onItemChanged resolver
// Subscribe to item changes in a household

exports.handler = async (event) => {
  const householdId = event.arguments.householdId;
  const userId = event.identity?.claims?.sub;

  if (!userId) {
    return { errorType: 'AUTH_ERROR', message: 'User not authenticated' };
  }

  // Return subscription filter for AppSync
  // This defines who gets notified when mutations publish to this subscription
  return {
    filter: {
      householdId: [householdId],
      excludeCurrentUser: userId,
    },
  };
};
