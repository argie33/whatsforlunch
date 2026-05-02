import { getItem, putItem, updateAttrs, queryAll, buildAttrs, nowIso, uuid } from './db.js';
import { signToken } from './auth.js';
import type { JwtPayload } from './auth.js';
import { generateRecipesWithAI, formatRecipesForGraphQL } from './recipes.js';
import { BedrockMockClient } from '@wfl/services-shared/bedrock-mock';
import { TextractMockClient } from '@wfl/services-shared/textract-mock';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string): Promise<{ token: string; userId: string }> {
  const userId = `local-${email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  const householdId = `hh-${userId}`;

  // Upsert profile
  const existing = await getItem(`USER#${userId}`, 'PROFILE');
  if (!existing) {
    await putItem(
      buildAttrs({
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        entityType: 'Profile',
        id: userId,
        email,
        displayName: email.split('@')[0],
        timeZone: 'America/New_York',
        units: 'imperial',
        locale: 'en-US',
        dietaryPreferences: [],
        cuisinePreferences: [],
        allergies: [],
        defaultHouseholdId: householdId,
        subscriptionTier: 'free',
        aiQuotaUsedToday: 0,
        aiQuotaResetAt: new Date(Date.now() + 86400_000).toISOString(),
      }),
    );

    // Upsert household
    await putItem(
      buildAttrs({
        PK: `HOUSEHOLD#${householdId}`,
        SK: 'META',
        entityType: 'Household',
        id: householdId,
        name: `${email.split('@')[0]}'s Kitchen`,
        ownerId: userId,
        memberCount: 1,
      }),
    );

    // Membership
    await putItem(
      buildAttrs({
        PK: `HOUSEHOLD#${householdId}`,
        SK: `MEMBER#${userId}`,
        entityType: 'HouseholdMember',
        userId,
        displayName: email.split('@')[0],
        role: 'owner',
        joinedAt: nowIso(),
        GSI1PK: `USER#${userId}`,
        GSI1SK: `HOUSEHOLD#${householdId}`,
      }),
    );
  }

  const token = signToken({ sub: userId, email, householdId });
  console.log(`[local-auth] signed in ${email} → ${userId}`);
  return { token, userId };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(user: JwtPayload): Promise<Record<string, unknown>> {
  const profile = await getItem(`USER#${user.sub}`, 'PROFILE');
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function updateProfile(
  user: JwtPayload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const updated = await updateAttrs(`USER#${user.sub}`, 'PROFILE', input);
  if (!updated) throw new Error('Profile not found');
  return updated;
}

// ─── Households ───────────────────────────────────────────────────────────────

export async function listHouseholds(user: JwtPayload): Promise<Record<string, unknown>[]> {
  const memberships = await queryAll(
    'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    { ':pk': `USER#${user.sub}`, ':sk': 'HOUSEHOLD#' },
    undefined,
    'GSI1',
  );
  const households = await Promise.all(
    memberships.map(async (m) => {
      // GSI1SK = "HOUSEHOLD#<id>"
      const householdId = (m['GSI1SK'] as string).replace('HOUSEHOLD#', '');
      const hh = await getItem(`HOUSEHOLD#${householdId}`, 'META');
      return hh ? { ...hh, members: [] } : null;
    }),
  );
  return households.filter(Boolean) as Record<string, unknown>[];
}

// ─── Items ────────────────────────────────────────────────────────────────────

function mapItem(r: Record<string, unknown>) {
  const expiryAt = r['expiryAt'] as string | undefined;
  const hoursUntilExpiry = expiryAt
    ? Math.ceil((new Date(expiryAt).getTime() - Date.now()) / 3_600_000)
    : null;
  let statusColor = 'fresh';
  if (r['status'] !== 'active') statusColor = 'neutral';
  else if (hoursUntilExpiry === null) statusColor = 'fresh';
  else if (hoursUntilExpiry < 0) statusColor = 'expired';
  else if (hoursUntilExpiry < 24) statusColor = 'urgent';
  else if (hoursUntilExpiry < 72) statusColor = 'soon';

  return {
    ...r,
    photoUrl: r['photoPath'] ?? null,
    hoursUntilExpiry,
    statusColor,
  };
}

export async function listItems(
  householdId: string,
  status?: string,
): Promise<Record<string, unknown>[]> {
  const rows = await queryAll('PK = :pk AND begins_with(SK, :sk)', {
    ':pk': `HOUSEHOLD#${householdId}`,
    ':sk': 'ITEM#',
  });
  const filtered = status ? rows.filter((r) => r['status'] === status) : rows;
  return filtered.filter((r) => !r['deletedAt']).map(mapItem);
}

export async function createItem(
  user: JwtPayload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = (input['clientId'] as string | undefined) ?? uuid();
  const householdId = input['householdId'] as string;

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: user.sub,
    containerId: input['containerId'] ?? null,
    foodType: input['foodType'],
    foodName: input['foodName'],
    category: input['category'] ?? 'prepared',
    storageLocation: input['storageLocation'],
    quantityText: input['quantityText'] ?? null,
    quantityValue: input['quantityValue'] ?? null,
    quantityUnit: input['quantityUnit'] ?? null,
    storedAt: input['storedAt'],
    storedTz: input['storedTz'],
    expiryAt: input['expiryAt'],
    expirySource: input['expirySource'],
    expiryConfidence: input['expiryConfidence'] ?? null,
    notes: input['notes'] ?? null,
    photoPath: input['photoPath'] ?? null,
    barcode: input['barcode'] ?? null,
    priceUsd: input['priceUsd'] ?? null,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    transferredToContainerId: null,
    deletedAt: null,
    GSI2PK: `EXPIRING#${householdId}`,
    GSI2SK: input['expiryAt'],
  });

  await putItem(item);
  return mapItem(item);
}

