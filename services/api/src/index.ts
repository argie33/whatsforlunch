import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { getUserIdFromRequest, devToken } from './auth';
import { resolvers } from './resolvers';

const PORT = process.env.PORT || 4000;

// Load the canonical schema from infra (single source of truth)
const schemaPath = join(__dirname, '../../../infra/cdk/lib/appsync/schema.graphql');
let typeDefs: string;
try {
  typeDefs = readFileSync(schemaPath, 'utf-8');
} catch {
  // Fallback minimal schema for when infra isn't co-located
  typeDefs = `
    scalar AWSDateTime UUID AWSJSON AWSURL AWSEmail
    type Query { deltaSync(input: DeltaSyncInput!): DeltaSyncResult! listItems(householdId: UUID!, status: String): [Item!]! listContainers(householdId: UUID!): [Container!]! me: Profile! myHouseholds: [Household!]! foodRules(version: Int): [FoodRule!]! }
    type Mutation { createItem(input: CreateItemInput!): Item! updateItem(input: UpdateItemInput!): Item! deleteItem(id: UUID!, householdId: UUID!): Boolean! markItemEaten(id: UUID!, householdId: UUID!): Item! markItemTossed(id: UUID!, householdId: UUID!): Item! markItemFrozen(id: UUID!, householdId: UUID!): Item! markItemPartial(id: UUID!, householdId: UUID!, input: MarkPartialInput!): Item! }
    type Subscription { onItemUpdate(householdId: UUID!): Item onHouseholdUpdate(householdId: UUID!): Household onMemberJoined(householdId: UUID!): HouseholdMember }
    input DeltaSyncInput { householdId: UUID! lastSyncTimestamp: AWSDateTime }
    type DeltaSyncResult { containers: [Container!]! items: [Item!]! shoppingList: [ShoppingListItem!]! serverTimestamp: AWSDateTime! }
    input CreateItemInput { householdId: UUID! containerId: UUID foodType: String! foodName: String! category: String storageLocation: String! quantityText: String quantityValue: Float quantityUnit: String storedAt: AWSDateTime! storedTz: String! expiryAt: AWSDateTime! expirySource: String! expiryConfidence: Float notes: String photoPath: String barcode: String priceUsd: Float clientId: UUID }
    input UpdateItemInput { id: UUID! householdId: UUID! foodType: String foodName: String storageLocation: String expiryAt: AWSDateTime quantityText: String quantityValue: Float quantityUnit: String notes: String photoPath: String }
    input MarkPartialInput { quantityText: String! quantityValue: Float quantityUnit: String }
    type Item { id: UUID! householdId: UUID! containerId: UUID addedByUserId: UUID! foodType: String! foodName: String! category: String! storageLocation: String! quantityText: String quantityValue: Float quantityUnit: String storedAt: AWSDateTime! storedTz: String! expiryAt: AWSDateTime! expirySource: String! expiryConfidence: Float notes: String photoUrl: AWSURL barcode: String priceUsd: Float status: String! eatenAt: AWSDateTime tossedAt: AWSDateTime frozenAt: AWSDateTime transferredToContainerId: UUID deletedAt: AWSDateTime createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int! _lastChangedAt: AWSDateTime! hoursUntilExpiry: Int! statusColor: String! }
    type Container { id: UUID! householdId: UUID! qrToken: String! nickname: String imageUrl: AWSURL claimedAt: AWSDateTime! claimedBy: UUID! archivedAt: AWSDateTime createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int! _lastChangedAt: AWSDateTime! }
    type ShoppingListItem { id: UUID! householdId: UUID! name: String! quantity: String category: String notes: String addedByUserId: UUID! purchasedAt: AWSDateTime purchasedByUserId: UUID autoSuggested: Boolean! createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int _lastChangedAt: AWSDateTime }
    type Profile { id: UUID! email: AWSEmail! displayName: String photoUrl: AWSURL timeZone: String! units: String! locale: String! dietaryPreferences: [String!]! cuisinePreferences: [String!]! allergies: [String!]! defaultHouseholdId: UUID subscriptionTier: String! subscriptionExpiresAt: AWSDateTime aiQuotaUsedToday: Int! aiQuotaResetAt: AWSDateTime! createdAt: AWSDateTime! updatedAt: AWSDateTime! }
    type Household { id: UUID! name: String! ownerId: UUID! memberCount: Int! members: [HouseholdMember!]! createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int! _lastChangedAt: AWSDateTime! }
    type HouseholdMember { userId: UUID! displayName: String role: String! joinedAt: AWSDateTime! }
    type FoodRule { foodType: String! displayName: String! category: String! aliases: [String!]! fridgeDaysSafe: Int! freezerDaysSafe: Int pantryDaysSafe: Int counterHoursSafe: Int iconKey: String version: Int! }
  `;
}

const schema = makeExecutableSchema({ typeDefs, resolvers });

const yoga = createYoga({
  schema,
  context: (ctx) => {
    // Extract userId from JWT; for the /dev-token endpoint this is bypassed
    try {
      const userId = getUserIdFromRequest(ctx.request as unknown as import('express').Request);
      return { userId };
    } catch {
      return { userId: null };
    }
  },
  graphqlEndpoint: '/graphql',
  logging: true,
});

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Dev convenience: GET /dev-token returns a signed JWT for local testing
app.get('/dev-token', (_req, res) => {
  const token = devToken();
  res.json({ token, note: 'Use as: Authorization: Bearer <token>' });
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/graphql', yoga);

const server = createServer(app);

server.listen(PORT, () => {
  console.log(`\n🚀 Local WFL API running at http://localhost:${PORT}`);
  console.log(`   GraphQL:   http://localhost:${PORT}/graphql`);
  console.log(`   Dev token: http://localhost:${PORT}/dev-token`);
  console.log(`   DynamoDB:  ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'}\n`);
});
