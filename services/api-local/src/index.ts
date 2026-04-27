import { createServer } from 'node:http';
import { createYoga, createSchema } from 'graphql-yoga';
import { extractUser } from './auth.js';
import * as R from './resolvers.js';

// ─── Schema ───────────────────────────────────────────────────────────────────
// Mirrors infra/cdk/lib/appsync/schema.graphql but with AWS scalars replaced
// and @auth directives removed. Keep in sync manually.

const typeDefs = /* GraphQL */ `
  scalar DateTime

  enum StorageLocation { fridge freezer pantry counter lunchbox }
  enum ItemStatus { active partial eaten tossed frozen transferred deleted }
  enum ExpirySource { rule ai ocr barcode user }
  enum HouseholdRole { owner member viewer }
  enum SubscriptionTier { free premium family }
  enum FoodCategory { protein grain dairy produce leftover sauce baked prepared beverage }

  type SignInResult { token: String! userId: String! }

  type Profile {
    id: ID! email: String! displayName: String timeZone: String! units: String!
    locale: String! dietaryPreferences: [String!]! cuisinePreferences: [String!]!
    allergies: [String!]! defaultHouseholdId: ID subscriptionTier: SubscriptionTier!
    aiQuotaUsedToday: Int! aiQuotaResetAt: DateTime! createdAt: DateTime! updatedAt: DateTime!
    _version: Int!
  }

  type HouseholdMember { userId: ID! displayName: String role: HouseholdRole! joinedAt: DateTime! }

  type Household {
    id: ID! name: String! ownerId: ID! memberCount: Int!
    members: [HouseholdMember!]! createdAt: DateTime! updatedAt: DateTime! _version: Int!
  }

  type Item {
    id: ID! householdId: ID! containerId: ID addedByUserId: ID!
    foodType: String! foodName: String! category: String! storageLocation: StorageLocation!
    quantityText: String quantityValue: Float quantityUnit: String
    storedAt: DateTime! storedTz: String! expiryAt: DateTime! expirySource: ExpirySource!
    expiryConfidence: Float notes: String photoUrl: String barcode: String priceUsd: Float
    status: ItemStatus! eatenAt: DateTime tossedAt: DateTime frozenAt: DateTime
    transferredToContainerId: ID deletedAt: DateTime
    createdAt: DateTime! updatedAt: DateTime! _version: Int! _lastChangedAt: DateTime!
    hoursUntilExpiry: Int! statusColor: String!
  }

  type DeltaSyncResult {
    items: [Item!]! containers: [Container!]! shoppingList: [ShoppingListItem!]!
    serverTimestamp: DateTime!
  }

  type Container {
    id: ID! householdId: ID! qrToken: String! nickname: String imageUrl: String
    claimedAt: DateTime! claimedBy: ID! archivedAt: DateTime
    createdAt: DateTime! updatedAt: DateTime! _version: Int! _lastChangedAt: DateTime!
  }

  type ShoppingListItem {
    id: ID! householdId: ID! name: String! quantity: String category: String
    notes: String addedByUserId: ID! purchasedAt: DateTime purchasedByUserId: ID
    autoSuggested: Boolean! createdAt: DateTime! updatedAt: DateTime!
    _version: Int! _lastChangedAt: DateTime!
  }

  type FoodRule {
    foodType: String! displayName: String! category: String! aliases: [String!]!
    fridgeDaysSafe: Int! freezerDaysSafe: Int pantryDaysSafe: Int
    counterHoursSafe: Int iconKey: String version: Int!
  }

  input CreateItemInput {
    householdId: ID! containerId: ID foodType: String! foodName: String!
    category: String storageLocation: StorageLocation! quantityText: String
    quantityValue: Float quantityUnit: String storedAt: DateTime! storedTz: String!
    expiryAt: DateTime! expirySource: ExpirySource! expiryConfidence: Float
    notes: String photoPath: String barcode: String priceUsd: Float clientId: ID
  }

  input UpdateItemInput {
    id: ID! householdId: ID! foodType: String foodName: String
    storageLocation: StorageLocation expiryAt: DateTime quantityText: String
    quantityValue: Float quantityUnit: String notes: String photoPath: String
  }

  input MarkPartialInput { quantityText: String! quantityValue: Float quantityUnit: String }

  input UpdateProfileInput {
    displayName: String timeZone: String units: String locale: String
    dietaryPreferences: [String!] cuisinePreferences: [String!] allergies: [String!]
    defaultHouseholdId: ID
  }

  input DeltaSyncInput { householdId: ID! lastSyncTimestamp: DateTime }

  type Query {
    me: Profile!
    myHouseholds: [Household!]!
    listItems(householdId: ID!, status: String): [Item!]!
    listContainers(householdId: ID!): [Container!]!
    deltaSync(input: DeltaSyncInput!): DeltaSyncResult!
    foodRules(version: Int): [FoodRule!]!
  }

  type Mutation {
    signIn(email: String!): SignInResult!
    updateProfile(input: UpdateProfileInput!): Profile!
    createItem(input: CreateItemInput!): Item!
    updateItem(input: UpdateItemInput!): Item!
    deleteItem(id: ID!, householdId: ID!): Boolean!
    markItemEaten(id: ID!, householdId: ID!): Item!
    markItemTossed(id: ID!, householdId: ID!): Item!
    markItemFrozen(id: ID!, householdId: ID!): Item!
    markItemPartial(id: ID!, householdId: ID!, input: MarkPartialInput!): Item!
    classifyFood(householdId: ID!, photoUrl: String): Item!
  }
`;