export async function updateItem(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const householdId = input['householdId'] as string;
  const id = input['id'] as string;
  const allowed = [
    'foodType',
    'foodName',
    'storageLocation',
    'expiryAt',
    'quantityText',
    'quantityValue',
    'quantityUnit',
    'notes',
    'photoPath',
  ];
  const fields: Record<string, unknown> = {};
  allowed.forEach((f) => {
    if (input[f] !== undefined) fields[f] = input[f];
  });
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, fields);
  if (!updated) throw new Error('Item not found');
  return mapItem(updated);
}

export async function deleteItem(householdId: string, id: string): Promise<boolean> {
  await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    deletedAt: nowIso(),
    status: 'deleted',
  });
  return true;
}

export async function markItemStatus(
  householdId: string,
  id: string,
  status: string,
  tsField: string,
): Promise<Record<string, unknown>> {
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status,
    [tsField]: nowIso(),
  });
  if (!updated) throw new Error('Item not found');
  return mapItem(updated);
}

// ─── Containers ──────────────────────────────────────────────────────────────

function mapContainer(r: Record<string, unknown>) {
  return {
    ...r,
    claimedBy: r['claimedBy'] ?? r['ownerId'] ?? 'unknown',
  };
}

export async function listContainers(householdId: string): Promise<Record<string, unknown>[]> {
  const rows = await queryAll('PK = :pk AND begins_with(SK, :sk)', {
    ':pk': `HOUSEHOLD#${householdId}`,
    ':sk': 'CONTAINER#',
  });
  return rows.filter((r) => !r['deletedAt']).map(mapContainer);
}

export async function claimContainer(
  user: JwtPayload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = uuid();
  const householdId = input['householdId'] as string;

  const container = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `CONTAINER#${id}`,
    entityType: 'Container',
    id,
    householdId,
    qrToken: input['qrToken'],
    nickname: input['nickname'] ?? null,
    imageUrl: null,
    claimedAt: nowIso(),
    claimedBy: user.sub,
    archivedAt: null,
    deletedAt: null,
  });

  await putItem(container);
  return mapContainer(container);
}

export async function createContainer(
  user: JwtPayload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = uuid();
  const householdId = input['householdId'] as string;

  const container = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `CONTAINER#${id}`,
    entityType: 'Container',
    id,
    householdId,
    qrToken: uuid().replace(/-/g, '').slice(0, 8).toUpperCase(),
    nickname: input['nickname'] ?? null,
    imageUrl: input['imageUrl'] ?? null,
    claimedAt: nowIso(),
    claimedBy: user.sub,
    archivedAt: null,
    deletedAt: null,
  });

  await putItem(container);
  return mapContainer(container);
}

export async function updateContainer(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const householdId = input['householdId'] as string;
  const id = input['containerId'] as string;
  const fields: Record<string, unknown> = {};
  if (input['nickname'] !== undefined) fields['nickname'] = input['nickname'];
  if (input['imageUrl'] !== undefined) fields['imageUrl'] = input['imageUrl'];
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `CONTAINER#${id}`, fields);
  if (!updated) throw new Error('Container not found');
  return mapContainer(updated);
}

