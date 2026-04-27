// Food Rules Publish Handler
// Admin Lambda for batch publishing food spoilage rules

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || 'WFL-Main-dev';

async function publishFoodRules(rules) {
  // Validate admin access (would be checked by Step Functions IAM role)
  if (!rules || !Array.isArray(rules)) {
    throw new Error('Invalid rules format: expected array');
  }

  console.log(`[food-rules] Publishing ${rules.length} food rules`);

  const published = [];
  const errors = [];

  for (const rule of rules) {
    try {
      // Validate rule structure
      if (!rule.foodType || typeof rule.foodType !== 'string') {
        throw new Error(`Invalid foodType: ${rule.foodType}`);
      }

      const ruleEntry = {
        PK: 'FOODRULES#CATALOG',
        SK: `FOOD#${rule.foodType.toUpperCase()}`,
        entityType: 'FoodRule',
        foodType: rule.foodType,
        category: rule.category || 'other', // produce, dairy, meat, pantry, frozen, prepared
        fridgeDaysSafe: rule.fridgeDaysSafe || 7,
        freezerDaysSafe: rule.freezerDaysSafe || 180,
        pantryDaysSafe: rule.pantryDaysSafe || 30,
        counterHoursSafe: rule.counterHoursSafe || 2,
        notes: rule.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _version: 1,
        _lastChangedAt: Date.now(),
      };

      await dynamodb
        .put({
          TableName: TABLE_NAME,
          Item: ruleEntry,
          ConditionExpression: 'attribute_not_exists(PK) OR #v < :newV',
          ExpressionAttributeNames: { '#v': '_version' },
          ExpressionAttributeValues: { ':newV': ruleEntry._version },
        })
        .promise();

      published.push({
        foodType: rule.foodType,
        fridgeDaysSafe: ruleEntry.fridgeDaysSafe,
        freezerDaysSafe: ruleEntry.freezerDaysSafe,
        pantryDaysSafe: ruleEntry.pantryDaysSafe,
        counterHoursSafe: ruleEntry.counterHoursSafe,
      });

      console.log(`[food-rules] Published rule for ${rule.foodType}`);
    } catch (error) {
      errors.push({
        foodType: rule.foodType,
        error: error.message,
      });
      console.error(`[food-rules] Error publishing rule for ${rule.foodType}:`, error.message);
    }
  }

  // Log batch publication
  const logEntry = {
    PK: 'FOODRULES#LOG',
    SK: `BATCH#${Date.now()}`,
    entityType: 'FoodRulesBatch',
    timestamp: new Date().toISOString(),
    rulesPublished: published.length,
    rulesFailed: errors.length,
    foodTypes: published.map((p) => p.foodType),
  };

  await dynamodb.put({ TableName: TABLE_NAME, Item: logEntry }).promise();

  return {
    rulesPublished: published.length,
    rulesFailed: errors.length,
    published,
    errors: errors.length > 0 ? errors : undefined,
  };
}

async function getRuleStats() {
  // Get all published food rules for stats
  const result = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'FOODRULES#CATALOG',
      },
    })
    .promise();

  const rules = result.Items || [];
  const byCategory = {};

  for (const rule of rules) {
    const category = rule.category || 'other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(rule.foodType);
  }

  return {
    totalRules: rules.length,
    byCategory,
    lastUpdated: rules.length > 0 ? rules[rules.length - 1].updatedAt : null,
  };
}

async function validateRules(rules) {
  // Validate rule consistency
  const issues = [];

  for (const rule of rules) {
    // Check for reasonable values
    if (rule.fridgeDaysSafe && rule.fridgeDaysSafe > 365) {
      issues.push(`${rule.foodType}: fridgeDaysSafe too high (${rule.fridgeDaysSafe})`);
    }
    if (rule.freezerDaysSafe && rule.freezerDaysSafe > 730) {
      issues.push(`${rule.foodType}: freezerDaysSafe too high (${rule.freezerDaysSafe})`);
    }
    if (rule.pantryDaysSafe && rule.pantryDaysSafe > 365) {
      issues.push(`${rule.foodType}: pantryDaysSafe too high (${rule.pantryDaysSafe})`);
    }
    if (rule.counterHoursSafe && rule.counterHoursSafe > 72) {
      issues.push(`${rule.foodType}: counterHoursSafe too high (${rule.counterHoursSafe})`);
    }

    // Fridge should generally be less than freezer
    if (
      rule.fridgeDaysSafe &&
      rule.freezerDaysSafe &&
      rule.fridgeDaysSafe > rule.freezerDaysSafe
    ) {
      issues.push(
        `${rule.foodType}: fridge lifespan should be less than freezer (fridge: ${rule.fridgeDaysSafe}, freezer: ${rule.freezerDaysSafe})`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

exports.handler = async (event) => {
  console.log('[food-rules] Handler invoked', JSON.stringify(event, null, 2));

  try {
    const { action, rules } = event.Payload || event;

    if (!action) {
      throw new Error('Missing required parameter: action');
    }

    let result;

    if (action === 'publish') {
      if (!rules || !Array.isArray(rules)) {
        throw new Error('Missing required parameter: rules (array)');
      }

      // Validate rules before publishing
      const validation = await validateRules(rules);
      if (!validation.valid) {
        console.warn('[food-rules] Validation warnings:', validation.issues);
        // Don't fail on validation warnings, just log them
      }

      result = await publishFoodRules(rules);
    } else if (action === 'stats') {
      result = await getRuleStats();
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    console.log('[food-rules] Handler completed successfully', result);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('[food-rules] Handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        type: 'FoodRulesPublishFailed',
      }),
    };
  }
};
