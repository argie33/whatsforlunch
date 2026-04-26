# 06 — AI Integration

The AI is a core differentiator. It must be reliable, cost-conscious, and visibly accurate. Every AI call has a fallback; every classification can be overridden by the user.

**Provider**: Amazon Bedrock (Claude models)
**Models**:
- **Claude Haiku 4.5** — fast classification, OCR confirmation, simple suggestions
- **Claude Sonnet 4.6** — recipe generation, restaurant ranking, preference learning, complex reasoning
**OCR**: Amazon Textract for printed expiry dates and receipts (with Bedrock fallback)
**Caching**: Bedrock prompt caching enabled on all calls

## AI use cases (all)

| Use case | Model | Trigger | Latency target |
|---|---|---|---|
| Photo classification (food identification) | Haiku | User snaps photo | < 3s |
| Printed expiry date extraction | Textract → Haiku confirm | User scans packaging | < 2s |
| Receipt parsing | Textract async → Sonnet structure | User scans receipt | < 30s |
| Recipe suggestions | Sonnet | User taps "What can I make?" | < 6s |
| Restaurant ranking | Sonnet | User taps "Eat out tonight" | < 4s |
| Preference learning | Sonnet | DynamoDB Stream every 50 events | Async |
| Diet / nutrition advice | Sonnet | User asks (Wave 4) | < 5s |
| Recipe Q&A | Sonnet | User asks question on recipe (Wave 5) | < 4s |

## Photo classification (canonical example)

### Flow

```
Mobile app
  │
  ├─ User snaps photo
  ├─ Compress to 1024px JPEG q70 → ~80-200KB
  ├─ Request pre-signed PUT URL (presignedPhotoUpload mutation)
  ├─ Upload directly to S3
  ├─ Call classifyItemPhoto mutation with photoPath
  │
AppSync
  │
  ├─ Lambda resolver: classify-food
  │
classify-food Lambda
  │
  ├─ Authorize: check household membership, AI quota
  ├─ Load food_rules (cached in Lambda memory, 5-min TTL)
  ├─ Build prompt:
  │   - Cached portion: system prompt + food_rules JSON (versioned)
  │   - Per-request: storage location, hint text, photo
  ├─ Call Bedrock InvokeModel
  ├─ Parse tool-use response
  ├─ Validate with Zod
  ├─ If confidence ≥ 0.6: update item, write ai_classifications row
  ├─ If confidence < 0.6: return as suggestion only, don't auto-apply
  ├─ Return to client
```

### Prompt structure

System prompt (cached, ~95% cache hit rate target):

```
You are a food spoilage classifier for a leftover-tracking app.
You will be shown a photograph of food in a container.

Your job: identify the food, match it to the closest entry in the
provided rules table, and suggest a safe-to-eat-by date based on
storage conditions.

Rules table (version 12):
[full JSON dump of food_rules from DynamoDB, ~3-8KB]

Guidelines:
- Prefer the most specific matching food_type from the rules.
- If multiple foods are visible, identify the dominant one.
- Confidence is your honest estimate; below 0.6 means "I'm guessing."
- If you cannot identify the food at all, return food_type="unknown".
- Consider visual cues: color, texture, mold, discoloration. If the
  food looks already spoiled in the photo, set days_safe=0 and note
  in reasoning.
- Never output prose; only call the classify_food tool.
```

Per-request user prompt (small, not cached):

```
Stored at (UTC): 2026-04-26T18:00:00Z
User time zone: America/Los_Angeles
Storage location: fridge
User hint: (none)
[image attached]
```

Tool definition (forced via `tool_choice`):

```json
{
  "name": "classify_food",
  "description": "Return classification of the food in the photo.",
  "input_schema": {
    "type": "object",
    "required": ["food_type", "food_name", "days_safe", "confidence"],
    "properties": {
      "food_type": {
        "type": "string",
        "description": "Exact food_type key from rules, or 'unknown'."
      },
      "food_name": {
        "type": "string",
        "description": "Human-readable name shown to user."
      },
      "days_safe": {
        "type": "integer",
        "minimum": 0,
        "maximum": 365
      },
      "confidence": {
        "type": "number",
        "minimum": 0,
        "maximum": 1
      },
      "reasoning": {
        "type": "string",
        "maxLength": 200,
        "description": "1-2 sentences shown to user on tap."
      },
      "alternatives": {
        "type": "array",
        "maxItems": 3,
        "items": {
          "type": "object",
          "properties": {
            "food_type": {"type": "string"},
            "confidence": {"type": "number"}
          }
        }
      },
      "visual_warning": {
        "type": "string",
        "enum": ["none", "possible_mold", "discoloration", "freezer_burn"],
        "description": "If visible spoilage, flag it."
      }
    }
  }
}
```

