// Mutation.ocrExpiryDate resolver
// Call W4 AI Lambda to extract expiry date from photo
// W4 performs OCR on packaging and returns extracted date

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

    // Invoke W4's ocrExpiryDate Lambda
    // Expected response: { expiryDate: "2026-05-15", confidence: 0.95, source: "ocr" }
    const result = await invokeW4Lambda('ocr-expiry-date', {
      photoUrl,
      householdId,
      userId,
    });

    // Return extracted date string
    return result.expiryDate;
  } catch (error) {
    console.error('Error extracting expiry date:', error);
    return { errorType: 'AI_ERROR', message: error.message };
  }
};
