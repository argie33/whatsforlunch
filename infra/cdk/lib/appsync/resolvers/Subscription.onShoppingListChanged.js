// Subscription.onShoppingListChanged resolver
// Subscribe to shopping list changes in a household

exports.handler = async (event) => {
  const householdId = event.arguments.householdId;
  const userId = event.identity?.claims?.sub;

  if (!userId) {
    return { errorType: 'AUTH_ERROR', message: 'User not authenticated' };
  }

  // Return subscription filter for AppSync
  return {
    filter: {
      householdId: [householdId],
      excludeCurrentUser: userId,
    },
  };
};