`tool_choice: {"type": "tool", "name": "classify_food"}` forces structured output. This is dramatically more reliable than "respond in JSON".

### Caching strategy

- Cached portion: ~3-8KB system prompt + rules JSON (well over the 1024-token cache floor for Haiku)
- Bust the cache by changing `version` in the rules comment (`"Rules table (version 12):"`)
- Per-request portion (timestamps, tz, location): small, never cached
- Track `cacheHit` in ai_classifications table

### Cost model

| Tier | Tokens in (cached + non-cached) | Tokens out | Per-call cost |
|---|---|---|---|
| Haiku 4.5 (cached) | ~6000 cached + ~200 fresh + image (~1k tokens) | ~250 | **~$0.0008** |
| Sonnet 4.6 (cached) | ~6000 cached + ~200 fresh + image | ~250 | **~$0.003** |

At 1k users × 5 classifications/week = 20k/month → ~$16/mo on Haiku.

### Failure modes

| Failure | Handling |
|---|---|
| Bedrock 429 (rate limit) | Exponential backoff up to 30s; queue + retry |
| Bedrock 500 / network error | Retry once; if fail, return error to client; user falls back to manual |
| Tool call returns `food_type: "unknown"` | Show manual food picker; pre-fill nothing |
| Confidence < 0.6 | Show "We think this is X. Is that right?" with confirm UI; don't auto-apply |
| Tool response fails Zod validation | Log Sentry; return INTERNAL_ERROR; user falls back to manual |
| Bedrock refuses (safety filter) | Log; return error; manual fallback |
| Visual warning detected | Show prominent banner: "This may be spoiled — check before eating" |
| User over daily quota | Return QUOTA_EXCEEDED with upgrade CTA; manual entry still works |

## Printed expiry date OCR

User can scan printed dates on packaging (e.g. milk carton "USE BY 5/15/26").

### Flow

```
1. User selects "Date" mode in scan camera
2. User aligns printed date in viewfinder
3. Photo captured → uploaded to S3
4. ocrExpiryDate mutation called
5. Lambda: ocr-expiry-date
   - Call Textract DetectDocumentText (sync)
   - Parse all detected text via regex matching common date formats:
     MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, "USE BY 5/15/26", "BEST BY MAY 15"
   - If multiple dates found, score by:
     * Proximity to keywords (USE BY, EXPIRES, SELL BY, BEST BY)
     * Position in image (top-third often has the date on packaging)
     * Plausibility (within 5 years of today)
   - If high-confidence match: return single date + raw text + bounding box
   - If ambiguous: return all candidates, let user pick
   - If Textract confidence low: fall back to Bedrock Haiku with structured prompt
```

### Textract response example

```json
{
  "detectedDates": [
    {
      "rawText": "USE BY 5/15/26",
      "parsedAt": "2026-05-15T23:59:59Z",
      "confidence": 0.92,
      "boundingBox": {"x": 0.1, "y": 0.05, "width": 0.4, "height": 0.08}
    }
  ],
  "bestGuess": "2026-05-15T23:59:59Z",
  "confidence": 0.92
}
```

### UI

If high confidence: auto-fill expiry field with badge "OCR detected · 92% confident · tap to override"
If low confidence: show all candidates, let user tap the right one
If no date detected: fall back to manual entry

User always controls final value.

## Receipt OCR (Wave 3)

User scans grocery receipt → app auto-adds purchased items.

### Flow

```
1. User photographs receipt
2. ocrReceipt mutation called
3. Lambda: ocr-receipt
   - Call Textract AnalyzeExpense (async)
   - Returns structured line items: name, price, quantity
4. Step Function: process-receipt-flow
   - Wait for Textract job complete (poll)
   - Pass parsed items to Bedrock Sonnet for normalization:
     * "GV WHL MILK GAL" → "Whole milk, 1 gallon"
     * Match to food_type from rules
     * Estimate expiry based on category
   - Return list of suggested items with confidence
5. UI shows list, user toggles which to add
6. Bulk create items
```

