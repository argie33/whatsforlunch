# W6 Extended — AI Integration & Photo Upload

**Date**: 2026-04-28  
**Status**: Implementation Complete  
**Phase**: Photo upload and AI classification wiring

---

## ✅ Completed Components

### 1. GraphQL Mutations — Photo AI Processing

**File**: `infra/cdk/lib/appsync/schema.graphql`

Added two new mutations for AI processing:

```graphql
mutation classifyFood(householdId: UUID!, photoUrl: AWSURL!): Item!
mutation ocrExpiryDate(householdId: UUID!, photoUrl: AWSURL!): String!
```

Both mutations require household access check and invoke Lambda functions (from W4 AI Stack).

---

### 2. GraphQL Query Documents

**File**: `apps/mobile/src/db/graphql.ts`

Added GraphQL documents for client-side calls:

```typescript
export const CLASSIFY_FOOD = /* GraphQL */ `
  ${ITEM_FIELDS}
  mutation ClassifyFood($householdId: UUID!, $photoUrl: AWSURL!) {
    classifyFood(householdId: $householdId, photoUrl: $photoUrl) {
      ...ItemFields
    }
  }
`;

export const OCR_EXPIRY_DATE = /* GraphQL */ `
  mutation OcrExpiryDate($householdId: UUID!, $photoUrl: AWSURL!) {
    ocrExpiryDate(householdId: $householdId, photoUrl: $photoUrl)
  }
`;
```

---

### 3. ItemsService — AI Methods

**File**: `apps/mobile/src/services/ItemsService.ts`

Implemented two new methods that call the backend AI Lambdas:

```typescript
async classifyPhoto(db: Database, householdId: string, photoUrl: string): Promise<Item | null>
// Calls classifyFood mutation, upserts result into local DB, returns Item

async ocrExpiryDate(householdId: string, photoUrl: string): Promise<string | null>
// Calls ocrExpiryDate mutation, returns ISO date string or null
```

Both methods:

- Use `generateClient()` from aws-amplify/api
- Call corresponding GraphQL mutations
- Handle errors gracefully with console logging
- Return null on failure (non-blocking)

---

### 4. PhotoUploadService — Photo Handling

**File**: `apps/mobile/src/services/PhotoUploadService.ts` (NEW)

Handles photo upload to S3:

```typescript
async uploadPhoto(filePath: string): Promise<string>
// Converts local photo to base64
// Uploads to S3 via Amplify Storage
// Returns public S3 URL (or data: URL for local dev)

async deletePhoto(photoUrl: string): Promise<void>
// Deletes photo from S3 if not a data: URL
// Safe no-op in local dev mode
```

Features:

- Automatic base64 encoding via `expo-file-system`
- Generates unique filenames with random UUID
- Fallback to data: URLs for local development
- Error handling for S3 failures (graceful degradation)

---

### 5. UI Integration — Photo Classification

**File**: `apps/mobile/app/(main)/items/new.tsx`

Wired photo capture flow:

1. User captures photo in ScanScreen
2. Photo is passed to NewItemScreen via route params
3. Photo is uploaded to S3 (or stored as data: URL)
4. AI classification triggered automatically:
   - **Photo mode**: Classifies food → prefills foodName + category + storageLocation
   - **Date mode**: OCR extracts expiry date → prefills expiryDays
5. Form shows AI processing spinner while classifying
6. AddItemSheet receives prefilled data
7. User can override AI suggestions before saving

Data flow:

```
Camera capture
  ↓
ScanScreen captures photo
  ↓
NewItemScreen receives prefillPhotoPath
  ↓
photoUploadService.uploadPhoto() → S3/data URL
  ↓
itemsService.classifyPhoto() or ocrExpiryDate()
  ↓
setPrefill() with AI results
  ↓
AddItemSheet displays prefilled form
  ↓
User confirms or edits
  ↓
itemsService.createItem() with AI-prefilled data
```

---

### 6. AddItemSheet Updates

**File**: `apps/mobile/src/features/items/AddItemSheet.tsx`

Enhanced AddItemPrefill interface:

```typescript
interface AddItemPrefill {
  foodName?: string;
  storageLocation?: StorageLocation;
  expiryDays?: number;
  quantityText?: string;
  barcode?: string;
  photoUrl?: string; // NEW
  category?: string; // NEW
}
```

Updated form submission:

- Includes photoUrl if provided
- Uses AI-detected category if available
- Sets expirySource to 'ai' if category was detected (not user-entered)
- Falls back to 'barcode' or 'user' for other sources

---

## 🔌 API Resolvers (Already Implemented)

