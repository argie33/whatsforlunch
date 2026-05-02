# 03 — API Specification

## Overview

The mobile app talks to the backend through a single GraphQL endpoint (AppSync). Future external consumers (public REST API, MCP server) will use a separate API Gateway facade that calls the same Lambda business logic.

**Endpoint**: `https://api-{env}.whatsfresh.app/graphql` (mapped via CloudFront → AppSync)

**Auth**: AWS Cognito User Pools JWT in `Authorization: Bearer <token>` header

**Subscriptions**: WebSocket via `wss://realtime-{env}.whatsfresh.app/graphql`

## Schema overview

GraphQL SDL is the source of truth. Stored at `infra/cdk/lib/appsync/schema.graphql`. Code generation (graphql-codegen) produces:
- TypeScript types for the mobile app (`apps/mobile/src/generated/graphql.ts`)
- TypeScript types for Lambdas (`packages/shared/src/generated/graphql.ts`)
- Zod schemas for runtime validation (`packages/shared/src/schemas/`)

## Type definitions

### Scalars

```graphql
scalar AWSDateTime    # ISO 8601 UTC
scalar AWSEmail
scalar AWSURL
scalar AWSJSON
scalar UUID
scalar Date           # YYYY-MM-DD
```

### Enums

```graphql
enum StorageLocation { fridge freezer pantry counter lunchbox }
enum ItemStatus { active partial eaten tossed frozen transferred }
enum ExpirySource { rule ai ocr barcode user }
enum HouseholdRole { owner member viewer }
enum SubscriptionTier { free premium family }
enum FoodCategory { protein grain dairy produce leftover sauce baked prepared beverage }
enum NotificationKind { expiry_alert daily_digest household_invite system }
enum EventType {
  created photoAdded aiClassified ocrProcessed edited
  markedEaten markedTossed markedFrozen markedPartial
  transferred snoozed
}
```

### Core types

