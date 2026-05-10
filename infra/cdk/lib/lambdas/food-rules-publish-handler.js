/**
 * Food Rules Publish Handler
 * Admin Lambda to update food spoilage rules
 * Called when food database is updated (manual admin operation)
 *
 * Updates:
 * - Fridges days safe
 * - Freezer days safe
 * - Pantry days safe
 * - Counter hours safe
 */

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';

exports.handler = async (event) => {
  const { foodRules, timestamp } = event;

  console.log(`[food-rules-publish] Publishing ${foodRules.length} food rules`);

  try {
    // Batch write food rules
    const chunks = chunkArray(foodRules, 25); // DynamoDB batch limit

    for (const chunk of chunks) {
      const request = {
        RequestItems: {
          [TABLE_NAME]: chunk.map((rule) => ({
            PutRequest: {
              Item: {
                PK: 'FOODRULES#SYSTEM',
                SK: rule.foodType,
                ...rule,
                updatedAt: timestamp,
                _version: 1,
                _lastChangedAt: Date.now(),
              },
            },
          })),
        },
      };

      await ddb.batchWrite(request).promise();
    }

    console.log(`[food-rules-publish] Successfully published ${foodRules.length} rules`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Food rules published',
        count: foodRules.length,
      }),
    };
  } catch (error) {
    console.error('[food-rules-publish] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to publish food rules',
        message: error.message,
      }),
    };
  }
};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