export async function archiveContainer(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const householdId = input['householdId'] as string;
  const id = input['containerId'] as string;
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `CONTAINER#${id}`, {
    archivedAt: nowIso(),
  });
  if (!updated) throw new Error('Container not found');
  return mapContainer(updated);
}

// ─── Delta sync ───────────────────────────────────────────────────────────────

export async function deltaSync(
  householdId: string,
  lastSyncTimestamp?: string | null,
): Promise<Record<string, unknown>> {
  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;
  const serverTimestamp = nowIso();

  const [items, containers] = await Promise.all([
    queryAll('PK = :pk AND begins_with(SK, :sk)', {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'ITEM#',
    }).then((rows) => rows.filter((r) => Number(r['_lastChangedAt']) > since).map(mapItem)),
    queryAll('PK = :pk AND begins_with(SK, :sk)', {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'CONTAINER#',
    }).then((rows) => rows.filter((r) => Number(r['_lastChangedAt']) > since)),
  ]);

  return { items, containers, shoppingList: [], serverTimestamp };
}

// ─── Food Rules ───────────────────────────────────────────────────────────────

const BUILT_IN_FOOD_RULES = [
  {
    foodType: 'leftover_pasta',
    displayName: 'Leftover Pasta',
    category: 'leftover',
    aliases: ['pasta', 'noodles'],
    fridgeDaysSafe: 5,
    freezerDaysSafe: 60,
    iconKey: 'pasta',
    version: 3,
  },
  {
    foodType: 'leftover_rice',
    displayName: 'Leftover Rice',
    category: 'leftover',
    aliases: ['rice', 'fried rice'],
    fridgeDaysSafe: 4,
    freezerDaysSafe: 60,
    iconKey: 'rice',
    version: 3,
  },
  {
    foodType: 'cooked_chicken',
    displayName: 'Cooked Chicken',
    category: 'protein',
    aliases: ['chicken', 'rotisserie chicken'],
    fridgeDaysSafe: 4,
    freezerDaysSafe: 120,
    iconKey: 'chicken',
    version: 3,
  },
  {
    foodType: 'raw_chicken',
    displayName: 'Raw Chicken',
    category: 'protein',
    aliases: ['raw chicken'],
    fridgeDaysSafe: 2,
    freezerDaysSafe: 270,
    iconKey: 'chicken_raw',
    version: 3,
  },
  {
    foodType: 'cooked_beef',
    displayName: 'Cooked Beef',
    category: 'protein',
    aliases: ['beef', 'steak', 'hamburger'],
    fridgeDaysSafe: 4,
    freezerDaysSafe: 90,
    iconKey: 'beef',
    version: 3,
  },
  {
    foodType: 'cooked_fish',
    displayName: 'Cooked Fish',
    category: 'protein',
    aliases: ['fish', 'salmon', 'tuna'],
    fridgeDaysSafe: 3,
    freezerDaysSafe: 90,
    iconKey: 'fish',
    version: 3,
  },
  {
    foodType: 'deli_meat',
    displayName: 'Deli Meat',
    category: 'protein',
    aliases: ['deli meat', 'lunch meat', 'cold cuts'],
    fridgeDaysSafe: 5,
    freezerDaysSafe: 60,
    iconKey: 'deli',
    version: 3,
  },
  {
    foodType: 'eggs_hard_boiled',
    displayName: 'Hard Boiled Eggs',
    category: 'protein',
    aliases: ['hard boiled eggs', 'deviled eggs'],
    fridgeDaysSafe: 7,
    iconKey: 'egg',
    version: 3,
  },
  {
    foodType: 'milk',
    displayName: 'Milk',
    category: 'dairy',
    aliases: ['milk', 'oat milk', 'almond milk'],
    fridgeDaysSafe: 7,
    iconKey: 'milk',
    version: 3,
  },
  {
    foodType: 'yogurt',
    displayName: 'Yogurt',
    category: 'dairy',
    aliases: ['yogurt', 'greek yogurt'],
    fridgeDaysSafe: 14,
    freezerDaysSafe: 60,
    iconKey: 'yogurt',
    version: 3,
  },
  {
    foodType: 'cheese_hard',
    displayName: 'Hard Cheese',
    category: 'dairy',
    aliases: ['cheddar', 'parmesan', 'gouda'],
    fridgeDaysSafe: 21,
    freezerDaysSafe: 180,
    iconKey: 'cheese',
    version: 3,
  },
  {
    foodType: 'cheese_soft',
    displayName: 'Soft Cheese',
    category: 'dairy',
    aliases: ['brie', 'mozzarella', 'ricotta', 'feta'],
    fridgeDaysSafe: 7,
    iconKey: 'cheese_soft',
    version: 3,
  },
  {
    foodType: 'leafy_greens',
    displayName: 'Leafy Greens',
    category: 'produce',
    aliases: ['spinach', 'lettuce', 'kale', 'arugula'],
    fridgeDaysSafe: 5,
    iconKey: 'greens',
    version: 3,
  },
  {
    foodType: 'broccoli',
    displayName: 'Broccoli',
    category: 'produce',
    aliases: ['broccoli', 'broccolini'],
    fridgeDaysSafe: 7,
    freezerDaysSafe: 270,
    iconKey: 'broccoli',
    version: 3,
  },
  {
    foodType: 'carrots',
    displayName: 'Carrots',
    category: 'produce',
    aliases: ['carrots', 'baby carrots'],
    fridgeDaysSafe: 21,
    freezerDaysSafe: 270,
    iconKey: 'carrot',
    version: 3,
  },
  {
    foodType: 'tomato',
    displayName: 'Tomato',
    category: 'produce',
    aliases: ['tomato', 'cherry tomatoes'],
    fridgeDaysSafe: 5,
    counterHoursSafe: 72,
    iconKey: 'tomato',
    version: 3,
  },
  {
    foodType: 'avocado',
    displayName: 'Avocado',
    category: 'produce',
    aliases: ['avocado', 'guacamole'],
    fridgeDaysSafe: 3,
    counterHoursSafe: 48,
    iconKey: 'avocado',
    version: 3,
  },
  {
    foodType: 'berries',
    displayName: 'Berries',
    category: 'produce',
    aliases: ['strawberries', 'blueberries', 'raspberries'],
    fridgeDaysSafe: 5,
    freezerDaysSafe: 365,
    iconKey: 'berry',
    version: 3,
  },
  {
    foodType: 'bread',
    displayName: 'Bread',
    category: 'grain',
    aliases: ['bread', 'sourdough', 'baguette'],
    pantryDaysSafe: 5,
    freezerDaysSafe: 90,
    iconKey: 'bread',
    version: 3,
  },
  {
    foodType: 'prepared_meal',
    displayName: 'Prepared Meal',
    category: 'prepared',
    aliases: ['meal prep', 'takeout', 'leftovers'],
    fridgeDaysSafe: 4,
    freezerDaysSafe: 90,
    iconKey: 'meal',
    version: 3,
  },
];

