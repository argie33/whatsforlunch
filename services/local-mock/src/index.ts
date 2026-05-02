import 'dotenv/config';
import { createServer } from 'node:http';
import { createYoga, createSchema } from 'graphql-yoga';
import { extractUser, signInWithEmail } from './auth.js';
import {
  requireHouseholdMembership,
  requireHouseholdOwnership,
  requireHouseholdAdmin,
} from './authz.js';
import {
  validateEmail,
  validateString,
  validateCreateItemInput,
  validateCreateHouseholdInput,
  validateInviteInput,
} from './validation.js';
import * as R from './resolvers.js';

// ─── Schema ──────────────────────────────────────────────────────────────────
// Simplified version of the AppSync schema with AWS-specific directives removed.
// Keep in sync with infra/cdk/lib/appsync/schema.graphql

const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar UUID
  scalar AWSURL

  enum StorageLocation {
    fridge
    freezer
    pantry
    counter
    lunchbox
  }
  enum ItemStatus {
    active
    partial
    eaten
    tossed
    frozen
    transferred
  }
  enum ExpirySource {
    rule
    ai
    ocr
    barcode
    user
  }
  enum HouseholdRole {
    owner
    member
    viewer
  }
  enum SubscriptionTier {
    free
    premium
    family
  }
  enum FoodCategory {
    protein
    grain
    dairy
    produce
    leftover
    sauce
    baked
    prepared
    beverage
  }

  type Profile {
    id: ID!
    email: String!
    displayName: String
    timeZone: String!
    units: String!
    locale: String!
    dietaryPreferences: [String!]!
    cuisinePreferences: [String!]!
    allergies: [String!]!
    defaultHouseholdId: ID
    subscriptionTier: SubscriptionTier!
    aiQuotaUsedToday: Int!
    aiQuotaResetAt: DateTime!
    createdAt: DateTime!
    updatedAt: DateTime!
    _version: Int!
  }

  type Household {
    id: ID!
    name: String!
    ownerId: ID!
    memberCount: Int!
    members: [HouseholdMember!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    _version: Int!
  }

  type HouseholdMember {
    userId: ID!
    displayName: String
    role: HouseholdRole!
    joinedAt: DateTime!
  }

  type Item {
    id: ID!
    householdId: ID!
    containerId: ID
    addedByUserId: ID!
    foodType: String!
    foodName: String!
    category: FoodCategory!
    storageLocation: StorageLocation!
    quantityText: String
    expiryAt: DateTime
    expirySource: ExpirySource
    expiryConfidence: Float
    notes: String
    photoUrl: String
    barcode: String
    status: ItemStatus!
    eatenAt: DateTime
    tossedAt: DateTime
    frozenAt: DateTime
    hoursUntilExpiry: Int
    statusColor: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    _version: Int!
  }

  type DeltaSyncResponse {
    items: [Item!]!
    containers: [Container!]!
    members: [HouseholdMember!]!
    deleted: [DeletedRef!]!
    timestamp: DateTime!
    hasMore: Boolean!
  }

  type DeletedRef {
    id: ID!
    entityType: String!
  }
  type Container {
    id: ID!
    householdId: ID!
    qrToken: String!
    qrNumber: Int!
    nickname: String
    imageUrl: String
    claimedAt: DateTime!
    claimedBy: ID
    archivedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    _version: Int!
    _lastChangedAt: Int!
  }

  type ShoppingListItem {
    id: ID!
    householdId: ID!
    name: String!
    quantity: String
    category: String
    notes: String
    addedByUserId: ID!
    purchasedAt: DateTime
    purchasedByUserId: ID
    autoSuggested: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    _version: Int!
    _lastChangedAt: Int!
  }

  type ShoppingListStats {
    total: Int!
    purchased: Int!
    pending: Int!
  }

  # Auth (local only — returns JWT; no email sent)
  type AuthResult {
    token: String!
    userId: ID!
  }

  # Image Upload (local development — returns mock presigned URL)
  type ImageUploadResponse {
    uploadUrl: String!
    imageKey: String!
    expiresIn: Int!
  }

  input UpdateProfileInput {
    displayName: String
    timeZone: String
    units: String
    locale: String
    dietaryPreferences: [String!]
    cuisinePreferences: [String!]
    allergies: [String!]
    defaultHouseholdId: ID
  }

  input CreateHouseholdInput {
    name: String!
  }

  input CreateItemInput {
    householdId: ID!
    containerId: ID
    foodType: String!
    foodName: String!
    category: FoodCategory!
    storageLocation: StorageLocation!
    quantityText: String
    expiryAt: DateTime!
    expirySource: ExpirySource!
    expiryConfidence: Float
    notes: String
    photoUrl: String
    barcode: String
  }

  input UpdateItemInput {
    householdId: ID!
    id: ID!
    foodName: String
    storageLocation: StorageLocation
    quantityText: String
    expiryAt: DateTime
    notes: String
    _version: Int!
  }

  input StatusInput {
    householdId: ID!
    id: ID!
    _version: Int!
  }

  input AddShoppingListItemInput {
    householdId: ID!
    name: String!
    quantity: String
    category: String
    notes: String
  }

  input UpdateShoppingListItemInput {
    id: ID!
    householdId: ID!
    name: String
    quantity: String
    category: String
    notes: String
  }

  input CreateShoppingListItemInput {
    householdId: ID!
    name: String!
    quantity: String
    category: String
    notes: String
  }

  input ClaimContainerInput {
    householdId: ID!
    qrToken: String!
    nickname: String
  }

  input UpdateContainerInput {
    householdId: ID!
    id: ID!
    nickname: String
    imageUrl: String
  }

  input ArchiveContainerInput {
    householdId: ID!
    id: ID!
  }

  input MarkPartialInput {
    quantityText: String!
    quantityValue: Int
    quantityUnit: String
  }

  input DeltaSyncInput {
    householdId: ID!
    lastSyncAt: DateTime!
    limit: Int
  }

  type DeltaSyncResult {
    containers: [Container!]!
    items: [Item!]!
    shoppingList: [ShoppingListItem!]!
    serverTimestamp: DateTime!
  }

  # Phase C: Caching, Analytics, ML, Images, Sharding, Replication

  type CachedItems {
    items: [Item!]!
    source: String!
  }

  type CachedProfile {
    profile: Profile!
    source: String!
  }

  type AnalyticsEvent {
    success: Boolean!
    eventId: String
    error: String
  }

  type CostAnalysis {
    householdId: ID!
    period: String!
    totalCost: Float!
    costByCategory: String!
    costByMember: String!
    itemCount: Int
  }

  type Recipe {
    id: ID!
    householdId: ID
    title: String!
    summary: String
    cuisine: String
    servings: Int!
    cookTimeMinutes: Int!
    difficulty: String!
    ingredients: [RecipeIngredient!]!
    steps: [String!]!
    tags: [String!]!
    imageUrl: String
    usedItemIds: [ID!]
    rating: Int
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RecipeIngredient {
    name: String!
    quantity: Float
    unit: String
    optional: Boolean
  }

  type RecommendationResult {
    recommendations: [Recipe!]!
    source: String!
    cachedAt: String
    generatedAt: String
  }

  type DeliveryPlatform {
    platform: String!
    deepLink: String!
  }

  type Restaurant {
    placeId: String!
    name: String!
    address: String!
    cuisineTypes: [String!]!
    rating: Float!
    priceLevel: Int
    distanceMeters: Int!
    isOpenNow: Boolean!
    deliveryPlatforms: [DeliveryPlatform!]!
    aiScore: Float!
    aiReason: String!
  }

  type ProcessedImage {
    originalUrl: String!
    optimizedUrl: String!
    thumbnailUrl: String!
    classification: String!
    confidence: Float!
    processingTime: Int!
  }

  type ShardStats {
    shardId: String!
    status: String!
    load: Float!
    itemCount: Int!
    lastUpdated: Int!
  }

  type ShardingResult {
    success: Boolean!
    householdId: ID!
    shardId: String!
    operation: String!
    result: String!
    shardStats: String!
  }

  type ReplicationMetric {
    region: String!
    replicationLatencyMs: Int!
    itemsReplicated: Int!
    failedReplications: Int!
    lastChecked: Int!
    isHealthy: Boolean!
  }

  type ReplicationHealth {
    success: Boolean!
    metrics: [ReplicationMetric!]!
  }

  type DataConsistencyReport {
    primaryRegion: String!
    secondaryRegion: String!
    consistencyScore: Int!
    dataGapItems: Int!
    lastSyncTime: Int!
    recommendations: [String!]!
  }

  input ProcessImageInput {
    userId: ID!
    householdId: ID!
    itemId: ID!
    imageUrl: String!
    imageBase64: String
  }

  input RouteShardingInput {
    householdId: ID!
    operation: String!
    data: String
  }

  input UserPreferencesInput {
    dietaryRestrictions: [String!]
    cuisinePreferences: [String!]
    allergies: [String!]
  }

  type Query {
    getProfile: Profile!
    listHouseholds: [Household!]!
    listHouseholdMembers(householdId: ID!): [HouseholdMember!]!
    listItems(householdId: ID!, limit: Int): [Item!]!
    getItem(id: ID!, householdId: ID!): Item
    deltaSync(input: DeltaSyncInput!): DeltaSyncResult!

    # Shopping List
    listShoppingItems(householdId: ID!): [ShoppingListItem!]!
    getShoppingItem(id: ID!, householdId: ID!): ShoppingListItem
    getShoppingListStats(householdId: ID!): ShoppingListStats!
    getShoppingListByCategory(householdId: ID!, category: String!): [ShoppingListItem!]!

    # Phase C.1: Caching
    getCachedHouseholdItems(householdId: ID!): CachedItems!
    getCachedHouseholdProfile(householdId: ID!): CachedProfile!

    # Phase C.2: Analytics
    getHouseholdAnalytics(householdId: ID!, period: String): CostAnalysis

    # Phase C.3: ML Recommendations
    getRecommendations(householdId: ID!): RecommendationResult!

    # Wave 3: Nearby Restaurants
    getNearbyRestaurants(householdId: String!, latitude: Float!, longitude: Float!): [Restaurant!]!

    # Phase C.5: Replication Monitoring
    checkReplicationHealth(householdId: ID!): ReplicationHealth!
    checkDataConsistency(householdId: ID!): DataConsistencyReport!
  }

  type Mutation {
    # Local auth — pass email, get JWT back (no magic link email in local mode)
    signIn(email: String!): AuthResult!

    updateProfile(input: UpdateProfileInput!): Profile!
    createHousehold(input: CreateHouseholdInput!): Household!
    inviteHouseholdMember(householdId: ID!, email: String!, role: HouseholdRole!): HouseholdMember!
    removeHouseholdMember(householdId: ID!, userId: ID!): Boolean!
    updateMemberRole(householdId: ID!, userId: ID!, role: HouseholdRole!): HouseholdMember!
    createItem(input: CreateItemInput!): Item!
    updateItem(input: UpdateItemInput!): Item!
    deleteItem(householdId: ID!, id: ID!): Boolean!
    markItemEaten(input: StatusInput!): Item!
    markItemTossed(input: StatusInput!): Item!
    markItemFrozen(input: StatusInput!): Item!
    markItemPartial(input: MarkPartialInput!): Item!

    # Containers
    claimContainer(input: ClaimContainerInput!): Container!
    updateContainer(input: UpdateContainerInput!): Container!
    archiveContainer(input: ArchiveContainerInput!): Container!

    # Shopping List
    addShoppingListItem(input: AddShoppingListItemInput!): ShoppingListItem!
    updateShoppingListItem(input: UpdateShoppingListItemInput!): ShoppingListItem!
    deleteShoppingListItem(id: ID!, householdId: ID!): Boolean!
    markShoppingItemPurchased(id: ID!, householdId: ID!): ShoppingListItem!
    markShoppingItemUnpurchased(id: ID!, householdId: ID!): ShoppingListItem!

    # Image Upload (local development — generates mock presigned URL)
    uploadImage(
      householdId: ID!
      filename: String!
      contentType: String!
      size: Int!
    ): ImageUploadResponse!

    # AI (mocked — returns random food classification)
    classifyFood(householdId: ID!, photoUrl: String!): Item!

    # Phase C.1: Caching
    invalidateHouseholdCache(householdId: ID!): Boolean!

    # Phase C.2: Analytics
    trackEvent(userId: ID!, householdId: ID!, eventType: String!, metadata: String): AnalyticsEvent!
    computeCostAnalysis(householdId: ID!): CostAnalysis

    # Phase C.3: ML Recommendations
    setUserPreferences(userId: ID!, preferences: UserPreferencesInput!): Boolean!
    rateRecommendation(userId: ID!, recipeId: ID!, rating: Int!): Boolean!

    # Phase C.4: Image Processing
    ocrExpiryDate(householdId: ID!, photoUrl: String!): String
    processImage(input: ProcessImageInput!): ProcessedImage!

    # Phase C.6: Sharding
    routeShardedRequest(input: RouteShardingInput!): ShardingResult!

    # Phase C.5: Replication
    triggerRebalancing(householdId: ID!): Boolean!
  }

  type Subscription {
    onItemUpdate(householdId: UUID!): Item!
    onHouseholdUpdate(householdId: UUID!): Container!
  }
`;

// ─── Resolvers ────────────────────────────────────────────────────────────────

const resolvers = {
  Query: {
    getProfile: (_: unknown, __: unknown, ctx: { user: ReturnType<typeof extractUser> }) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.getProfile(ctx.user);
    },
    listHouseholds: (_: unknown, __: unknown, ctx: { user: ReturnType<typeof extractUser> }) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.listHouseholds(ctx.user);
    },
    // SECURITY: All household-scoped queries require membership verification
    listHouseholdMembers: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.listHouseholdMembers(householdId);
    },
    listItems: async (
      _: unknown,
      { householdId, limit }: { householdId: string; limit?: number },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.listItems(householdId, limit);
    },
    getItem: async (
      _: unknown,
      { id, householdId }: { id: string; householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getItem(id, householdId);
    },
    deltaSync: async (
      _: unknown,
      { input }: { input: { householdId: string; lastSyncAt: string; limit?: number } },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId);
      return R.deltaSync(input.householdId, input.lastSyncAt, input.limit);
    },

    // Shopping List
    listShoppingItems: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.listShoppingItems(householdId);
    },
    getShoppingItem: async (
      _: unknown,
      { id, householdId }: { id: string; householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getShoppingItem(id, householdId);
    },
    getShoppingListStats: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getShoppingListStats(householdId);
    },
    getShoppingListByCategory: async (
      _: unknown,
      { householdId, category }: { householdId: string; category: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getShoppingListByCategory(householdId, category);
    },

    // Phase C.1: Caching
    getCachedHouseholdItems: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getCachedHouseholdItems(householdId);
    },
    getCachedHouseholdProfile: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getCachedHouseholdProfile(householdId);
    },

    // Phase C.2: Analytics
    getHouseholdAnalytics: async (
      _: unknown,
      { householdId, period }: { householdId: string; period?: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getHouseholdAnalytics(householdId, period);
    },

    // Phase C.3: ML Recommendations
    getRecommendations: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getRecipeRecommendations(householdId);
    },

    // Wave 3: Nearby Restaurants
    getNearbyRestaurants: async (
      _: unknown,
      {
        householdId,
        latitude,
        longitude,
      }: { householdId: string; latitude: number; longitude: number },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.getNearbyRestaurants(latitude, longitude, householdId);
    },

    // Phase C.5: Replication Monitoring
    checkReplicationHealth: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.checkReplicationHealth(householdId);
    },
    checkDataConsistency: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.checkDataConsistency(householdId);
    },
  },

  Mutation: {
    // SECURITY: Validate email input to prevent injection
    signIn: async (_: unknown, { email }: { email: string }) => {
      const validatedEmail = validateEmail(email);
      return signInWithEmail(validatedEmail);
    },
    updateProfile: (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.updateProfile(ctx.user, input);
    },
    createHousehold: (
      _: unknown,
      { input }: { input: { name: string } },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.createHousehold(ctx.user, input);
    },
    inviteHouseholdMember: (
      _: unknown,
      { householdId, email, role }: { householdId: string; email: string; role: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.inviteHouseholdMember(ctx.user, householdId, email, role);
    },
    removeHouseholdMember: (
      _: unknown,
      { householdId, userId }: { householdId: string; userId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.removeHouseholdMember(ctx.user, householdId, userId);
    },
    updateMemberRole: (
      _: unknown,
      { householdId, userId, role }: { householdId: string; userId: string; role: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.updateMemberRole(ctx.user, householdId, userId, role);
    },
    createItem: (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.createItem(ctx.user, input);
    },
    // SECURITY: All item mutations require user auth and household membership
    updateItem: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.updateItem(input);
    },
    deleteItem: async (
      _: unknown,
      { householdId, id }: { householdId: string; id: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.deleteItem(householdId, id);
    },
    markItemEaten: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.markItemEaten(input as any);
    },
    markItemTossed: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.markItemTossed(input as any);
    },
    markItemFrozen: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.markItemFrozen(input as any);
    },
    markItemPartial: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.markItemPartial(input as any);
    },

    // Shopping List
    addShoppingListItem: (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.addShoppingListItem(ctx.user, input);
    },
    updateShoppingListItem: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.updateShoppingListItem(input);
    },
    deleteShoppingListItem: async (
      _: unknown,
      { id, householdId }: { id: string; householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.deleteShoppingListItem(id, householdId);
    },
    markShoppingItemPurchased: (
      _: unknown,
      { id, householdId }: { id: string; householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.markShoppingItemPurchased(id, householdId, ctx.user.id);
    },
    markShoppingItemUnpurchased: async (
      _: unknown,
      { id, householdId }: { id: string; householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.markShoppingItemUnpurchased(id, householdId);
    },

    // Containers
    claimContainer: (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.claimContainer(ctx.user, input);
    },
    updateContainer: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.updateContainer(input);
    },
    archiveContainer: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, input.householdId as string);
      return R.archiveContainer(input);
    },

    // Image Upload (local mock — returns mock presigned URL for local development)
    uploadImage: async (
      _: unknown,
      {
        householdId,
        filename,
        contentType,
        size,
      }: { householdId: string; filename: string; contentType: string; size: number },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);

      // Validate file
      if (!filename || !contentType) {
        throw new Error('filename and contentType are required');
      }
      if (size > 10 * 1024 * 1024) {
        throw new Error('File size exceeds 10MB limit');
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        throw new Error('Only JPEG, PNG, and WebP images are supported');
      }

      // Generate mock key and URL for local development
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const key = `items/${householdId}/${ctx.user.id}/${timestamp}-${random}/${filename}`;
      const uploadUrl = `http://localhost:4000/upload/${key}`; // Local mock URL

      return {
        uploadUrl,
        imageKey: key,
        expiresIn: 3600, // 1 hour
      };
    },

    classifyFood: (
      _: unknown,
      { householdId, photoUrl }: { householdId: string; photoUrl: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      return R.classifyFood(ctx.user, householdId, photoUrl);
    },

    ocrExpiryDate: async (
      _: unknown,
      { householdId, photoUrl }: { householdId: string; photoUrl: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.ocrExpiryDate(photoUrl);
    },

    // Phase C.1: Caching
    invalidateHouseholdCache: async (
      _: unknown,
      { householdId }: { householdId: string },
      ctx: { user: ReturnType<typeof extractUser> },
    ) => {
      if (!ctx.user) throw new Error('Unauthorized');
      await requireHouseholdMembership(ctx.user, householdId);
      return R.invalidateHouseholdCache(householdId);
    },

    // Phase C.2: Analytics
    trackEvent: (
      _: unknown,
      {
        userId,
        householdId,
        eventType,
        metadata,
      }: { userId: string; householdId: string; eventType: string; metadata?: string },
    ) =>
      R.trackEvent({
        userId,
        householdId,
        eventType,
        metadata: metadata ? JSON.parse(metadata) : undefined,
      }),
    computeCostAnalysis: (_: unknown, { householdId }: { householdId: string }) =>
      R.computeCostAnalysis(householdId),

    // Phase C.3: ML Recommendations
    setUserPreferences: (
      _: unknown,
      { userId, preferences }: { userId: string; preferences: Record<string, unknown> },
    ) => R.setUserPreferences(userId, preferences),
    rateRecommendation: (
      _: unknown,
      { userId, recipeId, rating }: { userId: string; recipeId: string; rating: number },
    ) => R.rateRecommendation(userId, recipeId, rating),

    // Phase C.4: Image Processing
    processImage: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      R.processImage(input),

    // Phase C.6: Sharding
    routeShardedRequest: (_: unknown, { input }: { input: Record<string, unknown> }) =>
      R.routeShardedRequest(input),

    // Phase C.5: Replication
    triggerRebalancing: (_: unknown, { householdId }: { householdId: string }) =>
      R.triggerRebalancing(householdId),
  },
};

// ─── Server ───────────────────────────────────────────────────────────────────

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  context: ({ request }) => ({
    user: extractUser(request.headers.get('authorization') ?? undefined),
  }),
  graphiql: {
    title: 'WFL Local Mock API',
    headers: JSON.stringify({ Authorization: 'Bearer <your-token>' }),
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});

const server = createServer(yoga);

// Health check endpoint
const originalRequestHandler = server.listeners('request')[0] as (...args: unknown[]) => void;
server.removeAllListeners('request');
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }
  originalRequestHandler(req, res);
});

const PORT = Number(process.env.PORT ?? 4000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WFL Local Mock API running at http://localhost:${PORT}/graphql`);
  console.log(`📊 GraphiQL explorer at http://localhost:${PORT}/graphql`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);
  console.log(`\n📱 Mobile .env.local should set:`);
  console.log(`   EXPO_PUBLIC_APPSYNC_URL=http://localhost:${PORT}/graphql  (iOS sim)`);
  console.log(`   EXPO_PUBLIC_APPSYNC_URL=http://10.0.2.2:${PORT}/graphql   (Android emu)`);
});
