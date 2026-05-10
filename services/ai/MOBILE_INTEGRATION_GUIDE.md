# 📱 Mobile Integration Guide (W6 Implementation)

**Purpose**: Exact specifications for mobile app integration with AI Lambda  
**Owner**: W6 Mobile Team  
**Consumers**: End users (iOS/Android)  
**Dependencies**: W5 (S3 upload), W2 (AppSync mutations), W4 (Lambda)

---

## Overview

The AI classification flow happens in this order:

```
1. User takes photo with camera
2. Photo saved locally (WatermelonDB)
3. Photo uploaded to S3 (via pre-signed URL from W5)
4. Mobile calls AppSync mutation: classifyItemPhoto
5. Lambda classifies food via Bedrock
6. Mobile receives classification response
7. If confidence < 0.6: Show picker UI (user selects alternative)
8. If confidence ≥ 0.6: Display classification directly
9. Store result in WatermelonDB (W8 syncs to server)
10. W7 aggregates cost and displays in settings
```

---

## Implementation Checklist

### Phase 1: Camera Capture (Week 1)

**Screens to Implement:**

- [ ] Item detail screen with "Add Photo" button
- [ ] Camera view (photo capture)
- [ ] Photo confirmation dialog (retake or proceed)
- [ ] Loading state (during upload + classification)

**Camera Implementation:**

```typescript
// Use react-native-camera or expo-camera
import { Camera } from 'expo-camera';

// User taps "Add Photo" button
// → Show camera view
// → User takes photo (or selects from library)
// → Show preview with "Retake" / "Use Photo" buttons
// → User taps "Use Photo"
// → Proceed to upload + classify
```

**User Flow:**

```
Item Detail Screen
  ↓
[Add Photo Button]
  ↓
Camera Screen (show live preview)
  ↓
User taps capture icon
  ↓
Photo Preview (with Retake / Proceed buttons)
  ↓
User taps Proceed
  ↓
Upload to S3 + Classify
```

### Phase 2: S3 Upload (Week 1-2)

**Implementation:**

```typescript
import { uploadItemPhoto } from '@wfl/services/S3Service';

// 1. Get pre-signed URL from W5
const presignedUrl = await getPresignedUrl(itemId);

// 2. Upload photo to S3
const photoKey = await uploadItemPhoto({
  presignedUrl,
  photoUri: cameraPhoto.uri,
  itemId: item.id,
});

// Expected photoKey: s3://wfl-photos/items/item-123.jpg

// 3. Store photoPath in item (WatermelonDB)
await item.update({ photoPath: photoKey });
```

**Error Handling:**

```typescript
try {
  const photoKey = await uploadItemPhoto({...});
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Show: "Network error. Check connection and retry."
    // Provide retry button
  } else if (error.code === 'S3_UNAUTHORIZED') {
    // Pre-signed URL expired, get new one and retry
  } else {
    // Unexpected error, show generic message
  }
}
```

### Phase 3: AppSync Mutation Call (Week 2)

**Implementation:**

```typescript
import { gql, useMutation } from '@apollo/client';

const CLASSIFY_ITEM_PHOTO = gql`
  mutation ClassifyItemPhoto($input: ClassifyItemPhotoInput!) {
    classifyItemPhoto(input: $input) {
      classification {
        foodType
        foodName
        daysSafe
        confidence
        reasoning
        alternatives {
          foodType
          confidence
        }
        visualWarning
      }
      latencyMs
      costUsd
    }
  }
`;

// In component:
const [classifyMutation] = useMutation(CLASSIFY_ITEM_PHOTO);

async function handleClassifyPhoto() {
  try {
    // Show loading state
    setIsLoading(true);

    // Call mutation
    const response = await classifyMutation({
      variables: {
        input: {
          photoPath: item.photoPath,
          itemId: item.id,
          hint: userHint || null,
          storageLocation: item.location || 'fridge',
          userTimeZone: timezone.current,
        },
      },
    });

    const classification = response.data.classifyItemPhoto;

    // Handle response (see next section)
    handleClassificationResponse(classification);
  } catch (error) {
    handleClassificationError(error);
  } finally {
    setIsLoading(false);
  }
}
```

**Expected Response:**

```json
{
  "classifyItemPhoto": {
    "classification": {
      "foodType": "leftover_pasta",
      "foodName": "Leftover pasta (cooked)",
      "daysSafe": 3,
      "confidence": 0.92,
      "reasoning": "Cooked pasta stored in refrigerator. Typically safe for 3 days.",
      "alternatives": [],
      "visualWarning": null
    },
    "latencyMs": 1240,
    "costUsd": 0.0012
  }
}
```

