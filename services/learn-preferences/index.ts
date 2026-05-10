/**
 * W4 Lambda: learn-preferences
 * Triggered by DynamoDB Streams when Items are marked eaten/tossed
 * Updates LearnedPreferences entity with food + cuisine counters
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBStreamEvent, Context } from 'aws-lambda';

const region = process.env.AWS_REGION || 'us-east-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';

const client = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(client);

interface FoodPreference {
  foodType: string;
  foodName: string;
  count: number;
  score: number;
}

interface CuisineScore {
  cuisine: string;
  score: number;
}

interface LearnedPreferences {
  userId: string;
  topEaten: FoodPreference[];
  topTossed: FoodPreference[];
  cuisineAffinity: CuisineScore[];
  lastUpdatedAt: string;
}

// Map food types to cuisine categories
const FOOD_CATEGORY_TO_CUISINE: Record<string, string[]> = {
  protein: ['protein-focused'],
  grain: ['carb-based', 'bread'],
  dairy: ['dairy-based'],
  produce: ['vegetable-focused', 'fruit-based'],
  leftover: ['comfort-food'],
  sauce: ['sauce-based'],
  baked: ['baked-goods', 'desserts'],
  prepared: ['prepared-foods', 'convenient'],
  beverage: ['beverages'],
};

export const handler = async (event: DynamoDBStreamEvent, _context: Context) => {
  console.log(`Processing ${event.Records.length} stream records`);

  const processed = new Map<string, boolean>();

  for (const record of event.Records) {
    if (record.eventName !== 'MODIFY') {
      continue; // Only care about updates
    }

    const newImage = record.dynamodb?.NewImage;
    if (!newImage) continue;

    const sk = newImage.SK?.S || '';
    if (!sk.startsWith('ITEM#')) continue; // Only process items

    // Extract user and action
    const status = newImage.status?.S;
    const userId = newImage.addedByUserId?.S;
    const foodName = newImage.foodName?.S || 'Unknown';
    const foodType = newImage.foodType?.S || 'prepared';
    const category = newImage.category?.S || 'prepared';

    if (!userId || !status) continue;

    const key = `${userId}#${status}`;
    if (processed.has(key)) continue; // Skip duplicate updates
    processed.set(key, true);

    try {
      if (status === 'eaten') {
        await updatePreference(userId, 'topEaten', foodType, foodName, category);
      } else if (status === 'tossed') {
        await updatePreference(userId, 'topTossed', foodType, foodName, category);
      }
    } catch (error) {
      console.error(`Failed to update preferences for ${userId}:`, error);
      // Continue processing other records on error
    }
  }

  return { statusCode: 200, processedCount: processed.size };
};

async function updatePreference(
  userId: string,
  listName: 'topEaten' | 'topTossed',
  foodType: string,
  foodName: string,
  category: string,
) {
  // Fetch current preferences
  const prefs = await getOrCreatePreferences(userId);

  // Find food in the list
  const list = prefs[listName] || [];
  const existingIndex = list.findIndex((p: FoodPreference) => p.foodType === foodType);

  let foodPreference: FoodPreference;
  if (existingIndex >= 0) {
    foodPreference = list[existingIndex]!;
    foodPreference.count += 1;
    foodPreference.score = Math.min(1.0, 0.5 + foodPreference.count / 20); // Cap at 1.0
    list[existingIndex] = foodPreference;
  } else {
    foodPreference = {
      foodType,
      foodName,
      count: 1,
      score: 0.55, // Starting score
    };
    list.push(foodPreference);
  }

  // Sort by count descending and keep top 10
  list.sort((a: FoodPreference, b: FoodPreference) => b.count - a.count);
  const topList = list.slice(0, 10);

  // Update cuisine affinity
  const cuisineAffinity = updateCuisineAffinity(prefs.cuisineAffinity || [], category);

  // Update DynamoDB
  await updatePreferencesInDB(userId, listName, topList, cuisineAffinity);
}

async function getOrCreatePreferences(userId: string): Promise<LearnedPreferences> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'LEARNED_PREFERENCES',
        },
      }),
    );

    if (result.Item) {
      return {
        userId,
        topEaten: (result.Item as any).topEaten || [],
        topTossed: (result.Item as any).topTossed || [],
        cuisineAffinity: (result.Item as any).cuisineAffinity || [],
        lastUpdatedAt: (result.Item as any).lastUpdatedAt || new Date().toISOString(),
      };
    }
  } catch (error) {
    console.log(`Creating new preferences for ${userId}`);
  }

  return {
    userId,
    topEaten: [],
    topTossed: [],
    cuisineAffinity: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

function updateCuisineAffinity(current: CuisineScore[], category: string): CuisineScore[] {
  const cuisines = FOOD_CATEGORY_TO_CUISINE[category] || [];

  for (const cuisine of cuisines) {
    const idx = current.findIndex((c) => c.cuisine === cuisine);
    if (idx >= 0) {
      current[idx]!.score = Math.min(1.0, current[idx]!.score + 0.05);
    } else {
      current.push({ cuisine, score: 0.3 });
    }
  }

  // Normalize all scores to sum <= 10 for ranking weight
  const total = current.reduce((sum, c) => sum + c.score, 0);
  if (total > 10) {
    const factor = 10 / total;
    current.forEach((c) => {
      c.score = c.score * factor;
    });
  }

  return current.slice(0, 8); // Keep top 8 cuisines
}

async function updatePreferencesInDB(
  userId: string,
  listName: 'topEaten' | 'topTossed',
  foodList: FoodPreference[],
  cuisineAffinity: CuisineScore[],
) {
  const updateExpr =
    `SET #${listName} = :${listName}, cuisineAffinity = :cuisineAffinity, ` +
    `lastUpdatedAt = :lastUpdatedAt, #version = #version + :inc`;

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: 'LEARNED_PREFERENCES',
      },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: {
        [`#${listName}`]: listName,
        '#version': '_version',
      },
      ExpressionAttributeValues: {
        [`:${listName}`]: foodList,
        ':cuisineAffinity': cuisineAffinity,
        ':lastUpdatedAt': new Date().toISOString(),
        ':inc': 1,
      },
    }),
  );
}
