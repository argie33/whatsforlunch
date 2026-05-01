# 02 — Data Model

This document defines the canonical data model for the system. Every storage layer (DynamoDB cloud, WatermelonDB local) and every API contract derives from this.

## Storage strategy

| Layer                   | Tech                              | Purpose                                              |
| ----------------------- | --------------------------------- | ---------------------------------------------------- |
| **Local mobile**        | WatermelonDB (SQLite + SQLCipher) | Source of truth for the app's reactive UI            |
| **Cloud authoritative** | DynamoDB (single-table)           | Source of truth across devices and household members |
| **Cloud blob**          | S3                                | Photos, exports, app assets                          |
| **Cloud cache**         | AppSync per-resolver cache        | Hot reads (food_rules)                               |
| **Local cache**         | react-native-mmkv (encrypted)     | Settings, feature flags, ephemeral state             |

The contract: **Cloud is authoritative for identity & reconciliation, local is authoritative for UX latency.** Conflicts resolve via per-field rules (see Sync section below).

## Single-table DynamoDB design

We use one DynamoDB table (`WFL-Main-{env}`) holding all entity types, distinguished by composite key patterns. This is the Rick Houlihan / Alex DeBrie pattern.

### Why single table

- Cheaper at scale (one set of capacity, one backup)
- Atomic transactions across entity types
- Fewer round-trips (related items co-located by partition)
- Pattern is industry-standard for serverless DynamoDB at scale

### Primary key

| Attribute | Type   | Description                  |
| --------- | ------ | ---------------------------- |
| `PK`      | String | Partition key (entity-typed) |
| `SK`      | String | Sort key (entity-typed)      |

### Global Secondary Indexes (GSIs)

| GSI    | PK       | SK       | Purpose                                  |
| ------ | -------- | -------- | ---------------------------------------- |
| `GSI1` | `GSI1PK` | `GSI1SK` | User → all their households              |
| `GSI2` | `GSI2PK` | `GSI2SK` | Items expiring soon (sparse)             |
| `GSI3` | `GSI3PK` | `GSI3SK` | Per-user items across households         |
| `GSI4` | `GSI4PK` | `GSI4SK` | Lookup by external ID (qrToken, barcode) |

All GSIs project ALL attributes.

### Common attributes (every item)

| Attribute        | Type                  | Required | Notes                                                  |
| ---------------- | --------------------- | -------- | ------------------------------------------------------ |
| `entityType`     | String                | yes      | `Profile`, `Household`, `Container`, `Item`, etc.      |
| `id`             | String (UUID v4)      | yes      | Stable opaque identifier                               |
| `createdAt`      | String (ISO 8601 UTC) | yes      |                                                        |
| `updatedAt`      | String (ISO 8601 UTC) | yes      | Updated by every write                                 |
| `deletedAt`      | String (ISO 8601 UTC) | no       | Soft delete                                            |
| `_version`       | Number                | yes      | Incremented atomically by every mutation; used by sync |
| `_lastChangedAt` | Number (epoch ms)     | yes      | Used by sync conflict resolution                       |
| `clientId`       | String (UUID v4)      | yes      | UUID generated on-device pre-sync                      |

### Entity catalog

#### `Profile` — one per user

| Attribute               | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `PK`                    | `USER#<userId>`                                                |
| `SK`                    | `PROFILE`                                                      |
| `entityType`            | `Profile`                                                      |
| `email`                 | String (lowercased, validated)                                 |
| `displayName`           | String                                                         |
| `photoPath`             | String (S3 key)                                                |
| `timeZone`              | String (IANA, e.g. `America/Los_Angeles`)                      |
| `units`                 | String (`metric` \| `imperial`)                                |
| `locale`                | String (BCP 47, e.g. `en-US`)                                  |
| `dietaryPreferences`    | List<String> (e.g. `[vegan, gluten-free]`)                     |
| `cuisinePreferences`    | List<String> (e.g. `[italian, japanese, thai]`)                |
| `allergies`             | List<String>                                                   |
| `defaultHouseholdId`    | String (UUID)                                                  |
| `homeLocation`          | Map (`{lat, lng, accuracy}`) — optional, for restaurant search |
| `subscriptionTier`      | String (`free` \| `premium` \| `family`)                       |
| `subscriptionExpiresAt` | String (ISO 8601)                                              |
| `aiQuotaUsedToday`      | Number                                                         |
| `aiQuotaResetAt`        | String (ISO 8601)                                              |
| **GSI1PK**              | `USER#<userId>`                                                |
| **GSI1SK**              | `PROFILE`                                                      |

