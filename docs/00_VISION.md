# 00 — Product Vision

## The problem

Food gets old and nasty in the back of the fridge because there's no good way to know what's in there or when it was put there. People throw away leftovers because they're scared they've spoiled. They forget about ingredients until they're rotten. They waste money and food.

Existing apps (Cozzo, Fridgely, Whisk, AnyList, Paprika, Mealime) solve parts of this. None solve all of it well, and none use AI in a way that makes it effortless.

## What we're building

A mobile app (iOS + Android) that:

1. **Tracks every food item** in the user's kitchen — leftovers, raw ingredients, produce, packaged groceries
2. **Identifies items effortlessly** — paper QR stickers, barcodes, AI photo recognition, OCR for printed expiry dates
3. **Knows when things spoil** — built-in spoilage rules, AI-suggested expiry, OCR-detected printed dates, user override always available
4. **Alerts before it's too late** — push notifications at the right time
5. **Suggests what to do tonight** — eat the leftovers (with reheating tips), cook something new (recipes using items expiring soon), or eat out (nearby restaurants matched to user taste)
6. **Learns the user** — over time, the AI knows their food preferences, dietary restrictions, cuisine likes
7. **Works for households** — partners and family members share one inventory in real-time
8. **Works offline** — local-first, syncs when online

## The core promise

> "Never wonder if your food is still good. Never throw away a leftover you forgot about. Never stand at the fridge with no idea what to make."

## Build for today, design for tomorrow

