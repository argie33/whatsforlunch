// Query.myPreferences resolver
// Fetch current user's learned food + cuisine preferences

const {
  getUserId,
  getItem,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
    // Fetch user's learned preferences
    const prefs = await getItem(
      `USER#${userId}`,
      'LEARNED_PREFERENCES',
    );

    if (!prefs) {
      // Return empty preferences if none exist yet
      return {
        userId,
        topEaten: [],
        topTossed: [],
        cuisineAffinity: [],
        lastUpdatedAt: new Date().toISOString(),
        _version: 0,
        _lastChangedAt: Date.now(),
      };
    }

    // Parse JSON fields if stored as strings
    return {
      userId: prefs.userId,
      topEaten: prefs.topEaten || [],
      topTossed: prefs.topTossed || [],
      cuisineAffinity: prefs.cuisineAffinity || [],
      lastUpdatedAt: prefs.lastUpdatedAt || new Date().toISOString(),
      _version: prefs._version || 0,
      _lastChangedAt: prefs._lastChangedAt || Date.now(),
    };
  } catch (error) {
    console.error('Error fetching preferences:', error);
    throw error;
  }
};