export async function foodRules(): Promise<Record<string, unknown>[]> {
  // Try DynamoDB first (populated by food-rules-publish Lambda in prod)
  const rows = await queryAll('PK = :pk AND begins_with(SK, :sk)', {
    ':pk': 'FOOD_RULES',
    ':sk': 'RULE#',
  });
  if (rows.length > 0) return rows;
  // Fall back to built-in rules for local dev
  return BUILT_IN_FOOD_RULES as Record<string, unknown>[];
}

// ─── OCR Expiry Date ────────────────────────────────────────────────────────

const textractMock = new TextractMockClient();

export async function ocrExpiryDate(householdId: string, photoUrl?: string): Promise<string> {
  if (!photoUrl) {
    return JSON.stringify({
      detectedDates: [],
      bestGuess: null,
      confidence: 0,
      error: 'No photo URL provided',
    });
  }

  // Use realistic mock Textract response
  const response = await textractMock.detectDocumentText({
    bytes: new Uint8Array([0xff, 0xd8, 0xff]),
  });

  // Extract date from Textract mock response - look for first block with date-like text
  const dateBlock = response.blocks.find((b) => /\d+\/\d+|CONSUME|USE BY|BEST/i.test(b.text)) as
    | { text: string; confidence: number; boundingBox?: Record<string, unknown> }
    | undefined;
  if (!dateBlock) {
    return JSON.stringify({
      detectedDates: [],
      bestGuess: null,
      confidence: 0,
      error: 'No expiry date found in image',
    });
  }

  // Parse date from detected text (simple parser for common formats)
  const dateMatch = dateBlock.text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})|(\d{4})-(\d{2})-(\d{2})/);
  let parsedDate = null;

  if (dateMatch) {
    if (dateMatch[3]) {
      // MM/DD/YY or MM/DD/YYYY format
      const month = dateMatch[1];
      const day = dateMatch[2];
      const year = dateMatch[3]!.length === 2 ? '20' + dateMatch[3] : dateMatch[3];
      parsedDate = `${year}-${month?.padStart(2, '0')}-${day?.padStart(2, '0')}`;
    } else if (dateMatch[4]) {
      // YYYY-MM-DD format
      parsedDate = `${dateMatch[4]}-${dateMatch[5]}-${dateMatch[6]}`;
    }
  }

  // Fallback: estimate from current date if no exact date parsed
  if (!parsedDate) {
    const daysAhead = Math.floor(Math.random() * 40) + 5;
    parsedDate = new Date(Date.now() + daysAhead * 86400_000).toISOString().split('T')[0];
  }

  const bestGuess = `${parsedDate}T00:00:00Z`;

  const result = {
    detectedDates: [
      {
        rawText: dateBlock.text,
        parsedAt: bestGuess,
        confidence: dateBlock.confidence,
        boundingBox: dateBlock.boundingBox ?? { x: 0.1, y: 0.2, width: 0.4, height: 0.05 },
      },
    ],
    bestGuess,
    confidence: dateBlock.confidence,
  };
  return JSON.stringify(result);
}

