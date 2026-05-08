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

// For local dev, use comprehensive schema with all resolvers
let typeDefs: string = `
scalar AWSDateTime
scalar UUID
scalar AWSJSON
scalar AWSURL
scalar AWSEmail

type Query {
  me: Profile!
  myHouseholds: [Household!]!
  listHouseholds: [Household!]!
  listHouseholdMembers(householdId: UUID!): [HouseholdMember!]!
  listItems(householdId: UUID!, status: String): [Item!]!
  listContainers(householdId: UUID!): [Container!]!
  listShoppingItems(householdId: UUID!): [ShoppingListItem!]!
  getShoppingListStats(householdId: UUID!): ShoppingListStats!
  getRecipeRecommendations(householdId: UUID!): [Recipe!]!
  getNearbyRestaurants(latitude: Float!, longitude: Float!): [Restaurant!]!
  getProfile(userId: UUID!): Profile!
  getHousehold(householdId: UUID!): Household!
  foodRules(version: Int): [FoodRule!]!
  deltaSync(input: DeltaSyncInput!): DeltaSyncResult!
}

type Mutation {
  signIn(email: String!): SignInResult!
  createItem(input: CreateItemInput!): Item!
  updateItem(input: UpdateItemInput!): Item!
  deleteItem(id: UUID!, householdId: UUID!): Boolean!
  markItemEaten(id: UUID!, householdId: UUID!): Item!
  markItemTossed(id: UUID!, householdId: UUID!): Item!
  markItemFrozen(id: UUID!, householdId: UUID!): Item!
  markItemPartial(id: UUID!, householdId: UUID!, input: MarkPartialInput!): Item!
  claimContainer(qrToken: String!): Container!
  createContainer(input: CreateContainerInput!): Container!
  updateContainer(input: UpdateContainerInput!): Container!
  archiveContainer(id: UUID!, householdId: UUID!): Boolean!
  createHousehold(name: String!): Household!
  renameHousehold(id: UUID!, name: String!): Household!
  inviteHouseholdMember(householdId: UUID!, email: String!): HouseholdMember!
  removeHouseholdMember(householdId: UUID!, userId: UUID!): Boolean!
  addShoppingListItem(input: AddShoppingListItemInput!): ShoppingListItem!
  updateShoppingListItem(input: UpdateShoppingListItemInput!): ShoppingListItem!
  deleteShoppingListItem(id: UUID!, householdId: UUID!): Boolean!
  markShoppingItemPurchased(id: UUID!, householdId: UUID!): ShoppingListItem!
  markShoppingItemUnpurchased(id: UUID!, householdId: UUID!): ShoppingListItem!
  rateRecipe(recipeId: String!, rating: Int!): Boolean!
  classifyFood(imageBase64: String!): FoodClassification!
  ocrExpiryDate(imageBase64: String!): String!
  analyzeReceipt(imageBase64: String!): ReceiptAnalysis!
}

type SignInResult { token: String! userId: String! }
type Profile { id: UUID! email: AWSEmail! displayName: String photoUrl: AWSURL timeZone: String! units: String! locale: String! defaultHouseholdId: UUID subscriptionTier: String! aiQuotaUsedToday: Int! aiQuotaResetAt: AWSDateTime! createdAt: AWSDateTime! updatedAt: AWSDateTime! dietaryPreferences: [String!]! cuisinePreferences: [String!]! allergies: [String!]! }
type Household { id: UUID! name: String! ownerId: UUID! memberCount: Int members: [HouseholdMember!] createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int _lastChangedAt: AWSDateTime }
type HouseholdMember { userId: UUID! displayName: String role: String! joinedAt: AWSDateTime! }
type Container { id: UUID! householdId: UUID! qrToken: String! nickname: String imageUrl: AWSURL claimedAt: AWSDateTime! claimedBy: UUID! archivedAt: AWSDateTime createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int _lastChangedAt: AWSDateTime }
type Item { id: UUID! householdId: UUID! containerId: UUID addedByUserId: UUID! foodType: String! foodName: String! category: String! storageLocation: String! quantityText: String quantityValue: Float quantityUnit: String storedAt: AWSDateTime! storedTz: String! expiryAt: AWSDateTime! expirySource: String! expiryConfidence: Float notes: String photoUrl: AWSURL barcode: String nutritionalData: NutritionalData priceUsd: Float status: String! eatenAt: AWSDateTime tossedAt: AWSDateTime frozenAt: AWSDateTime transferredToContainerId: UUID deletedAt: AWSDateTime createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int _lastChangedAt: AWSDateTime hoursUntilExpiry: Int statusColor: String }
type NutritionalData { caloriesPer100g: Float proteinPer100g: Float carbsPer100g: Float fatPer100g: Float fiberPer100g: Float sugarPer100g: Float sodiumPer100g: Float }
type ShoppingListItem { id: UUID! householdId: UUID! name: String! quantity: String category: String notes: String addedByUserId: UUID! purchasedAt: AWSDateTime purchasedByUserId: UUID autoSuggested: Boolean! createdAt: AWSDateTime! updatedAt: AWSDateTime! _version: Int _lastChangedAt: AWSDateTime }
type FoodRule { foodType: String! displayName: String! category: String! aliases: [String!]! fridgeDaysSafe: Int! freezerDaysSafe: Int pantryDaysSafe: Int counterHoursSafe: Int iconKey: String version: Int! }
type ShoppingListStats { totalItems: Int! purchasedItems: Int! estimatedCost: Float! categories: [String!]! }
type Recipe { id: String! name: String! image: String! ingredients: [String!]! }
type Restaurant { id: String! name: String! address: String! rating: Float! }
type FoodClassification { foodType: String! confidence: Float! category: String! }
type ReceiptAnalysis { items: [String!]! total: Float! date: String! }
input DeltaSyncInput { householdId: UUID! lastSyncTimestamp: AWSDateTime }
type DeltaSyncResult { containers: [Container!]! items: [Item!]! shoppingList: [ShoppingListItem!]! serverTimestamp: AWSDateTime! }
input CreateItemInput { householdId: UUID! containerId: UUID foodType: String! foodName: String! category: String storageLocation: String! quantityText: String quantityValue: Float quantityUnit: String storedAt: AWSDateTime! storedTz: String! expiryAt: AWSDateTime! expirySource: String! expiryConfidence: Float notes: String photoPath: String barcode: String nutritionalData: NutritionalDataInput priceUsd: Float clientId: UUID }
input UpdateItemInput { id: UUID! householdId: UUID! foodType: String foodName: String storageLocation: String expiryAt: AWSDateTime quantityText: String quantityValue: Float quantityUnit: String notes: String photoPath: String nutritionalData: NutritionalDataInput priceUsd: Float }
input NutritionalDataInput { caloriesPer100g: Float proteinPer100g: Float carbsPer100g: Float fatPer100g: Float fiberPer100g: Float sugarPer100g: Float sodiumPer100g: Float }
input MarkPartialInput { quantityText: String! quantityValue: Float quantityUnit: String }
input CreateContainerInput { householdId: UUID! nickname: String }
input UpdateContainerInput { id: UUID! householdId: UUID! nickname: String }
input AddShoppingListItemInput { householdId: UUID! name: String! quantity: String }
input UpdateShoppingListItemInput { id: UUID! householdId: UUID! name: String quantity: String }
`;

const schema = makeExecutableSchema({
  typeDefs: typeDefs,
  resolvers,
});

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