From `infra/cdk/lib/stacks/api-stack.ts`:

- **classifyFood**: Pipeline [checkMember → classifyFoodDataFn] → Lambda
- **ocrExpiryDate**: Pipeline [checkMember → ocrExpiryDataFn] → Lambda

Both resolvers:

- Check household membership
- Invoke W4 Lambdas with photo URL
- Return results directly to client
- Automatic retry with exponential backoff

---

## 📊 Data Flow — AI Classification

### Photo Classification Flow

```
User taps "Photo" button
  ↓
ScanScreen camera captures
  ↓
takePhoto() → returns file path
  ↓
router.push(/items/new, params: {prefillPhotoPath})
  ↓
NewItemScreen receives prefillPhotoPath
  ↓
photoUploadService.uploadPhoto(filePath)
  ↓
[LOCAL]: converts to data: URL
[PROD]: uploads to S3, returns https://...
  ↓
itemsService.classifyPhoto(db, householdId, photoUrl)
  ↓
calls classifyFood mutation → W4 Lambda processes image
  ↓
Lambda returns Item with foodName + category + storageLocation
  ↓
repo.upsertFromCloud(item)
  ↓
setPrefill() with classification results
  ↓
AddItemSheet displays prefilled form
  ↓
User confirms → createItem() with expirySource: 'ai'
```

### Expiry Date OCR Flow

```
User taps "Date" button
  ↓
ScanScreen camera captures (photo of expiry date)
  ↓
takePhoto() → returns file path
  ↓
router.push(/items/new, params: {prefillSource: 'date'})
  ↓
NewItemScreen receives prefillPhotoPath
  ↓
photoUploadService.uploadPhoto(filePath) → S3/data URL
  ↓
itemsService.ocrExpiryDate(householdId, photoUrl)
  ↓
calls ocrExpiryDate mutation → W4 Lambda performs OCR
  ↓
Lambda returns ISO date string (e.g., "2026-05-15")
  ↓
Calculate daysUntilExpiry
  ↓
setPrefill() with expiryDays
  ↓
AddItemSheet displays prefilled form
  ↓
User confirms → createItem() with expirySource: 'ocr'
```

---

## 🚀 Testing Checklist

### Photo Classification

- [ ] Open AddItemSheet → tap "Photo"
- [ ] Capture photo of food item
- [ ] Verify classifying spinner shows
- [ ] Verify food name auto-fills
- [ ] Verify storage location is suggested
- [ ] User can override suggestions
- [ ] Save item → verify expirySource: 'ai'

### Expiry Date OCR

- [ ] Open AddItemSheet → tap "Date"
- [ ] Capture photo of expiry date
- [ ] Verify classifying spinner shows
- [ ] Verify expiryDays is populated
- [ ] User can adjust the date
- [ ] Save item → verify expirySource: 'ocr'

### Graceful Degradation

- [ ] If AI classification fails → form still works with empty fields
- [ ] If S3 upload fails → fallback to data: URL
- [ ] If photo upload fails → error logged but form usable

### Integration

- [ ] Classified items show in dashboard
- [ ] Classification confidence tracked (\_version)
- [ ] Real-time sync updates onItemUpdate subscription
- [ ] Multi-user classification sharing via household

---

## 📝 Code Quality

✅ All mutations use consistent error handling (try/catch)  
✅ No direct S3 calls in UI (wrapped in PhotoUploadService)  
✅ AI methods follow same async pattern as other services  
✅ TypeScript types for all AI responses  
✅ Non-blocking AI failures (graceful degradation)  
✅ Photo URLs included in item prefill  
✅ Optimistic UI updates with processing spinner  
✅ expirySource tracking for analytics (ai vs ocr vs barcode vs user)

---

## 🔄 Next Steps

### Immediate

1. **Test locally** with photo/date capture
2. **Verify Lambda responses** match Item schema
3. **Test error handling** (network failures, invalid images)

### Phase C+ (Future)

1. **Photo storage optimization** (compression, resize)
2. **Confidence scoring** (show confidence % to user)
3. **User corrections feedback** (send corrections to retrain)
4. **Bulk photo classification** (classify multiple items)
5. **Photo library** (browse past photos)
6. **Multi-language OCR** (non-English dates)

---

## 📈 Metrics to Track

- [ ] AI classification success rate
- [ ] Average OCR confidence score
- [ ] User override rate (how often users correct AI)
- [ ] Time to classify (benchmark P50/P95)
- [ ] Fallback rate (data: URL vs S3)
- [ ] Error rate by Lambda

---

**Status**: ✅ W6 Extended implementation complete. Ready for local testing against local Lambdas.
