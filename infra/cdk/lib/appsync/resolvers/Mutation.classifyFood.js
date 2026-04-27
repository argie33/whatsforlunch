// Mutation.classifyFood resolver
// Call W4 AI Lambda to classify food from photo
// W4 returns classification and creates item

const {
  getUserId,
  checkHouseholdMembership,
  invokeW4Lambda,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const photoUrl = event.arguments.photoUrl;

  try {
    await checkHouseholdMembership(userId, householdId);

    // Invoke W4's classifyFood Lambda
    // Expected response: { foodType, confidence, expiryDays, category, ... }
    const classification = await invokeW4Lambda('classify-food', {
      photoUrl,
      householdId,
      userId,
    });

    // W4 Lambda handles creating the item and returns the Item object
    return classification;
  } catch (error) {
    console.error('Error classifying food:', error);
    return { errorType: 'AI_ERROR', message: error.message };
  }
};