#### `Household` — a multi-user group

| Attribute     | Value                                      |
| ------------- | ------------------------------------------ |
| `PK`          | `HOUSEHOLD#<householdId>`                  |
| `SK`          | `META`                                     |
| `entityType`  | `Household`                                |
| `name`        | String                                     |
| `ownerId`     | String (UUID)                              |
| `memberCount` | Number                                     |
| `imageUrl`    | String (S3 key) — optional household photo |

#### `HouseholdMember`

| Attribute     | Value                                    |
| ------------- | ---------------------------------------- |
| `PK`          | `HOUSEHOLD#<householdId>`                |
| `SK`          | `MEMBER#<userId>`                        |
| `entityType`  | `HouseholdMember`                        |
| `userId`      | String                                   |
| `role`        | String (`owner` \| `member` \| `viewer`) |
| `joinedAt`    | String                                   |
| `displayName` | String (denormalized for fast reads)     |
| `photoPath`   | String (denormalized)                    |
| **GSI1PK**    | `USER#<userId>`                          |
| **GSI1SK**    | `HOUSEHOLD#<householdId>`                |

GSI1 lets us answer "list all households this user belongs to" in a single query.

#### `HouseholdInvite`

| Attribute    | Value                                       |
| ------------ | ------------------------------------------- |
| `PK`         | `HOUSEHOLD#<householdId>`                   |
| `SK`         | `INVITE#<inviteId>`                         |
| `entityType` | `HouseholdInvite`                           |
| `token`      | String (URL-safe, cryptographically random) |
| `expiresAt`  | String                                      |
| `createdBy`  | String (userId)                             |
| `acceptedBy` | String — nullable                           |
| `acceptedAt` | String — nullable                           |
| **GSI4PK**   | `INVITE_TOKEN#<token>`                      |
| **GSI4SK**   | `INVITE`                                    |

GSI4 lets us look up invites by token (the user clicks a link with the token).

#### `Container` — a physical container