### Phase 4: Classification Display (Week 2)

**High Confidence (≥0.6):**

```typescript
// Display classification directly to user

<ClassificationResult
  foodName={classification.foodName}
  daysSafe={classification.daysSafe}
  confidence={classification.confidence}
  reasoning={classification.reasoning}
  visualWarning={classification.visualWarning}
/>

// Result layout:
// ┌─────────────────────────────┐
// │ 🍝 Leftover pasta (cooked)  │  ← foodName
// ├─────────────────────────────┤
// │ Safe for 3 more days        │  ← daysSafe
// │ Confidence: 92%             │  ← confidence
// ├─────────────────────────────┤
// │ Cooked pasta stored in       │
// │ refrigerator. Typically      │  ← reasoning
// │ safe for 3 days.            │
// ├─────────────────────────────┤
// │ [Confirm] [Change Photo]    │
// └─────────────────────────────┘

// When user taps Confirm:
await item.update({
  classification,
  classifiedAt: new Date(),
  userConfirmed: true,
});
```

**Low Confidence (<0.6):**

```typescript
// Show picker UI for user to select from alternatives

<ClassificationPicker
  alternatives={classification.alternatives}
  onSelect={(foodType) => handleAlternativeSelected(foodType)}
  onRetake={() => resetCameraFlow()}
/>

// Picker UI:
// ┌──────────────────────────────────┐
// │ Not sure about this food.        │
// │ Can you help us identify it?     │
// ├──────────────────────────────────┤
// │ ⭕ Leftover rice       (35%)      │
// │ ⭕ Leftover pasta      (23%)      │
// │ ⭕ Soup                (20%)      │
// ├──────────────────────────────────┤
// │ [Select Above] [Take New Photo] │
// └──────────────────────────────────┘

// When user selects alternative:
async function handleAlternativeSelected(foodType) {
  // Update mutation to record user's selection
  await updateItemClassification({
    itemId: item.id,
    foodType: foodType,
    userSelected: true,
  });

  // Update item with user's selection
  await item.update({
    classification: {
      ...classification,
      foodType,
      userSelected: true,
    },
  });
}
```

**Visual Warnings:**

```typescript
// If classification.visualWarning is not null, show warning

const warningConfig = {
  MOLD: {
    icon: '⚠️',
    title: 'Possible Mold',
    message: 'This food may have mold. Do not eat.',
    color: 'red',
  },
  DISCOLORATION: {
    icon: '⚠️',
    title: 'Discoloration',
    message: 'This food shows discoloration. Use caution.',
    color: 'orange',
  },
  FREEZER_BURN: {
    icon: '❄️',
    title: 'Freezer Burn',
    message: 'This food has freezer burn but may still be safe.',
    color: 'blue',
  },
  OFF_ODOR: {
    icon: '👃',
    title: 'Possible Off-Odor',
    message: 'This food may smell off. Verify before eating.',
    color: 'orange',
  },
};

if (classification.visualWarning) {
  const warning = warningConfig[classification.visualWarning];
  <WarningBanner {...warning} />;
}
```

### Phase 5: Error Handling (Week 2)

**Retryable Errors:**

```typescript
// Errors with retryable: true should show "Retry" button

const retryableErrors = [
  'BEDROCK_RATE_LIMIT',      // Too many requests
  'BEDROCK_TIMEOUT',         // Bedrock slow
  'BEDROCK_MODEL_ERROR',     // Bedrock service error
  'TEXTRACT_TIMEOUT',        // OCR slow
  'DYNAMODB_THROTTLED',      // DB overloaded
];

function handleClassificationError(error) {
  const errorCode = error.extensions?.code;
  const retryable = error.extensions?.retryable;

  if (retryable) {
    // Show: "Something went wrong. [Retry]"
    <ErrorBanner
      message="Unable to classify. Please retry."
      actions={[
        { label: 'Retry', action: () => classifyMutation() },
        { label: 'Change Photo', action: () => resetCameraFlow() },
      ]}
    />;
  } else {
    // Show: "Error message. [Change Photo]"
    switch (errorCode) {
      case 'INVALID_INPUT':
        setErrorMessage('Missing required information.');
        break;
      case 'S3_NOT_FOUND':
        setErrorMessage('Photo upload failed. Please try again.');
        break;
      case 'TEXTRACT_INVALID_IMAGE':
        setErrorMessage('Photo is too blurry. Please retake.');
        break;
      case 'QUOTA_EXCEEDED':
        setErrorMessage('Daily limit reached. Upgrade to premium.');
        break;
      default:
        setErrorMessage('Unable to classify. Please try again.');
    }
  }
}
```