// ─── AI Classification ────────────────────────────────────────────────────────

const bedrockMock = new BedrockMockClient();

export async function classifyFood(
  user: JwtPayload,
  householdId: string,
  photoUrl?: string,
): Promise<Record<string, unknown>> {
  const id = uuid();

  // Use realistic mock Bedrock response
  const response = await bedrockMock.invoke({
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: `Classify this food: ${photoUrl || 'food'}` }],
      },
    ],
    tools: [
      {
        name: 'classify_food',
        description: 'Classify food',
        input_schema: { type: 'object', properties: {} },
      },
    ],
  });

  // Extract tool_use response from Bedrock mock
  const toolUse = response.content.find(
    (c: { type: string; id?: string; name?: string; input?: Record<string, unknown> }) =>
      c.type === 'tool_use',
  );
  if (!toolUse || toolUse.type !== 'tool_use' || !toolUse.input) {
    throw new Error('Invalid Bedrock response for food classification');
  }

  const input = toolUse.input as Record<string, unknown>;
  const expiryDays = (input['days_safe'] as number) || 5;
  const expiryAt = new Date(Date.now() + expiryDays * 86400_000).toISOString();

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: user.sub,
    containerId: null,
    foodType: (input['food_type'] as string) || 'unknown',
    foodName: (input['food_name'] as string) || 'Unknown Food',
    category: 'prepared',
    storageLocation: 'fridge',
    storedAt: nowIso(),
    storedTz: 'America/New_York',
    expiryAt,
    expirySource: 'ai',
    expiryConfidence: (input['confidence'] as number) || 0.85,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    deletedAt: null,
    photoUrl: photoUrl || null,
  });

  await putItem(item);
  return mapItem(item);
}

// ─── Recipe Suggestions ──────────────────────────────────────────────────────
// Real AI-powered recipe generation using Claude. See recipes.ts for implementation.

export async function suggestRecipes(
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const itemNames = (input['itemNames'] as string[]) || [];
  const itemIds = (input['itemIds'] as string[]) || [];

  // Generate real recipes using Claude AI based on actual inventory
  const aiRecipes = await generateRecipesWithAI({ itemNames });
  const recipes = formatRecipesForGraphQL(aiRecipes, itemIds);

  return {
    recipes,
    model: 'claude-3-5-sonnet-20241022',
    promptVersion: 1,
    costUsd: 0.0,
  };
}

export async function getRecipeRecommendations(
  householdId: string,
): Promise<Record<string, unknown>[]> {
  // Fetch user's actual inventory items
  const items = await queryAll('PK = :pk AND begins_with(SK, :sk)', {
    ':pk': `HOUSEHOLD#${householdId}`,
    ':sk': 'ITEM#',
  });

  const activeItems = items
    .filter((i) => i['status'] === 'active' && !i['deletedAt'])
    .map((i) => i['foodName'] as string)
    .slice(0, 15); // Max 15 items for prompt context

  const itemIds = items
    .filter((i) => i['status'] === 'active' && !i['deletedAt'])
    .map((i) => i['id'] as string)
    .slice(0, 3);

  // Generate real recipes based on what's actually in the fridge
  const aiRecipes = await generateRecipesWithAI({
    itemNames: activeItems.length > 0 ? activeItems : ['vegetables', 'proteins', 'grains'],
  });

  return formatRecipesForGraphQL(aiRecipes, itemIds);
}