```graphql
type Profile {
  id: UUID!
  email: AWSEmail!
  displayName: String
  photoUrl: AWSURL
  timeZone: String!
  units: String!
  locale: String!
  dietaryPreferences: [String!]!
  cuisinePreferences: [String!]!
  allergies: [String!]!
  defaultHouseholdId: UUID
  homeLocation: GeoPoint
  subscriptionTier: SubscriptionTier!
  subscriptionExpiresAt: AWSDateTime
  aiQuotaUsedToday: Int!
  aiQuotaResetAt: AWSDateTime!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type GeoPoint { lat: Float! lng: Float! accuracy: Float }

type Household {
  id: UUID!
  name: String!
  ownerId: UUID!
  imageUrl: AWSURL
  memberCount: Int!
  members: [HouseholdMember!]!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type HouseholdMember {
  userId: UUID!
  displayName: String
  photoUrl: AWSURL
  role: HouseholdRole!
  joinedAt: AWSDateTime!
}

type HouseholdInvite {
  id: UUID!
  householdId: UUID!
  token: String!
  expiresAt: AWSDateTime!
  createdBy: UUID!
  acceptedBy: UUID
  acceptedAt: AWSDateTime
}

type Container {
  id: UUID!
  qrToken: String!
  householdId: UUID!
  nickname: String
  imageUrl: AWSURL
  claimedAt: AWSDateTime!
  claimedBy: UUID!
  archivedAt: AWSDateTime
  currentItem: Item
  history(limit: Int = 50): [Item!]!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  _version: Int!
  _lastChangedAt: AWSDateTime!
}

type Item {
  id: UUID!
  householdId: UUID!
  containerId: UUID
  container: Container
  addedByUserId: UUID!
  addedBy: HouseholdMember
  foodType: String!
  foodName: String!
  category: FoodCategory!
  storageLocation: StorageLocation!
  quantityText: String
  quantityValue: Float
  quantityUnit: String
  storedAt: AWSDateTime!
  storedTz: String!
  expiryAt: AWSDateTime!
  expirySource: ExpirySource!
  expiryConfidence: Float
  notes: String
  photoUrl: AWSURL
  barcode: String
  barcodeData: BarcodeData
  priceUsd: Float
  nutritionalData: NutritionalData
  status: ItemStatus!
  eatenAt: AWSDateTime
  tossedAt: AWSDateTime
  frozenAt: AWSDateTime
  transferredToContainerId: UUID
  events: [ItemEvent!]!
  hoursUntilExpiry: Int!
  statusColor: String!  # computed: "fresh" | "soon" | "urgent" | "expired"
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
  deletedAt: AWSDateTime
  _version: Int!
  _lastChangedAt: AWSDateTime!
}

type BarcodeData {
  brand: String
  product: String
  servingSize: String
  imageUrl: AWSURL
}

type NutritionalData {
  calories: Float
  protein: Float
  carbs: Float
  fat: Float
  fiber: Float
  sugar: Float
  sodium: Float
}

type FoodRule {
  foodType: String!
  displayName: String!
  category: FoodCategory!
  aliases: [String!]!
  fridgeDaysSafe: Int!
  freezerDaysSafe: Int
  pantryDaysSafe: Int
  counterHoursSafe: Int
  description: String
  iconKey: String
  version: Int!
}

type ItemEvent {
  id: UUID!
  itemId: UUID!
  actorUserId: UUID!
  actor: HouseholdMember
  eventType: EventType!
  payload: AWSJSON
  createdAt: AWSDateTime!
}

type AiClassification {
  id: UUID!
  itemId: UUID!
  model: String!
  promptVersion: Int!
  response: AWSJSON!
  confidence: Float!
  userOverrode: Boolean!
  latencyMs: Int!
  createdAt: AWSDateTime!
}

type OcrJob {
  id: UUID!
  kind: String!  # "expiry_date" | "receipt"
  status: String!
  result: AWSJSON
  confidence: Float
  createdAt: AWSDateTime!
}

type ShoppingListItem {
  id: UUID!
  householdId: UUID!
  name: String!
  quantity: String
  category: String
  notes: String
  addedByUserId: UUID!
  addedBy: HouseholdMember
  purchasedAt: AWSDateTime
  purchasedByUserId: UUID
  autoSuggested: Boolean!
  linkedFoodType: String
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Recipe {
  id: UUID!
  householdId: UUID
  title: String!
  summary: String
  cuisine: String
  servings: Int!
  cookTimeMinutes: Int!
  difficulty: String!
  ingredients: [RecipeIngredient!]!
  steps: [String!]!
  tags: [String!]!
  imageUrl: AWSURL
  source: String!
  usedItemIds: [UUID!]!
  cookedAt: [AWSDateTime!]!
  rating: Int
  notes: String
  createdAt: AWSDateTime!
}

type RecipeIngredient {
  name: String!
  quantity: String
  unit: String
  optional: Boolean!
  matchedItemId: UUID
}

type NearbyPlace {
  id: String!  # Google Place ID
  name: String!
  cuisine: [String!]!
  rating: Float
  priceLevel: Int
  distanceMeters: Int!
  address: String!
  imageUrl: AWSURL
  deliveryDeepLinks: DeliveryDeepLinks
  openNow: Boolean
  matchScore: Float!  # AI-computed match against user prefs
  matchReason: String
}

type DeliveryDeepLinks {
  doordash: AWSURL
  ubereats: AWSURL
  grubhub: AWSURL
}

type Stats {
  period: String!
  itemsAdded: Int!
  itemsEaten: Int!
  itemsTossed: Int!
  itemsFrozen: Int!
  wasteUsd: Float!
  aiClassifications: Int!
  streakDays: Int!
}

type LearnedPreferences {
  topFoodsEaten: [FoodAffinity!]!
  topFoodsTossed: [FoodAffinity!]!
  cuisineAffinity: [CuisineScore!]!
  cookingFrequency: String!
  eatingOutFrequency: String!
  lastUpdatedAt: AWSDateTime!
}

type FoodAffinity { foodType: String! displayName: String! count: Int! lastSeenAt: AWSDateTime! }
type CuisineScore { cuisine: String! score: Float! }
```

### Subscription state types

```graphql
type SubscriptionStatus {
  tier: SubscriptionTier!
  active: Boolean!
  expiresAt: AWSDateTime
  willRenew: Boolean!
  inFreeTrial: Boolean!
  productId: String
  store: String  # "appstore" | "playstore"
}
```

### Inputs