### Sonnet normalization prompt

```
You normalize cryptic receipt line items into clean food entries.
Match each line to a food_type from the rules table where possible.
Output JSON array.

Input items:
- "GV WHL MILK GAL"
- "ORG SPN 5OZ"
- "AVCD HASS 4CT"

Rules table (version 12):
[food_rules JSON]
```

Output forced via tool_use to a structured array.

## Recipe suggestions

User taps "What can I make?" on dashboard → AI suggests recipes using items expiring soon.

### Flow

```
1. Mobile: suggestRecipes mutation with optional itemIds, cuisine, etc.
2. Lambda: suggest-recipes
   - Authorize, check quota
   - Load household items expiring in next 5 days
   - Load user's learned preferences (cuisine affinity, allergies, dietary)
   - Compute cache key: sha256(sorted_item_types + dietary + cuisine + servings)
   - Check RecipeCache for hit (30-day TTL)
   - If miss: call Bedrock Sonnet with structured prompt
   - Cache result
   - Return recipes
```

### Sonnet prompt

```
You suggest recipes a home cook can make tonight.

Constraints:
- Use as many of these about-to-expire items as possible (priority):
  [list of items with quantities]
- Available pantry items the user has:
  [list]
- Dietary restrictions: vegan, gluten-free
- Disliked cuisines: (none)
- Preferred cuisines: italian, japanese, thai
- Allergies: shellfish
- Servings: 4
- Max cook time: 45 min

Output 5 recipes in order of "most uses expiring items".
Each recipe must include: title, summary, cuisine, servings,
cookTimeMinutes, difficulty, ingredients (with quantities),
steps (5-12 steps), and which usedItemIds it consumes.

Use the suggest_recipes tool.
```

Tool: `suggest_recipes` with structured array of recipe objects.

### UI behavior

- "What can I make?" button shows count of expiring items
- Loading: skeleton cards (3) for ~3-5s
- Result: list of recipe cards, ordered by `usedItemsCount` descending
- Tap recipe → S10 detail
- "I cooked this" CTA marks linked items as eaten + saves recipe to favorites + records in `LearnedPreferences`

## Restaurant ranking (Wave 3)

User taps "Eat out tonight" → AI ranks nearby restaurants by user's learned tastes.

### Flow

```
1. Mobile: location permission → suggestNearby mutation
2. Lambda: suggest-restaurants
   - Authorize, check quota
   - Get user location, radius, filters
   - Compute cache key: sha256(lat_round + lng_round + radius + filter_hash)
   - Check NearbyPlacesCache for hit (30-min TTL)
   - If miss:
     a. Call Google Places Nearby Search (radius, type=restaurant, opennow)
     b. Filter to top 20 by rating × review_count
     c. Call Bedrock Sonnet with user's learned preferences:
        - cuisine affinity scores
        - allergies
        - dietary restrictions
        - food they've eaten recently (avoid same cuisine 2 nights in a row)
        - food they've been wasting (suggest something different)
     d. Sonnet returns ranked list with matchScore + matchReason
   - Cache, return
3. UI shows S11 nearby list
```

### Sonnet ranking prompt

```
Rank these nearby restaurants for this user.

User profile:
- Cuisine affinity (0-1):
  italian: 0.9, japanese: 0.85, mexican: 0.6, thai: 0.95, indian: 0.4
- Allergies: shellfish
- Dietary: (none)
- Recent meals: italian (last night), japanese (2 nights ago)
- Most-wasted foods: lettuce (suggest cuisines that don't rely on salads)

Restaurants (Google Places):
[20 places with name, cuisine, rating, price]

Output the top 8 ranked by likelihood the user will love it.
Each must include matchScore (0-1) and matchReason (1 sentence).

Use the rank_restaurants tool.
```

## Preference learning (Wave 2 background)

Continuously learn what the user likes / dislikes from their actions.

### Flow

