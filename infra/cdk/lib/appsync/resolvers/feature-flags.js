/**
 * Feature Flags & Configuration Management
 * Runtime feature toggle system without requiring redeployment
 *
 * Usage:
 * const { FeatureFlags } = require('./feature-flags');
 * const flags = new FeatureFlags();
 * if (flags.isEnabled('ai-classification')) { ... }
 */

const { ddb, TABLE_NAME } = require('./utils');

// ============================================
// Feature Flags Cache
// ============================================

const flagCache = new Map();
const cacheExpiry = 5 * 60 * 1000; // 5 minutes

// ============================================
// Feature Flag Manager
// ============================================

class FeatureFlags {
  constructor() {
    this.cache = new Map();
    this.cacheTime = 0;
  }

  /**
   * Check if feature is enabled
   * @param {string} featureName - Feature to check
   * @param {Object} context - Optional context (userId, householdId, etc.)
   * @returns {Promise<boolean>} Whether feature is enabled
   */
  async isEnabled(featureName, context = {}) {
    // Check local cache first
    const cached = this.getCached(featureName);
    if (cached !== undefined) {
      return cached;
    }

    // Fetch from DynamoDB
    const result = await ddb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: 'CONFIG#FEATURE_FLAGS',
          SK: `FLAG#${featureName}`,
        },
      })
      .promise();

    if (!result.Item) {
      // Feature doesn't exist - disabled by default
      this.setCached(featureName, false);
      return false;
    }

    const flag = result.Item;

    // Check if globally enabled
    if (!flag.enabled) {
      this.setCached(featureName, false);
      return false;
    }

    // Check user-level rollout
    if (flag.rolloutPercentage < 100) {
      const enabled = this.checkRollout(context.userId, featureName, flag.rolloutPercentage);
      this.setCached(featureName, enabled);
      return enabled;
    }

    // Check user/group exclusions
    if (flag.excludedUsers && flag.excludedUsers.includes(context.userId)) {
      this.setCached(featureName, false);
      return false;
    }

    if (flag.excludedGroups) {
      if (context.groups && context.groups.some((g) => flag.excludedGroups.includes(g))) {
        this.setCached(featureName, false);
        return false;
      }
    }

    // Check user/group inclusions
    if (flag.includedUsers || flag.includedGroups) {
      const userIncluded = flag.includedUsers && flag.includedUsers.includes(context.userId);
      const groupIncluded =
        flag.includedGroups &&
        context.groups &&
        context.groups.some((g) => flag.includedGroups.includes(g));

      if (!userIncluded && !groupIncluded) {
        this.setCached(featureName, false);
        return false;
      }
    }

    this.setCached(featureName, true);
    return true;
  }

  /**
   * Get flag details
   * @param {string} featureName - Feature name
   * @returns {Promise<Object>} Flag details
   */
  async getFlag(featureName) {
    const result = await ddb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: 'CONFIG#FEATURE_FLAGS',
          SK: `FLAG#${featureName}`,
        },
      })
      .promise();

    return result.Item || null;
  }

  /**
   * Set flag
   * @param {string} featureName - Feature name
   * @param {Object} flagConfig - Flag configuration
   */
  async setFlag(featureName, flagConfig) {
    const flag = {
      PK: 'CONFIG#FEATURE_FLAGS',
      SK: `FLAG#${featureName}`,
      entityType: 'FeatureFlag',
      name: featureName,
      enabled: flagConfig.enabled || false,
      description: flagConfig.description || '',
      rolloutPercentage: flagConfig.rolloutPercentage || 0,
      includedUsers: flagConfig.includedUsers || [],
      includedGroups: flagConfig.includedGroups || [],
      excludedUsers: flagConfig.excludedUsers || [],
      excludedGroups: flagConfig.excludedGroups || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    await ddb
      .put({
        TableName: TABLE_NAME,
        Item: flag,
      })
      .promise();

    // Invalidate cache
    this.cache.delete(featureName);
    flagCache.delete(featureName);

    console.log(`[feature-flags] Updated flag: ${featureName}`);

    return flag;
  }

  /**
   * List all flags
   * @returns {Promise<Array>} All flags
   */
  async listFlags() {
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': 'CONFIG#FEATURE_FLAGS',
          ':sk': 'FLAG#',
        },
      })
      .promise();

    return result.Items || [];
  }

  /**
   * Disable flag
   * @param {string} featureName - Feature to disable
   */
  async disableFlag(featureName) {
    const flag = await this.getFlag(featureName);
    if (flag) {
      await this.setFlag(featureName, {
        ...flag,
        enabled: false,
      });
    }
  }

  /**
   * Enable flag
   * @param {string} featureName - Feature to enable
   */
  async enableFlag(featureName) {
    const flag = await this.getFlag(featureName);
    if (flag) {
      await this.setFlag(featureName, {
        ...flag,
        enabled: true,
      });
    } else {
      await this.setFlag(featureName, {
        enabled: true,
      });
    }
  }

  /**
   * Set rollout percentage
   * @param {string} featureName - Feature name
   * @param {number} percentage - Rollout percentage (0-100)
   */
  async setRollout(featureName, percentage) {
    const flag = await this.getFlag(featureName);
    if (flag) {
      await this.setFlag(featureName, {
        ...flag,
        rolloutPercentage: Math.max(0, Math.min(100, percentage)),
      });
    }
  }

  /**
   * Add user to flag
   * @param {string} featureName - Feature name
   * @param {string} userId - User ID
   * @param {boolean} include - Include or exclude
   */
  async setUserAccess(featureName, userId, include = true) {
    const flag = await this.getFlag(featureName);
    if (!flag) {
      throw new Error(`Flag not found: ${featureName}`);
    }

    const key = include ? 'includedUsers' : 'excludedUsers';
    const users = flag[key] || [];

    if (!users.includes(userId)) {
      users.push(userId);
      await this.setFlag(featureName, {
        ...flag,
        [key]: users,
      });
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  getCached(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.time < cacheExpiry) {
      return entry.value;
    }
    this.cache.delete(key);
    return undefined;
  }

  setCached(key, value) {
    this.cache.set(key, {
      value,
      time: Date.now(),
    });
  }

  checkRollout(userId, featureName, percentage) {
    if (!userId) return false;

    // Generate deterministic hash based on user + feature
    const hash = (userId + featureName)
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const userPercentage = (hash % 100) + 1;
    return userPercentage <= percentage;
  }
}