// ─── Resolvers ────────────────────────────────────────────────────────────────

type Ctx = { user: ReturnType<typeof extractUser> };

const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, ctx: Ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.getProfile(ctx.user);
    },
    myHouseholds: (_: unknown, __: unknown, ctx: Ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.listHouseholds(ctx.user);
    },
    listItems: (_: unknown, { householdId, status }: { householdId: string; status?: string }) =>
      R.listItems(householdId, status),
    listContainers: () => [],
    deltaSync: (_: unknown, { input }: { input: { householdId: string; lastSyncTimestamp?: string } }) =>
      R.deltaSync(input.householdId, input.lastSyncTimestamp),
    foodRules: () => [],
  },
  Mutation: {
    signIn: (_: unknown, { email }: { email: string }) => R.signIn(email),
    updateProfile: (_: unknown, { input }: { input: Record<string, unknown> }, ctx: Ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.updateProfile(ctx.user, input);
    },
    createItem: (_: unknown, { input }: { input: Record<string, unknown> }, ctx: Ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.createItem(ctx.user, input);
    },
    updateItem: (_: unknown, { input }: { input: Record<string, unknown> }) => R.updateItem(input),
    deleteItem: (_: unknown, { id, householdId }: { id: string; householdId: string }) =>
      R.deleteItem(householdId, id),
    markItemEaten: (_: unknown, { id, householdId }: { id: string; householdId: string }) =>
      R.markItemStatus(householdId, id, 'eaten', 'eatenAt'),
    markItemTossed: (_: unknown, { id, householdId }: { id: string; householdId: string }) =>
      R.markItemStatus(householdId, id, 'tossed', 'tossedAt'),
    markItemFrozen: (_: unknown, { id, householdId }: { id: string; householdId: string }) =>
      R.markItemStatus(householdId, id, 'frozen', 'frozenAt'),
    markItemPartial: (_: unknown, { id, householdId, input }: { id: string; householdId: string; input: Record<string, unknown> }, ctx: Ctx) => {
      void ctx;
      return R.updateItem({ id, householdId, status: 'partial', ...input });
    },
    classifyFood: (_: unknown, { householdId }: { householdId: string }, ctx: Ctx) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.classifyFood(ctx.user, householdId);
    },
  },
};

// ─── Server ───────────────────────────────────────────────────────────────────

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  context: ({ request }) => ({
    user: extractUser(request.headers.get('authorization')),
  }),
  graphiql: {
    title: 'WFL Local API',
    defaultHeaders: JSON.stringify({ Authorization: 'Bearer <paste-token-here>' }),
  },
  cors: { origin: '*', methods: ['GET', 'POST', 'OPTIONS'] },
  logging: true,
});

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
    return;
  }
  yoga.handle(req as Parameters<typeof yoga.handle>[0], res);
});

const PORT = Number(process.env['PORT'] ?? 4000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 WFL Local API running at http://localhost:${PORT}`);
  console.log(`   GraphiQL:  http://localhost:${PORT}/graphql`);
  console.log(`   Health:    http://localhost:${PORT}/health`);
  console.log(`\n   Mobile .env.local:`);
  console.log(`     iOS sim:  EXPO_PUBLIC_APPSYNC_URL=http://localhost:${PORT}/graphql`);
  console.log(`     Android:  EXPO_PUBLIC_APPSYNC_URL=http://10.0.2.2:${PORT}/graphql\n`);
});