```graphql
input CreateContainerInput {
  qrToken: String!
  householdId: UUID
  nickname: String
  clientId: UUID!
}

input CreateItemInput {
  containerId: UUID
  householdId: UUID!
  foodType: String!
  foodName: String!
  storageLocation: StorageLocation!
  storedAt: AWSDateTime!
  storedTz: String!
  expiryAt: AWSDateTime
  quantityText: String
  quantityValue: Float
  quantityUnit: String
  notes: String
  photoPath: String
  barcode: String
  priceUsd: Float
  expirySource: ExpirySource!
  clientId: UUID!
}

input UpdateItemInput {
  id: UUID!
  foodType: String
  foodName: String
  storageLocation: StorageLocation
  expiryAt: AWSDateTime
  quantityText: String
  quantityValue: Float
  quantityUnit: String
  notes: String
  photoPath: String
  expectedVersion: Int!  # optimistic concurrency
}

input ClassifyPhotoInput {
  itemId: UUID
  photoPath: String!
  storageLocation: StorageLocation
  hint: String
}

input OcrExpiryInput {
  photoPath: String!
}

input OcrReceiptInput {
  photoPath: String!
  householdId: UUID!
}

input RecipeQueryInput {
  itemIds: [UUID!]
  cuisine: String
  difficulty: String
  maxCookMinutes: Int
  servings: Int
}

input NearbyQueryInput {
  lat: Float!
  lng: Float!
  radiusMeters: Int = 5000
  cuisines: [String!]
  priceLevels: [Int!]
  openNow: Boolean
  excludeCuisines: [String!]
}

input DeltaSyncInput {
  lastSyncTimestamp: AWSDateTime
  householdId: UUID!
}
```

## Queries

```graphql
type Query {
  # Profile
  me: Profile!
  myPreferences: UserPreferences!
  myLearnedPreferences: LearnedPreferences!
  mySubscriptionStatus: SubscriptionStatus!

  # Households
  myHouseholds: [Household!]!
  household(id: UUID!): Household
  householdInvite(token: String!): HouseholdInvite

  # Containers
  container(id: UUID!): Container
  containerByQrToken(qrToken: String!): Container
  listContainers(householdId: UUID!, includeArchived: Boolean = false): [Container!]!

  # Items
  item(id: UUID!): Item
  listItems(householdId: UUID!, status: ItemStatus, location: StorageLocation): [Item!]!
  itemsExpiringSoon(householdId: UUID!, withinHours: Int = 168): [Item!]!
  searchItems(householdId: UUID!, query: String!): [Item!]!
  itemByBarcode(barcode: String!): Item

  # Food rules (cached)
  foodRules(version: Int): [FoodRule!]!  # if version matches client's, returns []

  # Recipes
  myRecipes(householdId: UUID!): [Recipe!]!
  suggestRecipes(input: RecipeQueryInput!): [Recipe!]!  # Lambda resolver

  # Nearby
  suggestNearby(input: NearbyQueryInput!): [NearbyPlace!]!  # Lambda resolver

  # Shopping
  shoppingList(householdId: UUID!): [ShoppingListItem!]!

  # Stats
  myStats(period: String!): Stats!
  householdStats(householdId: UUID!, period: String!): Stats!

  # Sync
  deltaSync(input: DeltaSyncInput!): DeltaSyncResult!
}

type DeltaSyncResult {
  containers: [Container!]!
  items: [Item!]!
  shoppingList: [ShoppingListItem!]!
  serverTimestamp: AWSDateTime!
}
```

## Mutations