```
DynamoDB Stream → Lambda: learn-preferences
  - Triggered on new ItemEvents (markedEaten, markedTossed, recipeCookedAt, restaurantTapped)
  - Buffer events; process every 50 events or 1 hour, whichever first
  - For user, aggregate:
    - Top eaten foods (by foodType)
    - Top wasted foods (markedTossed)
    - Cuisine affinity from cooked recipes
  - Update LearnedPreferences row
```

No prompt needed for the aggregation itself (deterministic). Sonnet is used downstream when the data informs a query (recipes, restaurants).

## Diet / nutrition (Wave 4)

User can add calories per item; AI estimates from food type if not provided.

```
Lambda: estimate-nutrition
- Input: foodType, quantityValue, quantityUnit
- Lookup nutrition database (USDA FoodData Central) first
- If not found or ambiguous: Bedrock Haiku with structured prompt
- Return estimate with confidence
```

USDA FoodData Central is free and authoritative; AI is fallback.

Daily intake suggestions (Wave 4):
- Show user's daily calorie/macro intake from items eaten
- Suggest portion sizes based on dietary goals (user-set)
- **Disclaimers**: "Not medical advice. Consult a doctor for diet plans."

## Prompt versioning

All prompts versioned and deployed together. Bumping a prompt version:
1. Edit prompt in `services/ai/<function>/prompts.ts`
2. Bump `PROMPT_VERSION` constant
3. Run eval suite (see [09_TESTING.md](09_TESTING.md))
4. If accuracy drops > 2%, fix or revert
5. Deploy

`promptVersion` recorded in `ai_classifications` for every call → enables A/B testing and regression detection.

## Eval suite

Located at `services/ai/evals/`. Includes:

- **photos/** — 500-1000 labeled food photos (ground truth: foodType, days_safe)
- **receipts/** — 100 receipt images with expected line items
- **expiry-dates/** — 50 packaging photos with expected dates

CI runs evals on every prompt change:
- `pnpm ai:eval classify-food`
- Outputs: accuracy, confidence calibration, latency, cost
- Fails build if accuracy drops > 2% or P95 latency > 5s

Tools: **Langfuse** (open-source, self-hostable on AWS) or **Braintrust** for tracking eval results over time.

## Per-user quotas

Tracked in `Profile.aiQuotaUsedToday`. Reset at midnight in user's time zone via cron.

| Operation | Free | Premium |
|---|---|---|
| Photo classify | 10/day | unlimited |
| Date OCR | 30/day | unlimited |
| Receipt OCR | 5/day | 50/day |
| Recipe suggest | 5/day | unlimited |
| Restaurant suggest | 20/day | unlimited |

Enforcement: each Lambda checks before calling Bedrock; returns QUOTA_EXCEEDED gracefully.

## Cost monitoring

- Per-user cost tracked in `ai_classifications.costUsd` and aggregated daily
- Alert if any user > $5/day (potential abuse)
- Alert if total daily AI cost > 2x baseline (anomaly)
- Monthly review: cost per converted free user vs. premium revenue

## Privacy

- Photos sent to Bedrock are deleted from Bedrock infrastructure after the response (Bedrock doesn't retain by default)
- We never log photo bytes or full prompts
- We log: model name, prompt version, latency, cost, response (redacted), confidence
- Users can disable AI photo classification in settings
- Privacy policy explicitly mentions Bedrock + Anthropic processing

## Bedrock setup

- Model access requested in AWS console (one-time per account):
  - `anthropic.claude-haiku-4-5-20251001-v1:0` (Haiku 4.5)
  - `anthropic.claude-sonnet-4-6-20251101-v1:0` (Sonnet 4.6)
- IAM policy on Lambda execution role: `bedrock:InvokeModel` on these specific model ARNs
- Region: us-east-1 primary; us-west-2 fallback for cross-region failover (Wave 6)

## Future AI features (designed for, not built)

- **Voice input** ("Hey app, I just made a chicken stir-fry") — Wave 5+
- **Conversational chef** ("What goes with my leftover pasta?") — Wave 5+
- **Meal planning** (multi-day plans) — Wave 5+
- **Auto-detect spoilage from photo** (active vs heuristic) — Wave 6
- **Diet coaching** (personalized nutrition over time) — Wave 6+

## Cross-references

- Data model for AI tables → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- API mutations → [03_API_SPEC.md](03_API_SPEC.md)
- Eval testing → [09_TESTING.md](09_TESTING.md)
