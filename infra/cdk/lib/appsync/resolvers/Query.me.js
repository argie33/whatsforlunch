// Query.me resolver
// Returns authenticated user's profile

const { getItem, getUserId } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
    const profile = await getItem(`USER#${userId}`, 'PROFILE');

    if (!profile) {
      return {
        errorType: 'NOT_FOUND',
        message: 'Profile not found',
      };
    }

    // Map DB record to GraphQL response
    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      photoUrl: profile.photoUrl, // DB uses photoUrl, GraphQL uses photoUrl
      timeZone: profile.timeZone,
      units: profile.units,
      locale: profile.locale,
      dietaryPreferences: profile.dietaryPreferences || [],
      cuisinePreferences: profile.cuisinePreferences || [],
      allergies: profile.allergies || [],
      defaultHouseholdId: profile.defaultHouseholdId,
      homeLocation: profile.homeLocation,
      subscriptionTier: profile.subscriptionTier || 'free',
      subscriptionExpiresAt: profile.subscriptionExpiresAt,
      aiQuotaUsedToday: profile.aiQuotaUsedToday || 0,
      aiQuotaResetAt: profile.aiQuotaResetAt,
      digestEnabled: profile.digestEnabled || false,
      digestTime: profile.digestTime || '09:00',
      digestTimezone: profile.digestTimezone || profile.timeZone,
      digestLastSentAt: profile.digestLastSentAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      errorType: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
};