### Phase 6: Loading States (Week 2)

**Three Loading States:**

```typescript
enum ClassificationState {
  INITIAL,           // Show camera button
  UPLOADING,         // "Uploading photo..."
  CLASSIFYING,       // "Analyzing food..."
  COMPLETE,          // Show result
  ERROR,             // Show error message
}

// Uploading state:
<LoadingScreen
  message="Uploading photo..."
  progress={40}  // S3 upload progress
/>

// Classifying state:
<LoadingScreen
  message="Analyzing food..."
  progress={80}  // After S3 upload, before Lambda response
  estimatedTime="About 2 seconds..."
/>

// Loading animation options:
// - Spinner with text
// - Progress bar with percentage
// - Animated food icons
// - Skeleton screens
```

---

## API Contract

### Input Parameters

**classifyItemPhoto:**

```typescript
interface ClassifyItemPhotoInput {
  photoPath: string; // S3 path: "s3://wfl-photos/items/item-123.jpg"
  itemId: string; // Item ID from WatermelonDB
  hint?: string; // User's optional guess (max 100 chars)
  storageLocation?: string; // "fridge" | "freezer" | "pantry" | "counter" | "lunchbox"
  userTimeZone?: string; // IANA timezone (e.g., "America/Los_Angeles")
}
```

**ocrExpiryDate:**

```typescript
interface OcrExpiryDateInput {
  photoPath: string; // S3 path of product packaging photo
  itemId: string; // Item ID from WatermelonDB
}
```

### Response Format

**Success Response:**

```typescript
interface ClassifyItemPhotoResponse {
  classification: {
    foodType: string; // e.g., "leftover_pasta"
    foodName: string; // e.g., "Leftover pasta (cooked)"
    daysSafe: number; // e.g., 3
    confidence: number; // 0.0 to 1.0
    reasoning: string; // e.g., "Cooked pasta in fridge..."
    alternatives: Array<{
      foodType: string;
      confidence: number;
    }>;
    visualWarning?: string; // null | "MOLD" | "LOW_CONFIDENCE_PICKER" | ...
  };
  latencyMs: number; // e.g., 1240
  costUsd: number; // e.g., 0.0012
}
```

**Error Response:**

```typescript
interface ErrorResponse {
  errors: Array<{
    message: string; // e.g., "QUOTA_EXCEEDED: Free tier limit reached"
    extensions?: {
      code: string; // e.g., "QUOTA_EXCEEDED"
      retryable: boolean;
      httpStatusCode: number; // 400, 404, 429, 500, etc.
    };
  }>;
}
```

---

## Local Storage (WatermelonDB)

**Item Schema Updates:**

```typescript
// Add these fields to Item model:
{
  // Photo
  photoPath?: string;              // "s3://wfl-photos/items/item-123.jpg"

  // Classification
  classification?: {
    foodType: string;
    foodName: string;
    daysSafe: number;
    confidence: number;
    reasoning: string;
    alternatives: Array<{foodType, confidence}>;
    visualWarning?: string;
  };

  // Metadata
  classifiedAt?: Date;             // When classification happened
  userConfirmed?: boolean;         // Whether user confirmed result
  userSelected?: boolean;          // Whether user selected from picker

  // Cost tracking (aggregated by W7)
  classificationCostUsd?: number;  // Cost to classify this item
  ocrCostUsd?: number;             // Cost if OCR was used

  // Sync state
  _needsSync?: boolean;            // If true, sync to server when online
  _lastSyncedAt?: Date;
}
```

---

## Quota Display

**Quota Check Before Classification:**

```typescript
async function checkQuotaBeforeClassify() {
  try {
    const quota = await apolloClient.query({
      query: GET_USER_QUOTA,
    });

    const remaining = quota.classify_food.remaining;

    if (remaining <= 0) {
      // Show: "Daily limit reached. Upgrade to premium."
      showUpgradeDialog();
      return false;
    }

    if (remaining <= 2) {
      // Show: "You have 2 classifications left today."
      showWarning(`Only ${remaining} left today`);
    }

    return true;
  } catch (error) {
    // If quota check fails, allow classification (assume quota OK)
    // Quota enforcement happens server-side
    return true;
  }
}
```

---

## Cost Display

**Cost Aggregation (for W7):**

```typescript
// After classification, cost is returned:
const cost = response.classifyItemPhoto.costUsd;

// Store in item:
await item.update({ classificationCostUsd: cost });

// W7 aggregates monthly cost:
const allClassifications = await Item.query().where('classifiedAt').greaterThan(monthStart).fetch();

const totalCost = allClassifications.reduce(
  (sum, item) => sum + (item.classificationCostUsd || 0),
  0,
);

// Display in settings: "Used: $12.34 this month"
```