Today's MVP must:
- Work end-to-end with real users and real data
- Be polished enough that someone would pay $4.99/month for it (even if we don't charge yet)
- Run on AWS in production
- Support thousands of free users without burning money

Tomorrow's product (designed for, not built today) must extend cleanly to:
- Public REST API + MCP server (Phase 9)
- Durable hardware containers (Phase 10)
- B2B / restaurant inventory tracking
- Affiliate revenue (Instacart, OpenTable, etc.)
- Optional nutrition / calorie counting / diet tracking
- Social features (recipe sharing, family meal planning)

If a today-decision blocks a tomorrow-feature, we revisit the today-decision.

## Wave rollout strategy

We ship in waves, not big-bang.

### Wave 1 — MVP (Weeks 0–10)
**Goal**: A real, usable app with the core experience working end-to-end. Free tier only. 100–500 beta users.

In scope:
- Auth (email magic link, Apple Sign-In, Google Sign-In)
- Paper QR sticker generation + scanning
- Container & item lifecycle (create, view, update, mark eaten/tossed/frozen, archive)
- Multi-location storage (fridge, freezer, pantry, counter, lunchbox)
- Manual food entry with built-in spoilage rules
- AI photo classification (Claude Haiku via Bedrock)
- Barcode scanning for groceries
- OCR scanning of printed expiry dates on packaging
- Local-first storage with cloud sync
- Push notifications (local + server-driven)
- Status dashboard with color-coded urgency
- Settings (profile, notifications, dietary preferences, account deletion, data export)
- Premium UX — animations, haptics, accessibility, dark mode, custom illustrations
- Sentry crash reporting + PostHog analytics

Out of scope (deferred to Wave 2+):
- Household sharing (Wave 2)
- Recipe suggestions (Wave 2)
- Nearby restaurants (Wave 3)
- Receipt OCR scanning (Wave 3)
- Calorie/nutrition tracking (Wave 4)
- Social features (Wave 5+)
- Public API + MCP (Wave 6+)
- Custom hardware (separate track)

### Wave 2 — Sharing + Cooking (Weeks 11–14)
- Households (multi-user groups, real-time sync via AppSync subscriptions)
- Activity log per user
- Recipe suggestions powered by Claude (uses items expiring soon + dietary prefs)
- Recipe history & saving
- Daily "what to eat today" digest
- AI-learned food preferences

### Wave 3 — Outside the kitchen (Weeks 15–18)
- Nearby restaurant recommendations (Google Places + Claude ranking against user taste)
- Delivery deep links (DoorDash, Uber Eats)
- Receipt scanning OCR via Amazon Textract → auto-add groceries
- Shopping list with auto-suggestions
- Stats & insights (weekly waste, $ saved, streaks)

### Wave 4 — Health & nutrition (Weeks 19–22)
- Optional calorie counting per item
- Daily intake suggestions vs. consumption
- Macros (protein, carbs, fat)
- Diet plan support (keto, vegetarian, etc.)
- Disclaimers (not medical advice)

### Wave 5 — Social & community (Weeks 23+)
- Recipe sharing within households
- Public recipe gallery (opt-in, moderated)
- Following friends / family
- Comment + react on shared recipes

### Wave 6 — Platform (Months 6+)
- Public REST API (`/v1/*`)
- Webhooks (item.created, item.expired, etc.)
- OAuth scoped tokens for third parties
- MCP server for AI assistants
- Smart home integrations (Alexa, Google Home, Samsung Family Hub)

### Phase 10 — Hardware (separate track, Months 9+)
- Custom branded containers with permanent QR codes (laser-etched or printed)
- No electronics, no indicator lights, no Bluetooth in v1 hardware
- Possibly future: BLE temp sensors (only if validated)

## Success metrics

### MVP (Wave 1) success
- 30% Day-7 retention
- 50% of users add 5+ items in first week
- < 15% AI classification override rate
- < 0.5% crash rate
- App Store rating ≥ 4.5
- 5,000 MAU within 90 days of public launch

### Pre-monetization gate
Don't introduce paid tiers until:
- 5,000+ MAU
- 30%+ Day-30 retention
- Sustained organic growth signal

### Mature product (Year 1)
- 50,000 MAU
- 1.5–2.5% paid conversion
- $20–50K MRR
- Net Promoter Score 40+

## What this app is NOT

- Not a recipe-only app (we have recipes, but the inventory is the core)
- Not a meal-planning app (we suggest meals based on what you have, not multi-week plans — yet)
- Not a calorie-tracker primary (we add calories as a complement, not the focus)
- Not a delivery app (we deep-link to existing delivery apps, we don't fulfill)
- Not a kitchen-gadget marketing tool (we'll sell branded containers eventually, but the app is the product)

## Decision log

These are decisions made during planning that should not be re-litigated without explicit reason.

| Decision | Rationale |
|---|---|
| Paper QR for MVP, no electronics | Avoids waterproofing/durability problems; phone is the indicator; ship faster |
| AWS over Supabase | User requirement; enterprise scale; broader service ecosystem |
| DynamoDB single-table over Aurora | Cost (free tier covers 1k users); scales to zero; AWS-native |
| AppSync GraphQL over REST API Gateway | Real-time subscriptions for households; offline sync via DataStore |
| Bedrock over direct Anthropic API | Data stays in AWS; IAM-scoped access; one bill |
| Free tier first, monetize later | Maximize user acquisition; conversion happens after PMF |
| Cognito over Auth0/Clerk | Free up to 50k MAU; native AWS integration; cheaper at scale |
| RevenueCat over raw IAP | Cross-platform; free until $2.5K MTR; best-in-class |
| React Native + Expo | One codebase iOS + Android; OTA updates via EAS |
| Tamagui over NativeBase/gluestack | Premium feel; compile-time atomic CSS; theme tokens |
| Maestro over Detox/Appium | Works with Expo managed; YAML flows; CI-friendly |
| TypeScript strict everywhere | Catch errors at compile time; share types client/server |

## Stakeholders

- **User (you)**: product owner, decision-maker
- **AI workers (10 parallel)**: implementation
- **Beta testers**: 100+ recruited via Reddit/Twitter pre-launch
- **App Store / Play Store reviewers**: gatekeepers — must satisfy their guidelines

## Open questions

These need resolution before Wave 1 build kicks off (see [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md) for the full pre-flight list):

1. Final brand name and domain
2. AWS account setup (single account or org with sub-accounts per env)
3. Apple Developer + Google Play accounts
4. Anthropic API access via Bedrock (request model access in console)
5. RevenueCat account (free tier sufficient at MVP)
6. PostHog + Sentry accounts (free tiers)