```graphql
type Mutation {
  # Profile
  updateProfile(input: UpdateProfileInput!): Profile!
  updatePreferences(input: UpdatePreferencesInput!): UserPreferences!
  registerDevice(input: RegisterDeviceInput!): Device!
  deleteAccount(confirmation: String!): DeleteAccountResult!  # confirmation = email
  exportMyData: ExportJob!

  # Households
  createHousehold(input: CreateHouseholdInput!): Household!
  updateHousehold(input: UpdateHouseholdInput!): Household!
  deleteHousehold(id: UUID!): DeleteResult!
  inviteToHousehold(householdId: UUID!): HouseholdInvite!
  acceptHouseholdInvite(token: String!): Household!
  removeHouseholdMember(householdId: UUID!, userId: UUID!): Household!
  leaveHousehold(householdId: UUID!): DeleteResult!
  changeRole(householdId: UUID!, userId: UUID!, role: HouseholdRole!): HouseholdMember!

  # Containers
  createContainer(input: CreateContainerInput!): Container!
  updateContainer(input: UpdateContainerInput!): Container!
  archiveContainer(id: UUID!): Container!
  unarchiveContainer(id: UUID!): Container!

  # Items
  createItem(input: CreateItemInput!): Item!
  updateItem(input: UpdateItemInput!): Item!
  deleteItem(id: UUID!): DeleteResult!
  markItemEaten(id: UUID!, atTimestamp: AWSDateTime): Item!
  markItemTossed(id: UUID!, atTimestamp: AWSDateTime): Item!
  markItemFrozen(id: UUID!, atTimestamp: AWSDateTime): Item!
  markItemPartial(id: UUID!, remainingQuantityText: String!): Item!
  transferItem(id: UUID!, toContainerId: UUID!): Item!
  snoozeItem(id: UUID!, hours: Int!): Item!

  # Bulk
  bulkCreateItems(items: [CreateItemInput!]!): [Item!]!
  bulkUpdateItemStatus(itemIds: [UUID!]!, status: ItemStatus!): [Item!]!

  # AI / OCR
  classifyItemPhoto(input: ClassifyPhotoInput!): AiClassificationResult!
  ocrExpiryDate(input: OcrExpiryInput!): OcrExpiryResult!
  ocrReceipt(input: OcrReceiptInput!): OcrJob!  # async

  # Recipes
  saveRecipe(input: SaveRecipeInput!): Recipe!
  rateRecipe(id: UUID!, rating: Int!): Recipe!
  markRecipeCooked(id: UUID!, usedItemIds: [UUID!]!): Recipe!
  deleteRecipe(id: UUID!): DeleteResult!

  # Shopping
  addShoppingItem(input: AddShoppingItemInput!): ShoppingListItem!
  updateShoppingItem(input: UpdateShoppingItemInput!): ShoppingListItem!
  markShoppingItemPurchased(id: UUID!): ShoppingListItem!
  deleteShoppingItem(id: UUID!): DeleteResult!

  # Photo upload
  presignedPhotoUpload(filename: String!, contentType: String!): PresignedUploadResult!
}

type AiClassificationResult {
  classification: AiClassification!
  suggestedFoodType: String!
  suggestedFoodName: String!
  suggestedExpiryAt: AWSDateTime!
  confidence: Float!
  alternatives: [AlternativeClassification!]!
  reasoning: String
}

type AlternativeClassification { foodType: String! confidence: Float! }

type OcrExpiryResult {
  detectedDates: [DetectedDate!]!
  bestGuess: AWSDateTime
  confidence: Float!
}

type DetectedDate { rawText: String! parsedAt: AWSDateTime confidence: Float! boundingBox: BoundingBox! }
type BoundingBox { x: Float! y: Float! width: Float! height: Float! }

type DeleteResult { success: Boolean! id: UUID }
type DeleteAccountResult { success: Boolean! deletionScheduledAt: AWSDateTime! }
type ExportJob { id: UUID! status: String! signedUrl: AWSURL! expiresAt: AWSDateTime! }
type PresignedUploadResult { uploadUrl: AWSURL! photoPath: String! expiresAt: AWSDateTime! }
```

## Subscriptions

Subscriptions are filtered server-side by household membership. The Cognito JWT's claims are checked against household members.

```graphql
type Subscription {
  onContainerChanged(householdId: UUID!): Container
    @aws_subscribe(mutations: ["createContainer", "updateContainer", "archiveContainer", "unarchiveContainer"])

  onItemChanged(householdId: UUID!): Item
    @aws_subscribe(mutations: [
      "createItem", "updateItem", "deleteItem",
      "markItemEaten", "markItemTossed", "markItemFrozen",
      "markItemPartial", "transferItem", "snoozeItem"
    ])

  onShoppingListChanged(householdId: UUID!): ShoppingListItem
    @aws_subscribe(mutations: [
      "addShoppingItem", "updateShoppingItem",
      "markShoppingItemPurchased", "deleteShoppingItem"
    ])

  onHouseholdChanged(householdId: UUID!): Household
    @aws_subscribe(mutations: [
      "updateHousehold", "removeHouseholdMember", "changeRole",
      "acceptHouseholdInvite"
    ])
}
```

## Authorization rules

Defined per-field with `@aws_auth` and resolver-level checks.

```
Default: requires Cognito User Pools auth (`@aws_cognito_user_pools`).

Field-level:
- Profile, Household, Container, Item: filter by Cognito sub matching ownership/membership
- FoodRule: any authenticated user can read
- AI mutations: check user's daily quota in Lambda
- deleteAccount: require email confirmation matching profile.email
```

Resolver-level checks (checkHouseholdMembership AppSync function) verify:
- For household-scoped operations, the user is a member with sufficient role
- For owner-only operations (deleteHousehold, removeHouseholdMember), the user has role=owner
- For viewer role, only Query fields are allowed (no mutations)

## Rate limits

| Operation | Free tier | Premium tier |
|---|---|---|
| `classifyItemPhoto` | 10/day | unlimited |
| `ocrExpiryDate` | 30/day | unlimited |
| `ocrReceipt` | 5/day | 50/day |
| `suggestRecipes` | 5/day | unlimited |
| `suggestNearby` | 20/day | unlimited |
| Other queries | 1000/min/user | 1000/min/user |
| Mutations | 200/min/user | 500/min/user |