// ============================================
// Middleware
// ============================================

/**
 * Middleware to inject feature flags
 */
function withFeatureFlags(resolver) {
  return async (event) => {
    const flags = new FeatureFlags();

    // Inject into context
    event.featureFlags = flags;

    return resolver(event);
  };
}

// ============================================
// Default Feature Flags
// ============================================

const DEFAULT_FLAGS = [
  {
    name: 'ai-classification',
    description: 'AI-powered food classification',
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    name: 'ocr-expiry-detection',
    description: 'OCR-based expiry date detection',
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    name: 'real-time-sync',
    description: 'Real-time data synchronization',
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    name: 'push-notifications',
    description: 'Push notifications for expiring items',
    enabled: true,
    rolloutPercentage: 100,
  },
  {
    name: 'advanced-analytics',
    description: 'Advanced analytics and reporting',
    enabled: false,
    rolloutPercentage: 0,
  },
  {
    name: 'recommendation-engine',
    description: 'ML-based recipe recommendations',
    enabled: false,
    rolloutPercentage: 0,
  },
];

/**
 * Initialize default feature flags
 */
async function initializeDefaultFlags() {
  const flags = new FeatureFlags();

  for (const flag of DEFAULT_FLAGS) {
    const existing = await flags.getFlag(flag.name);
    if (!existing) {
      await flags.setFlag(flag.name, flag);
      console.log(`[feature-flags] Initialized flag: ${flag.name}`);
    }
  }
}

// ============================================
// Exports
// ============================================

module.exports = {
  FeatureFlags,
  withFeatureFlags,
  initializeDefaultFlags,
  DEFAULT_FLAGS,
};
