# 🔌 AI Lambda API Reference

**Version**: 1.0  
**Last Updated**: 2026-04-27  
**Status**: Phase C Ready

---

## Table of Contents

1. [classify-food Lambda](#classify-food-lambda)
2. [ocr-expiry-date Lambda](#ocr-expiry-date-lambda)
3. [image-resize Lambda](#image-resize-lambda)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Cost Tracking](#cost-tracking)

---

## classify-food Lambda

### Purpose
Classify food in a photo and estimate days until expiration based on storage location.

### Endpoint
```
Function Name: classify-food-lambda
Region: us-east-1
Timeout: 30s
Memory: 512MB (tunable)
```

### Request Format

**Via AppSync GraphQL Mutation:**
```graphql
mutation {
  classifyItemPhoto(
    photoPath: "s3://wfl-photos/items/abc123.jpg"
    itemId: "item-456"
    hint: "Leftover pasta"
    storageLocation: "fridge"
    userTimeZone: "America/Los_Angeles"
  ) {
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
}
```

**Direct Lambda Invocation:**
```json
{
  "arguments": {
    "photoPath": "s3://wfl-photos/items/abc123.jpg",
    "userId": "user-123",
    "householdId": "household-456",
    "itemId": "item-789",
    "storageLocation": "fridge",
    "userHint": "Leftover pasta",
    "userTimeZone": "America/Los_Angeles"
  },
  "identity": {
    "sub": "user-123",
    "claims": {
      "email": "user@example.com"
    },
    "requestId": "request-abc123"
  }
}
```

### Response Format

**Success (200):**
```json
{
  "classification": {
    "foodType": "leftover_pasta",
    "foodName": "Leftover pasta (cooked)",
    "daysSafe": 3,
    "confidence": 0.92,
    "reasoning": "Cooked pasta stored in refrigerator. Typically safe for 3 days. High confidence based on appearance.",
    "alternatives": [
      {
        "foodType": "leftover_rice",
        "confidence": 0.05
      },
      {
        "foodType": "bread",
        "confidence": 0.03
      }
    ],
    "visualWarning": null
  },
  "latencyMs": 1240,
  "costUsd": 0.0012
}
```

**Low Confidence (User Needs to Pick):**
```json
{
  "classification": {
    "foodType": "unknown_mixed_dish",
    "foodName": "Mixed dish (please select type)",
    "daysSafe": 1,
    "confidence": 0.42,
    "reasoning": "Image unclear. Unable to confidently identify food type. Please select from alternatives.",
    "alternatives": [
      {
        "foodType": "leftover_rice",
        "confidence": 0.35
      },
      {
        "foodType": "leftover_pasta",
        "confidence": 0.23
      },
      {
        "foodType": "soup",
        "confidence": 0.20
      }
    ],
    "visualWarning": "low_confidence_picker"
  },
  "latencyMs": 1850,
  "costUsd": 0.0015
}
```

**With Visual Warning:**
```json
{
  "classification": {
    "foodType": "leftover_chicken",
    "foodName": "Leftover chicken (CAUTION: possible mold)",
    "daysSafe": 0,
    "confidence": 0.87,
    "reasoning": "Mold detected on surface. Not safe to eat.",
    "alternatives": [],
    "visualWarning": "mold"
  },
  "latencyMs": 1120,
  "costUsd": 0.0009
}
```

### Request Parameters

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| photoPath | string | Yes | - | S3 URI (s3://bucket/key) |
| userId | string | Yes | - | User ID from identity |
| householdId | string | Yes | - | Household UUID |
| itemId | string | No | - | Item ID in household |
| storageLocation | enum | No | "fridge" | fridge, freezer, pantry, counter, lunchbox |
| userHint | string | No | null | User's guess about food type |
| userTimeZone | string | No | "UTC" | IANA timezone (America/Los_Angeles, etc.) |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| classification.foodType | string | Standardized food type (leftover_pasta, apple, etc.) |
| classification.foodName | string | Human-readable food name |
| classification.daysSafe | number | Days until food is unsafe (0 = eat immediately, 3 = wait 3 days) |
| classification.confidence | number | 0.0-1.0 confidence in classification |
| classification.reasoning | string | Why the model made this classification |
| classification.alternatives | array | Alternative classifications with confidence scores |
| classification.visualWarning | enum | null, "low_confidence_picker", "mold", "discoloration", "freezer_burn" |
| latencyMs | number | Milliseconds to invoke Bedrock and return |
| costUsd | number | Cost to run this classification ($0.0008-0.0015) |

### Visual Warnings

```typescript
enum VisualWarning {
  null,                      // No warning
  low_confidence_picker,     // Confidence < 0.6, show picker
  mold,                      // Mold detected
  discoloration,             // Discoloration detected
  freezer_burn,              // Freezer burn detected
  liquid_separation,         // Liquid separation (spoilage)
  off_odor,                  // Model detects off smell (text description)
}
```

### Error Responses

```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Free tier quota (10/day) exceeded",
    "retryable": false
  },
  "statusCode": 429
}
```

### Examples

**Example 1: Classify Leftover in Fridge**
```typescript
const response = await client.mutate({
  mutation: gql`
    mutation {
      classifyItemPhoto(
        photoPath: "s3://wfl-photos/item-123.jpg"
        itemId: "item-123"
      ) {
        foodType
        daysSafe
        confidence
        visualWarning
      }
    }
  `,
});

// Response:
// {
//   classification: {
//     foodType: "leftover_pasta",
//     daysSafe: 3,
//     confidence: 0.92,
//     visualWarning: null
//   }
// }

// Display: "Leftover pasta - Safe for 3 more days"
```

**Example 2: Low Confidence - Show Picker**
```typescript
if (response.classification.confidence < 0.6) {
  // Show picker UI
  const selected = await showPicker(response.classification.alternatives);
  // User selects: leftover_rice
  // Save as: { foodType: "leftover_rice", userSelected: true }
}
```

---

## ocr-expiry-date Lambda

### Purpose
Extract expiry date from product packaging using OCR + AI parsing.

### Endpoint
```
Function Name: ocr-expiry-date-lambda
Region: us-east-1
Timeout: 30s
Memory: 512MB (tunable)
```

### Request Format

**Via AppSync GraphQL Mutation:**
```graphql
mutation {
  ocrExpiryDate(
    photoPath: "s3://wfl-photos/package-456.jpg"
    itemId: "item-789"
  ) {
    expiryDate {
      detectedDates
      bestGuess
      confidence
      reasoning
    }
    latencyMs
    costUsd
  }
}
```

**Direct Lambda Invocation:**
```json
{
  "arguments": {
    "photoPath": "s3://wfl-photos/package-456.jpg",
    "userId": "user-123",
    "householdId": "household-456",
    "itemId": "item-789"
  },
  "identity": {
    "sub": "user-123",
    "requestId": "request-xyz789"
  }
}
```

### Response Format

**Success with High Confidence:**
```json
{
  "expiryDate": {
    "detectedDates": [
      "2026-05-15",
      "2026-05-16"
    ],
    "bestGuess": "2026-05-15",
    "confidence": 0.96,
    "reasoning": "Found 'BEST BY 05/15/2026' on packaging. High confidence."
  },
  "latencyMs": 850,
  "costUsd": 0.0001
}
```

**Fallback to Bedrock (Low Textract Confidence):**
```json
{
  "expiryDate": {
    "detectedDates": [
      "2026-06-01"
    ],
    "bestGuess": "2026-06-01",
    "confidence": 0.72,
    "reasoning": "Textract confidence low (0.68). Bedrock inference: date format 'JUN 01, 2026'. Moderate confidence."
  },
  "latencyMs": 2150,
  "costUsd": 0.0008
}
```

**No Date Found:**
```json
{
  "expiryDate": {
    "detectedDates": [],
    "bestGuess": null,
    "confidence": 0.0,
    "reasoning": "No date found on packaging. User should check manually."
  },
  "latencyMs": 620,
  "costUsd": 0.00005
}
```

### Date Formats Supported

The parser recognizes:
- **MM/DD/YYYY** (05/15/2026)
- **DD/MM/YYYY** (15/05/2026)
- **YYYY-MM-DD** (2026-05-15)
- **Month Day Year** (May 15, 2026)

### Keywords Recognized

- BEST BY
- BEST BEFORE
- USE BY
- SELL BY
- EXPIRES
- CONSUME BY
- EXP

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| expiryDate.detectedDates | array<string> | All dates found (YYYY-MM-DD format) |
| expiryDate.bestGuess | string | Most likely expiry date (YYYY-MM-DD) |
| expiryDate.confidence | number | 0.0-1.0 confidence in date |
| expiryDate.reasoning | string | Why the date was selected |
| latencyMs | number | Textract (200-500ms) + optional Bedrock (1500-2000ms) |
| costUsd | number | Free tier Textract + optional Haiku ($0.0001-0.0008) |

### Error Responses

```json
{
  "error": {
    "code": "TEXTRACT_INVALID_IMAGE",
    "message": "Image too blurry for OCR",
    "retryable": true
  },
  "statusCode": 400
}
```

### Examples

**Example 1: Clear Date on Packaging**
```typescript
const response = await client.mutate({
  mutation: gql`mutation { ocrExpiryDate(photoPath: $path, itemId: $id) }`
});

// Response: bestGuess = "2026-05-15", confidence = 0.96

// Display: "Expires May 15, 2026 (28 days from now)"
```

**Example 2: Fallback to Bedrock**
```typescript
// Textract confidence < 0.7, triggers Bedrock
// latencyMs will be higher (~2s instead of 0.5s)
// Cost will be ~$0.0008 instead of free

// But user still gets date (just with moderate confidence)
```

---

## image-resize Lambda

### Purpose
Resize photos to 1024px max, strip EXIF, compress to JPEG q70.

### Event Trigger
```
S3 bucket: wfl-photos
Event: ObjectCreated
Filter: prefix=items/, suffix=.jpg|.png
```

### Process Flow

1. User uploads photo to S3
2. S3 puts object: `s3://wfl-photos/items/item-123.jpg`
3. Lambda triggered automatically
4. Lambda downloads original
5. Sharp resizes + compresses
6. Lambda uploads: `s3://wfl-photos/items/item-123-resized.jpg`
7. Lambda updates DynamoDB item metadata

### Example Invocation

**S3 Event (Automatic):**
```json
{
  "Records": [
    {
      "s3": {
        "bucket": {
          "name": "wfl-photos"
        },
        "object": {
          "key": "items/item-123.jpg"
        }
      },
      "eventName": "ObjectCreated:Put"
    }
  ]
}
```

### Resizing Behavior

| Input | Output |
|-------|--------|
| 4000×3000 (12MB) | 1024×768 (250KB) ✅ |
| 2000×2000 (8MB) | 1024×1024 (200KB) ✅ |
| 800×600 (1MB) | 800×600 (100KB) ✅ (not upscaled) |
| Aspect ratio 16:9 | Maintains 16:9 ✅ |
| EXIF data present | EXIF stripped ✅ |
| PNG with transparency | JPEG (converts to white bg) ✅ |

### CloudWatch Logs

```
[INFO] Processing image: items/item-123.jpg
[INFO] Downloaded: 12450000 bytes
[INFO] Validated magic bytes: JPEG OK
[INFO] Resized to 1024×768 (aspect 1.33 maintained)
[INFO] Compressed to JPEG q70
[INFO] Uploaded to items/item-123-resized.jpg: 234560 bytes
[INFO] Compression: 98.1% (12.4MB → 235KB)
```

---

## Error Handling

### All Lambdas Return Error in This Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "retryable": true|false
  },
  "statusCode": 400|429|503|500
}
```

### Error Codes

| Code | Retryable | HTTP | Meaning |
|------|-----------|------|---------|
| BEDROCK_RATE_LIMIT | Yes | 429 | Rate limited by Bedrock |
| BEDROCK_TIMEOUT | Yes | 504 | Bedrock took too long |
| BEDROCK_MODEL_ERROR | Yes | 503 | Bedrock service error |
| TEXTRACT_INVALID_IMAGE | No | 400 | Image unreadable |
| TEXTRACT_TIMEOUT | Yes | 504 | Textract took too long |
| S3_NOT_FOUND | No | 404 | Photo missing from S3 |
| S3_ACCESS_DENIED | No | 403 | No permission to read photo |
| DYNAMODB_THROTTLED | Yes | 429 | DynamoDB overloaded |
| QUOTA_EXCEEDED | No | 429 | User hit daily limit |
| INVALID_INPUT | No | 400 | Bad request parameters |

### Retry Strategy

**Retryable errors (exponential backoff):**
```typescript
async function withRetry(fn, maxAttempts = 3) {
  let delay = 100; // ms
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (!error.retryable || i === maxAttempts - 1) throw error;
      await sleep(delay);
      delay *= 2; // 100ms, 200ms, 400ms
    }
  }
}