Enforced in Lambda for AI mutations (DynamoDB counter). Enforced at AppSync via WAF + Lambda authorizer for general rate limits.

## Error model

Errors follow GraphQL spec with extension data:

```json
{
  "errors": [{
    "message": "Quota exceeded for AI classifications",
    "path": ["classifyItemPhoto"],
    "extensions": {
      "code": "QUOTA_EXCEEDED",
      "requestId": "abc-123",
      "retryable": false,
      "userMessage": "You've used all 10 AI scans today. Upgrade to Premium for unlimited."
    }
  }]
}
```

Standard codes:
- `UNAUTHENTICATED` (401-equivalent)
- `FORBIDDEN` (403-equivalent)
- `NOT_FOUND` (404)
- `CONFLICT` (409, version mismatch)
- `QUOTA_EXCEEDED`
- `VALIDATION_FAILED`
- `RATE_LIMITED`
- `EXTERNAL_API_FAILED` (Bedrock / Textract / Places error)
- `INTERNAL_ERROR`

Mobile client surfaces `userMessage` to users; logs `code` and `requestId` to Sentry.

## Pagination

For list queries that may grow large, use cursor-based pagination:

```graphql
type ItemConnection {
  edges: [ItemEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type ItemEdge { node: Item! cursor: String! }
type PageInfo { hasNextPage: Boolean! endCursor: String }

type Query {
  listItemsPaginated(
    householdId: UUID!
    first: Int = 50
    after: String
    filter: ListItemsFilter
  ): ItemConnection!
}
```

For MVP, initial item lists are small (<200 per household typical) so we use the unpaginated `listItems`. Paginated version is available for households exceeding that.

## REST endpoints (Lambda → API Gateway, MVP scope)

While GraphQL is primary, a few endpoints exist outside GraphQL for technical reasons:

### Webhooks (incoming)

- `POST /webhooks/revenuecat` — RevenueCat subscription events. Validates HMAC signature against shared secret.

### OAuth callbacks

- `GET /auth/apple/callback` — Apple Sign-In redirect handler
- `GET /auth/google/callback` — Google Sign-In redirect handler

### Universal Links (deep linking)

- `GET /.well-known/apple-app-site-association` — static JSON, served via CloudFront
- `GET /.well-known/assetlinks.json` — static JSON, served via CloudFront
- `GET /c/:qrToken` — Universal Link for QR scans, redirects into app or App Store

### Public exports (signed URL only)

- `GET /exports/:exportId.zip` — served from S3 via signed URL, never directly from this endpoint

## Future REST/MCP API (Wave 6, designed for)

Public REST API at `/v1/*` mirroring GraphQL functionality. Auth via OAuth 2.0 client credentials → scoped JWT.

```
GET    /v1/households
GET    /v1/households/:id/items
POST   /v1/households/:id/items
PATCH  /v1/items/:id
POST   /v1/items/:id/eaten
GET    /v1/items/expiring
```

MCP server endpoints (also Wave 6) at `/mcp/v1/*`:
- Tools: `list_items`, `create_item`, `mark_eaten`, `get_recipes`, `get_household_status`

Both reuse the same Lambda business logic as AppSync resolvers. The GraphQL/REST/MCP split is purely a presentation layer.

## Versioning strategy

GraphQL: schema is versioned by `_version` on entities + additive-only changes. Breaking changes require a new field name (`itemV2`, `createItemV2`).

REST (future): URL-versioned at `/v1`, `/v2`. Sunset old versions after 12 months notice.

Mobile app: every release pinned to a minimum schema version; CDK deploys gate on schema compat.

## Codegen

```bash
pnpm graphql:codegen
```

Generates:
- `apps/mobile/src/generated/graphql.ts` (operations + types)
- `packages/shared/src/generated/graphql.ts` (types only)
- `packages/shared/src/schemas/operations.ts` (Zod schemas)

Runs in CI on PR; fails if generated code differs from committed.

## Testing

- **Schema validation**: `graphql-validate` on every PR
- **Resolver unit tests**: each JS resolver has a `.test.js` with sample request/response
- **Lambda unit tests**: Vitest with mocked AWS SDK
- **Integration tests**: Test against ephemeral CDK-deployed environment per PR
- **Contract tests**: mobile app integration tests use real schema via `aws-amplify` mock mode

See [09_TESTING.md](09_TESTING.md) for the full validation strategy.

## Cross-references

- Data model that backs this API → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- Auth & rate limit details → [04_SECURITY.md](04_SECURITY.md)
- AI mutation specifics → [06_AI_INTEGRATION.md](06_AI_INTEGRATION.md)