---

## Network & Offline Handling

**Offline Detection:**

```typescript
import NetInfo from '@react-native-community/netinfo';

// Before classifying, check connectivity
const state = await NetInfo.fetch();

if (!state.isConnected) {
  // Show: "No internet connection. Please check your connection."
  return false;
}

// Fallback during classification failure:
// If classification fails due to network error,
// allow local save without result
await item.update({
  photoPath: s3Path,
  _needsSync: true, // Retry when online
});
```

**Sync on Reconnect:**

```typescript
// W8 handles sync, but mobile should detect reconnection:
NetInfo.addEventListener((state) => {
  if (state.isConnected && itemsAwaitingSync.length > 0) {
    // Trigger sync with server
    syncPendingItems();
  }
});
```

---

## Accessibility

**Required:**

- [ ] Alt text for all images ("Photo of food", "Loading indicator")
- [ ] Color contrast (warning colors visible to color-blind users)
- [ ] Touch targets ≥48pt (buttons, buttons, icons)
- [ ] Keyboard navigation (camera, picker, buttons)
- [ ] Screen reader support (VoiceOver, TalkBack)
- [ ] Haptic feedback (vibration on success/error)

**Example:**

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Take photo of food"
  accessibilityHint="Opens camera to capture food photo for classification"
  onPress={openCamera}
>
  <Icon name="camera" />
</TouchableOpacity>
```

---

## Testing Checklist

**Unit Tests:**

- [ ] classifyItemPhoto mutation called with correct input
- [ ] Response parsed correctly (classification, latency, cost)
- [ ] Error responses handled correctly (retryable vs non-retryable)
- [ ] Quota display calculated correctly
- [ ] Cost stored in WatermelonDB

**Integration Tests:**

- [ ] Photo uploaded to S3 before classification
- [ ] S3 photoPath passed to AppSync mutation
- [ ] Classification response displays correctly
- [ ] Picker UI shows for confidence < 0.6
- [ ] Visual warnings displayed for low confidence
- [ ] Item updated in WatermelonDB after classification

**E2E Tests:**

- [ ] Full flow: Camera → Upload → Classify → Display
- [ ] Low confidence flow: Classify → Picker UI → Select → Save
- [ ] Error handling: Retry on rate limit, show error message
- [ ] Offline: Can take photo but can't classify without internet
- [ ] Quota: Show message when limit reached

---

## Deployment Checklist

**Before Phase C Day 8 (Mobile E2E Testing):**

- [ ] Camera component integrated
- [ ] S3 upload working with pre-signed URLs
- [ ] AppSync mutation calls wired
- [ ] Classification display implemented
- [ ] Low confidence picker UI implemented
- [ ] Visual warning displays implemented
- [ ] Error handling with retry logic
- [ ] Loading states shown during upload/classify
- [ ] Cost tracking stored in WatermelonDB
- [ ] Quota check before classification
- [ ] Offline handling (can take photos, message when offline)
- [ ] All unit/integration tests passing
- [ ] E2E test of full flow passing

**Phase C Day 8: End-to-End Testing with Real AWS:**

- [ ] Tester takes photo with camera
- [ ] Photo uploads to S3 successfully
- [ ] Lambda classification returned within 3 seconds
- [ ] Classification displays on mobile
- [ ] Low confidence triggers picker UI
- [ ] User selects alternative, saved correctly
- [ ] Cost displayed correctly
- [ ] WatermelonDB syncs to server (W8)

---

## Troubleshooting

**Photo Upload Slow:**

- [ ] Check S3 pre-signed URL not expired
- [ ] Check network bandwidth
- [ ] Try WiFi instead of cellular
- [ ] If >1MB, consider compression

**Classification Timeout (>5 sec):**

- [ ] Bedrock may be slow or rate limited
- [ ] Show retry option to user
- [ ] Log latency for debugging

**Picker UI Not Showing:**

- [ ] Verify confidence < 0.6 in response
- [ ] Check visualWarning === "LOW_CONFIDENCE_PICKER"
- [ ] Ensure alternatives array is populated

**Cost Not Displaying:**

- [ ] Verify costUsd is in response
- [ ] Check it's stored in WatermelonDB
- [ ] W7 should query and aggregate

---

**Last Updated**: 2026-04-28  
**Phase C Target**: Day 8-9 (Mobile Integration)  
**Owner**: W6 Mobile Team