| Attribute       | Value                                                                                 |
| --------------- | ------------------------------------------------------------------------------------- |
| `PK`            | `HOUSEHOLD#<householdId>`                                                             |
| `SK`            | `CONTAINER#<containerId>`                                                             |
| `entityType`    | `Container`                                                                           |
| `qrToken`       | String (URL-safe random, what's encoded in the QR code)                               |
| `qrNumber`      | Number (unique numeric identifier 1000-9999, user-friendly for verbal identification) |
| `nickname`      | String — optional                                                                     |
| `imageUrl`      | String — optional photo of the container                                              |
| `claimedAt`     | String                                                                                |
| `claimedBy`     | String (userId)                                                                       |
| `archivedAt`    | String — nullable                                                                     |
| `currentItemId` | String — denormalized pointer to active item                                          |
| **GSI4PK**      | `QR_TOKEN#<qrToken>`                                                                  |
| **GSI4SK**      | `CONTAINER`                                                                           |
| **GSI5PK**      | `QR_NUMBER#<householdId>`                                                             |
| **GSI5SK**      | `<qrNumber>`                                                                          |

GSI4 lets us look up "what container does this QR token belong to?" without scanning.
GSI5 lets us look up containers by qrNumber for user-friendly searching within a household.
QR codes printed should display both the visual code (encodes qrToken) and the number (printed text) for user reference.

#### `Item` — a batch of food

| Attribute                  | Value                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `PK`                       | `HOUSEHOLD#<householdId>`                                                          |
| `SK`                       | `ITEM#<itemId>`                                                                    |
| `entityType`               | `Item`                                                                             |
| `containerId`              | String — nullable (pantry items don't need a container)                            |
| `addedByUserId`            | String                                                                             |
| `foodType`                 | String (FK to FoodRule.foodType)                                                   |
| `foodName`                 | String (display name; can differ from foodType)                                    |
| `category`                 | String (denormalized from FoodRule for indexing)                                   |
| `storageLocation`          | String (`fridge` \| `freezer` \| `pantry` \| `counter` \| `lunchbox`)              |
| `quantityText`             | String (free-text "2 servings", "half a pan")                                      |
| `quantityValue`            | Number — optional structured                                                       |
| `quantityUnit`             | String — optional structured                                                       |
| `storedAt`                 | String (ISO 8601 UTC)                                                              |
| `storedTz`                 | String (IANA, the user's tz at scan)                                               |
| `expiryAt`                 | String (ISO 8601 UTC)                                                              |
| `expirySource`             | String (`rule` \| `ai` \| `ocr` \| `barcode` \| `user`)                            |
| `expiryConfidence`         | Number (0–1, applicable when source is `ai` or `ocr`)                              |
| `notes`                    | String — user free-text                                                            |
| `photoPath`                | String — S3 key, nullable                                                          |
| `barcode`                  | String — nullable                                                                  |
| `barcodeData`              | Map — denormalized name/brand from barcode lookup                                  |
| `priceUsd`                 | Number — nullable, for waste $ tracking                                            |
| `nutritionalData`          | Map — nullable (calories, protein, carbs, fat per serving)                         |
| `status`                   | String (`active` \| `partial` \| `eaten` \| `tossed` \| `frozen` \| `transferred`) |
| `eatenAt`                  | String — nullable                                                                  |
| `tossedAt`                 | String — nullable                                                                  |
| `frozenAt`                 | String — nullable                                                                  |
| `transferredToContainerId` | String — nullable                                                                  |
| `aiClassificationId`       | String — FK to AiClassification                                                    |
| `ocrJobId`                 | String — FK to OcrJob                                                              |
| **GSI2PK**                 | `EXPIRING#<householdId>` (only set when status=active and expiryAt within 14 days) |
| **GSI2SK**                 | `<expiryAt>`                                                                       |
| **GSI3PK**                 | `USER_ITEMS#<addedByUserId>`                                                       |
| **GSI3SK**                 | `<storedAt>`                                                                       |
| **GSI4PK**                 | `BARCODE#<barcode>` (when barcode set)                                             |
| **GSI4SK**                 | `ITEM#<itemId>`                                                                    |

GSI2 is sparse and answers: "for this household, what's expiring in the next 14 days, sorted by date?" Used by dashboard and digest notifier.

GSI3 answers: "what has user X added across all their households?" Used by activity log.

GSI4 answers: "have I scanned this barcode before?" (deduplication).

#### `FoodRule` — spoilage rules

| Attribute          | Value                                                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `PK`               | `RULES`                                                                                                               |
| `SK`               | `FOOD#<foodType>`                                                                                                     |
| `entityType`       | `FoodRule`                                                                                                            |
| `foodType`         | String (key, e.g. `cooked_chicken`)                                                                                   |
| `displayName`      | String (e.g. "Cooked chicken")                                                                                        |
| `category`         | String (`protein` \| `grain` \| `dairy` \| `produce` \| `leftover` \| `sauce` \| `baked` \| `prepared` \| `beverage`) |
| `aliases`          | List<String> (for AI matching: `["chicken breast", "rotisserie chicken"]`)                                            |
| `fridgeDaysSafe`   | Number                                                                                                                |
| `freezerDaysSafe`  | Number — nullable                                                                                                     |
| `pantryDaysSafe`   | Number — nullable                                                                                                     |
| `counterHoursSafe` | Number — nullable                                                                                                     |
| `description`      | String                                                                                                                |
| `iconKey`          | String                                                                                                                |
| `version`          | Number — bump on edit, used for cache invalidation                                                                    |

#### `ItemEvent` — audit log

| Attribute     | Value                                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PK`          | `HOUSEHOLD#<householdId>`                                                                                                                                                                |
| `SK`          | `EVENT#<itemId>#<timestamp>`                                                                                                                                                             |
| `entityType`  | `ItemEvent`                                                                                                                                                                              |
| `itemId`      | String                                                                                                                                                                                   |
| `actorUserId` | String                                                                                                                                                                                   |
| `eventType`   | String (`created` \| `photoAdded` \| `aiClassified` \| `ocrProcessed` \| `edited` \| `markedEaten` \| `markedTossed` \| `markedFrozen` \| `markedPartial` \| `transferred` \| `snoozed`) |
| `payload`     | Map (event-specific data)                                                                                                                                                                |
| `createdAt`   | String                                                                                                                                                                                   |

#### `AiClassification` — AI photo audit

| Attribute       | Value                                                 |
| --------------- | ----------------------------------------------------- |
| `PK`            | `HOUSEHOLD#<householdId>`                             |
| `SK`            | `AI#<itemId>#<timestamp>`                             |
| `entityType`    | `AiClassification`                                    |
| `itemId`        | String                                                |
| `model`         | String (`claude-haiku-4-5` etc.)                      |
| `promptVersion` | Number                                                |
| `requestId`     | String                                                |
| `response`      | Map (full structured response)                        |
| `confidence`    | Number (0–1)                                          |
| `userOverrode`  | Boolean — set true if user edited the AI's suggestion |
| `latencyMs`     | Number                                                |
| `costUsd`       | Number                                                |
| `cacheHit`      | Boolean                                               |

#### `OcrJob` — OCR audit (printed dates, receipts)

| Attribute       | Value                                                        |
| --------------- | ------------------------------------------------------------ |
| `PK`            | `HOUSEHOLD#<householdId>`                                    |
| `SK`            | `OCR#<jobId>`                                                |
| `entityType`    | `OcrJob`                                                     |
| `kind`          | String (`expiry_date` \| `receipt`)                          |
| `s3PhotoPath`   | String                                                       |
| `textractJobId` | String — for async receipts                                  |
| `status`        | String (`pending` \| `processing` \| `complete` \| `failed`) |
| `result`        | Map (parsed structure: detected dates, items)                |
| `confidence`    | Number (0–1)                                                 |
| `usedFallback`  | Boolean — true if fell back to Bedrock                       |
| `costUsd`       | Number                                                       |

#### `Device` — push notification target

| Attribute        | Value                       |
| ---------------- | --------------------------- |
| `PK`             | `USER#<userId>`             |
| `SK`             | `DEVICE#<deviceId>`         |
| `entityType`     | `Device`                    |
| `expoPushToken`  | String                      |
| `snsEndpointArn` | String                      |
| `platform`       | String (`ios` \| `android`) |
| `appVersion`     | String                      |
| `osVersion`      | String                      |
| `model`          | String                      |
| `lastSeenAt`     | String                      |
| `pushEnabled`    | Boolean                     |

#### `NotificationLog`

| Attribute       | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| `PK`            | `USER#<userId>`                                                             |
| `SK`            | `NOTIF#<timestamp>#<id>`                                                    |
| `entityType`    | `NotificationLog`                                                           |
| `kind`          | String (`expiry_alert` \| `daily_digest` \| `household_invite` \| `system`) |
| `relatedItemId` | String — nullable                                                           |
| `payload`       | Map                                                                         |
| `sentAt`        | String                                                                      |
| `deliveredAt`   | String — nullable                                                           |
| `tappedAt`      | String — nullable                                                           |

#### `ShoppingListItem`

| Attribute           | Value                     |
| ------------------- | ------------------------- |
| `PK`                | `HOUSEHOLD#<householdId>` |
| `SK`                | `SHOP#<itemId>`           |
| `entityType`        | `ShoppingListItem`        |
| `name`              | String                    |
| `quantity`          | String                    |
| `category`          | String                    |
| `notes`             | String                    |
| `addedByUserId`     | String                    |
| `purchasedAt`       | String — nullable         |
| `purchasedByUserId` | String — nullable         |
| `autoSuggested`     | Boolean                   |
| `linkedFoodType`    | String — nullable         |

#### `Recipe` — saved or AI-generated recipe

| Attribute         | Value                                                 |
| ----------------- | ----------------------------------------------------- |
| `PK`              | `HOUSEHOLD#<householdId>`                             |
| `SK`              | `RECIPE#<recipeId>`                                   |
| `entityType`      | `Recipe`                                              |
| `title`           | String                                                |
| `summary`         | String                                                |
| `cuisine`         | String                                                |
| `servings`        | Number                                                |
| `cookTimeMinutes` | Number                                                |
| `difficulty`      | String (`easy` \| `medium` \| `hard`)                 |
| `ingredients`     | List<Map> (`{name, quantity, unit, optional}`)        |
| `steps`           | List<String>                                          |
| `tags`            | List<String>                                          |
| `imageUrl`        | String — nullable                                     |
| `source`          | String (`ai_generated` \| `user_added` \| `imported`) |
| `aiPromptVersion` | Number — nullable                                     |
| `usedItemIds`     | List<String> — items it was generated to use          |
| `cookedAt`        | List<String> — timestamps user reported cooking it    |
| `rating`          | Number (1–5)                                          |
| `notes`           | String                                                |

#### `RecipeCache` — global cache (across users)

| Attribute    | Value                                          |
| ------------ | ---------------------------------------------- |
| `PK`         | `RECIPE_CACHE`                                 |
| `SK`         | `KEY#<sha256(ingredient_set + dietary_prefs)>` |
| `entityType` | `RecipeCache`                                  |
| `recipes`    | List<Map>                                      |
| `expiresAt`  | String (TTL)                                   |

DynamoDB TTL attribute set on `expiresAt` to auto-delete after 30 days.

#### `NearbyPlacesCache`

| Attribute    | Value                                               |
| ------------ | --------------------------------------------------- |
| `PK`         | `USER#<userId>`                                     |
| `SK`         | `PLACES#<sha256(lat_lng_radius_filter)>`            |
| `entityType` | `NearbyPlacesCache`                                 |
| `places`     | List<Map> (Google Places results, ranked by Claude) |
| `expiresAt`  | String (TTL: 30 min)                                |

#### `UserPreferences` — granular settings

| Attribute                | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| `PK`                     | `USER#<userId>`                                               |
| `SK`                     | `PREFS`                                                       |
| `entityType`             | `UserPreferences`                                             |
| `notifications`          | Map (`{enabledKinds, quietHoursStart, quietHoursEnd, sound}`) |
| `defaultExpiryOverrides` | Map (foodType → custom days)                                  |
| `deliveryApps`           | List<String> (`[doordash, ubereats]`)                         |
| `privacy`                | Map (`{deletePhotosAfterAi, shareAnalytics}`)                 |
| `theme`                  | String (`auto` \| `light` \| `dark`)                          |
| `dynamicTypeMax`         | Number (1.0–1.5)                                              |
| `reduceMotion`           | Boolean                                                       |

#### `LearnedPreferences` — AI-learned tastes

| Attribute            | Value                                                 |
| -------------------- | ----------------------------------------------------- |
| `PK`                 | `USER#<userId>`                                       |
| `SK`                 | `LEARNED`                                             |
| `entityType`         | `LearnedPreferences`                                  |
| `topFoodsEaten`      | List<Map> (`{foodType, count, lastEatenAt}`)          |
| `topFoodsTossed`     | List<Map> (waste pattern, helps shopping suggestions) |
| `cuisineAffinity`    | Map (cuisine → 0–1 score)                             |
| `cookingFrequency`   | String (`rare` \| `weekly` \| `daily`)                |
| `eatingOutFrequency` | String                                                |
| `lastUpdatedAt`      | String                                                |

This is updated by the `learn-preferences` Lambda triggered on DynamoDB Streams (every 50 item events).

#### `Stats` — pre-aggregated stats per user/household

| Attribute           | Value                                   |
| ------------------- | --------------------------------------- |
| `PK`                | `USER#<userId>` (or `HOUSEHOLD#<id>`)   |
| `SK`                | `STATS#<period>` (e.g. `STATS#2026-04`) |
| `entityType`        | `Stats`                                 |
| `itemsAdded`        | Number                                  |
| `itemsEaten`        | Number                                  |
| `itemsTossed`       | Number                                  |
| `itemsFrozen`       | Number                                  |
| `wasteUsd`          | Number                                  |
| `aiClassifications` | Number                                  |
| `streakDays`        | Number                                  |

### Sample access patterns

| Access pattern                    | Query                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| Get user profile                  | `GetItem PK=USER#<id> SK=PROFILE`                            |
| Get all households for a user     | `Query GSI1 PK=USER#<id>` filter SK begins_with `HOUSEHOLD#` |
| Get all members of a household    | `Query PK=HOUSEHOLD#<id> SK begins_with MEMBER#`             |
| Get all containers in a household | `Query PK=HOUSEHOLD#<id> SK begins_with CONTAINER#`          |
| Get all items in a household      | `Query PK=HOUSEHOLD#<id> SK begins_with ITEM#`               |
| Get specific item                 | `GetItem PK=HOUSEHOLD#<id> SK=ITEM#<itemId>`                 |
| Items expiring in next 7 days     | `Query GSI2 PK=EXPIRING#<householdId> SK <= <now+7d>`        |
| Lookup container by QR token      | `Query GSI4 PK=QR_TOKEN#<token>`                             |
| Lookup invite by token            | `Query GSI4 PK=INVITE_TOKEN#<token>`                         |
| Lookup item by barcode            | `Query GSI4 PK=BARCODE#<barcode>`                            |
| User's own item history           | `Query GSI3 PK=USER_ITEMS#<userId> SK descending`            |
| Audit log for an item             | `Query PK=HOUSEHOLD#<id> SK begins_with EVENT#<itemId>#`     |
| All food rules                    | `Query PK=RULES SK begins_with FOOD#` (cached)               |

## Local DB (WatermelonDB)

WatermelonDB has its own schema mirroring the DynamoDB attributes. Differences:

- WatermelonDB uses lowercase snake_case column names per convention; we map to camelCase entities
- Local-only fields: `_status` (synced/created/updated/deleted), `_changed` (dirty fields)
- Sync metadata: `_version`, `_last_changed_at` mirror cloud
- Foreign keys are local row IDs (auto-incrementing), but a `cloud_id` (UUID) field maps to the DynamoDB ID

Schema file: `apps/mobile/src/db/schema.ts`. Models in `apps/mobile/src/db/models/`. Migration files versioned and never edited after release.

## Sync model

### Push (local → cloud)

1. Service layer mutation writes to WatermelonDB (sets `_status: created/updated/deleted`)
2. UI re-renders immediately (optimistic)
3. Sync engine batches dirty rows and pushes via AppSync mutation
4. AppSync increments cloud `_version` and writes
5. Mutation response → local row marked `_status: synced`, `_version` updated

### Pull (cloud → local)

1. On app foreground, background, and connectivity restored: query AppSync `delta` query with `lastSyncTimestamp`
2. AppSync returns rows where `_lastChangedAt > lastSyncTimestamp`
3. Apply deltas to local DB (insert / update / soft-delete)
4. Update local `lastSyncTimestamp`

### Real-time (cloud push → local)

When a household member is online, an AppSync subscription pushes changes:

- `onItemChanged(householdId)`
- `onContainerChanged(householdId)`
- `onShoppingListChanged(householdId)`

Subscription payloads are applied to local DB on receipt.

### Conflict resolution

Per-field rules:

| Field           | Rule                                                                       | Reason                                    |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| `quantityValue` | Sum deltas (custom Lambda resolver)                                        | Two users eat from same container offline |
| `status`        | Forward-only state machine: `active → partial → eaten/tossed`, server wins | Once eaten, can't become active           |
| `notes`         | Last-write-wins by `_lastChangedAt`                                        | User free text                            |
| `nickname`      | Last-write-wins                                                            |                                           |
| `expiryAt`      | Last-write-wins                                                            | User overrides                            |
| Everything else | Auto-merge by `_lastChangedAt`                                             | Default                                   |

Implementation: AppSync mutation handlers contain conflict-handling code; the merge happens server-side before write.

### Tombstones

Soft delete (`deletedAt` set) rather than DELETE. Tombstones retained 30 days then purged by `cleanup-tombstones` Lambda.

## Encryption

| Data                       | Where       | How                                                            |
| -------------------------- | ----------- | -------------------------------------------------------------- |
| DynamoDB at rest           | AWS         | KMS CMK, automatic annual rotation                             |
| S3 at rest                 | AWS         | SSE-KMS with bucket key                                        |
| In transit                 | Everywhere  | TLS 1.3                                                        |
| WatermelonDB on device     | Phone       | SQLCipher with key derived per-install (stored in SecureStore) |
| MMKV on device             | Phone       | Encryption mode with per-install key                           |
| Tokens                     | Phone       | iOS Keychain / Android Keystore via expo-secure-store          |
| Photos in transit (upload) | Client → S3 | TLS via pre-signed PUT URL                                     |

## Backup & retention

| Data                | Backup                              | Retention                               |
| ------------------- | ----------------------------------- | --------------------------------------- |
| DynamoDB            | PITR ON + AWS Backup daily snapshot | 35 days                                 |
| S3 photos           | Versioning ON                       | 30 days deleted markers                 |
| User exports        | Auto-expire                         | 7 days                                  |
| CloudTrail logs     | S3 with object lock                 | 1 year (compliance)                     |
| App logs            | CloudWatch Logs                     | 90 days hot, then S3 archive            |
| Audit (`ItemEvent`) | DynamoDB                            | Permanent (or until household deletion) |

## Data retention on user account deletion

When a user deletes their account:

1. Mark profile `deletedAt`
2. Step Function `delete-account-flow` runs:
   - For each household where user is sole owner → delete entire household + all items + all photos
   - For each household where user is a member → remove membership, leave data
   - Delete user's own profile record
   - Delete user's devices, preferences, learned preferences, stats
   - Delete S3 photos owned by user
   - Delete Cognito user
   - Write audit row `account.deleted`
3. Email confirmation
4. All complete within 30 days (GDPR requirement)

## Data retention on item deletion (soft → hard)

| Action                       | Soft delete (immediate)   | Hard delete (eventual)               |
| ---------------------------- | ------------------------- | ------------------------------------ |
| Item marked eaten            | No delete; keep for stats | Permanent (until household deletion) |
| Item marked tossed           | No delete; keep for stats | Permanent                            |
| User explicitly deletes item | `deletedAt` set           | 30 days later via cleanup            |
| Photo deleted                | `photoPath` cleared in DB | S3 lifecycle rule, 30 days           |

## Index design rationale

GSI2 is **sparse** (only set when status=active and expiryAt within 14 days). This:

- Keeps GSI tiny (only ~hundreds of items per household active at once)
- Eliminates need to filter at query time
- Cheap to maintain (only writes when item state changes)

GSI4 (lookup table) handles the "I have an external identifier, give me the item" pattern (QR tokens, invite tokens, barcodes) without scans.

## Migrations

DynamoDB has no schema; new attributes are added at write time. Backfills (if needed) run via a Lambda that scans the table and applies the migration. Migration scripts versioned in `infra/cdk/lib/migrations/`.

For WatermelonDB, schema migrations are versioned files; never edit a released migration.

## Cost projection by stage

| Users | Items/user | Total items | Storage | Monthly RCU/WCU         |
| ----- | ---------- | ----------- | ------- | ----------------------- |
| 1k    | 30         | 30k         | ~20 MB  | ~150K reads/100K writes |
| 10k   | 50         | 500k        | ~400 MB | ~2.5M / 1M              |
| 100k  | 80         | 8M          | ~6 GB   | ~30M / 12M              |

Even at 100k users, Dynamo cost is well under $1k/month with on-demand pricing.

## Cross-references

- API contract that exposes this data → [03_API_SPEC.md](03_API_SPEC.md)
- Security policies on data access → [04_SECURITY.md](04_SECURITY.md)
- AI tables and prompt versioning → [06_AI_INTEGRATION.md](06_AI_INTEGRATION.md)