// Usage:
const result = await withRetry(() => 
  client.invokeAsync('classify-food-lambda', input)
);
```

---

## Rate Limiting

### Bedrock Rate Limits

- **20,000 requests/minute** for Haiku per region
- Free tier: No hard limit but rate limited after ~100 req/min
- If exceeded: Get `BEDROCK_RATE_LIMIT` error, retry with backoff

### DynamoDB Rate Limits

- **On-demand billing**: Automatic scaling, no rate limit
- **Provisioned**: Set write capacity (default 400 WCU)
- If exceeded: Get `DYNAMODB_THROTTLED`, retry with backoff

### S3 Rate Limits

- **3,500 requests/second** per partition
- If exceeded: Get `S3_SERVICE_ERROR`, retry with backoff

---

## Cost Tracking

### Per-Call Cost

```
classify-food:
  - Input tokens (5000): 5000 / 1,000,000 × $0.8 = $0.004
  - Output tokens (500): 500 / 1,000,000 × $4.0 = $0.002
  - Total: $0.006

ocr-expiry-date:
  - Textract (free tier): $0.00
  - Bedrock fallback (1000 tokens): ~$0.0008 (if triggered)
  - Total: $0.00-0.0008

image-resize:
  - S3 read: $0.0004 (0.1 per 1000 requests)
  - Lambda compute: $0.0002 (512MB for 1s)
  - S3 write: $0.0005 (0.1 per 1000 requests)
  - Total: ~$0.001
```

### Monthly Cost

```
Free tier (10 calls/day):
  10 × $0.006 × 30 = $1.80

Premium (1000 calls/day):
  1000 × $0.006 × 30 = $180
```

---

## Monitoring

### CloudWatch Metrics (Custom)

```
CustomAI/AICallCost
CustomAI/CacheHitRate
CustomAI/InputTokens
CustomAI/OutputTokens
CustomAI/Classification Confidence
```

### Logging

All invocations logged with:
- `@timestamp`: ISO8601
- `functionName`: Lambda name
- `userId`: User ID
- `latencyMs`: Duration
- `costUsd`: Call cost
- `cacheHit`: true/false
- `error` (if applicable): Error code + message

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-27 | Initial API spec |

---

**Status**: Ready for Production ✅  
**Last Tested**: 2026-04-27  
**Maintained By**: W4 AI Team

