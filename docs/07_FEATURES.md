# 07 — Feature Catalog

This is the canonical feature list. Every feature has acceptance criteria. If a builder claims a feature done, they tick the criteria here. If a feature isn't listed, it's not in scope.

Features are tagged by **wave** (when they ship) and **track** (which worker owns).

Track legend: `INFRA` `BACKEND` `MOBILE-CORE` `MOBILE-AI` `MOBILE-SOCIAL` `AI` `QA` `OPS` `DESIGN` `SECURITY`

## Wave 1 — MVP

### F-001: Account creation (email magic link)
**Wave**: 1 · **Track**: BACKEND, MOBILE-CORE, SECURITY
**Acceptance**:
- [ ] User enters email → magic link sent within 30s
- [ ] Magic link opens app via Universal Link / App Link
- [ ] Tokens stored in expo-secure-store
- [ ] Profile created on first sign-in
- [ ] User's personal household auto-created
- [ ] Sign-out clears tokens but keeps local DB cached for offline view

### F-002: Apple Sign-In (iOS)
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Apple Sign-In button visible on iOS auth screen
- [ ] Successful sign-in creates Cognito federated identity
- [ ] User profile linked to Apple ID
- [ ] App Store guideline 4.8 compliance verified

### F-003: Google Sign-In
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Google Sign-In button visible (both platforms)
- [ ] OAuth flow completes, Cognito federated identity created
- [ ] Profile linked to Google account

### F-004: Onboarding flow
**Wave**: 1 · **Track**: MOBILE-CORE, DESIGN
**Acceptance**:
- [ ] 4 onboarding screens with hero illustrations
- [ ] Skip button on every screen
- [ ] User can add first item without an account (anonymous mode for first 3 items)
- [ ] Permission primers shown before system prompts (camera, notifications)
- [ ] Total time to first item < 20 seconds

### F-005: Print QR sticker sheets
**Wave**: 1 · **Track**: MOBILE-CORE
**Acceptance**:
- [ ] Sticker generation screen renders 24 unique QR codes per page
- [ ] Letter and A4 sheet sizes supported
- [ ] PDF export via expo-print
- [ ] Each QR encodes Universal Link `https://app.whatsforlunch.app/c/<token>`
- [ ] User can share PDF (AirDrop, print, email)

### F-006: Scan QR code (claim/open container)
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Camera opens with QR detection mode
- [ ] On detect: haptic + scale-pop reticle
- [ ] Unknown QR token → claim flow (creates Container record)
- [ ] Known QR token (user's) → opens Container detail
- [ ] Known QR token (other user's) → "Not your container" friendly error
- [ ] QR scan from system camera also opens app via Universal Link

### F-007: Container management
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Container list (grid) view
- [ ] Container detail with current item + history (last 50)
- [ ] Edit container nickname
- [ ] Add container photo
- [ ] Archive container (hides from active list)
- [ ] Unarchive container

### F-008: Item creation — manual entry
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Add Item sheet with all fields (food, location, quantity, expiry, notes)
- [ ] Food picker with search + autocomplete from food_rules
- [ ] Storage location picker (fridge/freezer/pantry/counter/lunchbox)
- [ ] Storage location determines default expiry from food_rules
- [ ] User can override expiry
- [ ] User can add photo (optional)
- [ ] Saved item appears on dashboard immediately

### F-009: Item creation — barcode scan
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Camera detects UPC/EAN barcodes
- [ ] Barcode lookup via Open Food Facts API (or similar) → product name, brand, image
- [ ] Found product pre-fills food name, photo
- [ ] Not-found barcode → manual entry with barcode saved
- [ ] Subsequent scans of same barcode auto-fill from prior data

### F-010: Item creation — AI photo classification
**Wave**: 1 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] Camera "Photo" mode captures food image
- [ ] Image uploaded to S3 (compressed)
- [ ] Bedrock Claude classifies food type, suggests expiry
- [ ] High confidence (≥0.6): fields auto-filled
- [ ] Low confidence: "We think this is X. Confirm?" UI
- [ ] User can override any field
- [ ] AI classification recorded in audit table
- [ ] Visual warnings (mold, freezer burn) shown prominently

### F-011: Item creation — printed expiry date OCR
**Wave**: 1 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] Camera "Date" mode captures packaging photo
- [ ] Textract extracts text + dates
- [ ] Multiple date formats parsed: MM/DD/YY, DD-MM-YYYY, "USE BY 5/15/26"
- [ ] Best guess auto-filled with confidence indicator
- [ ] User can pick alternative if ambiguous
- [ ] Falls back to Bedrock if Textract confidence low

### F-012: Item lifecycle — view, update, delete
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Item detail screen with hero photo, status, meta
- [ ] Edit any field (food name, expiry, notes, etc.)
- [ ] Delete item (soft delete, 30-day retention)
- [ ] Audit log shows every change with actor + timestamp

### F-013: Item lifecycle — status changes
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Mark eaten → status updates, eatenAt set, notification cancels
- [ ] Mark tossed → status updates, tossedAt set, counts as waste
- [ ] Mark frozen → status updates, expiryAt extended by freezer_days_safe
- [ ] Mark partial → quantity reduces; remains active
- [ ] Mark transferred → links old + new container
- [ ] Snooze alert → defers next notification by N hours

### F-014: Dashboard ("Today")
**Wave**: 1 · **Track**: MOBILE-CORE
**Acceptance**:
- [ ] Hero card "Eat Me First" if any items urgent
- [ ] Sectioned list: urgent / soon / fresh
- [ ] Filter chips: All / Today / Fridge / Freezer / Pantry
- [ ] Status stripe color-coded
- [ ] Swipe left card → mark eaten (green)
- [ ] Swipe right card → mark tossed (red)
- [ ] Pull-to-refresh re-syncs
- [ ] Tap card → item detail with shared element transition
- [ ] FAB opens action sheet (scan / add)

### F-015: Search & filter inventory
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Search bar in dashboard searches food name, notes
- [ ] Client-side filter on local DB (instant)
- [ ] Filter by storage location, status
- [ ] Sort by expiry / stored date / location

### F-016: Bulk actions
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Multi-select mode on dashboard (long-press)
- [ ] Bulk mark eaten / tossed / frozen
- [ ] Bulk delete

### F-017: Local notifications (expiry alerts)
**Wave**: 1 · **Track**: MOBILE-CORE
**Acceptance**:
- [ ] Local notification scheduled at item creation: 12 hours before expiry (configurable)
- [ ] Notification cancelled on mark eaten/tossed/frozen/snoozed
- [ ] Permission flow with primer
- [ ] Notification opens item detail
- [ ] Inline actions: mark eaten, snooze 1 day

### F-018: Server-driven notifications (daily digest)
**Wave**: 1 · **Track**: BACKEND
**Acceptance**:
- [ ] EventBridge cron runs daily at user's preferred time
- [ ] Lambda gathers user's expiring items
- [ ] SNS push delivered with rich content (image attachment)
- [ ] User taps → app opens to dashboard
- [ ] Quiet hours respected

### F-019: Settings
**Wave**: 1 · **Track**: MOBILE-CORE
**Acceptance**:
- [ ] Profile edit (name, photo)
- [ ] Notification preferences (kinds, quiet hours, sound)
- [ ] Time zone, units (metric/imperial)
- [ ] Dietary preferences (multi-select tags)
- [ ] Cuisine preferences
- [ ] Allergies
- [ ] Theme toggle (auto / light / dark)
- [ ] Privacy: delete photos after AI, share analytics
- [ ] About: version, terms, privacy policy
- [ ] Sign out
- [ ] Delete account (with email confirmation)

### F-020: Account deletion (GDPR)
**Wave**: 1 · **Track**: BACKEND, SECURITY, MOBILE-CORE
**Acceptance**:
- [ ] In-app delete account button
- [ ] Email confirmation required
- [ ] Step Function cascades deletion within 30 days
- [ ] Confirmation email sent
- [ ] App signs out, clears local DB
- [ ] All photos, items, household memberships purged

### F-021: Data export (GDPR)
**Wave**: 1 · **Track**: BACKEND, MOBILE-CORE
**Acceptance**:
- [ ] In-app "Export My Data" button
- [ ] Lambda generates ZIP with profile.json, items.json, photos
- [ ] Signed S3 URL emailed to user (7-day expiry)
- [ ] In-app download option

### F-022: Local-first storage with cloud sync
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] All reads from WatermelonDB (instant, reactive)
- [ ] All writes optimistic to local + queued sync
- [ ] Offline writes sync on reconnect
- [ ] Per-field conflict resolution (status forward-only, quantity sum, others LWW)
- [ ] Real-time sync via AppSync subscription when online
- [ ] Background sync on app foreground

### F-023: Photo storage with compression
**Wave**: 1 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Photos compressed to 1024px JPEG q70 before upload (~80-200KB)
- [ ] Pre-signed PUT URLs used (15-min TTL)
- [ ] EXIF stripped server-side
- [ ] Magic byte verification
- [ ] Thumbnails generated for list views
- [ ] Photos cached on-device (expo-image)

### F-024: Status colors & semantic indicators
**Wave**: 1 · **Track**: MOBILE-CORE, DESIGN
**Acceptance**:
- [ ] Status computed locally from expiryAt + storage rules
- [ ] Colors: green (>3 days), yellow (1-3 days), red (<24h or expired)
- [ ] Icons paired with colors (clock, warning, check)
- [ ] Updates in real-time (every minute on visible cards)

### F-025: Empty states & loading skeletons
**Wave**: 1 · **Track**: MOBILE-CORE, DESIGN
**Acceptance**:
- [ ] Custom illustration for empty dashboard
- [ ] Skeleton loaders for all list views (no spinners on first screen)
- [ ] Loading states feel instant (perceived performance)

### F-026: Accessibility
**Wave**: 1 · **Track**: MOBILE-CORE, DESIGN, QA
**Acceptance**:
- [ ] All Pressables have accessibilityRole/Label/Hint
- [ ] VoiceOver navigates every screen logically
- [ ] TalkBack navigates every screen logically
- [ ] Dynamic Type to 1.5x without breaking layout
- [ ] Color-blind safe (icon + color, never color alone)
- [ ] Reduce Motion respected
- [ ] Touch targets ≥44pt iOS / 48dp Android

### F-027: Dark mode
**Wave**: 1 · **Track**: MOBILE-CORE, DESIGN
**Acceptance**:
- [ ] Dark palette implemented for every screen
- [ ] Auto-switch based on system setting
- [ ] Manual override in settings
- [ ] Status colors adjusted for dark mode WCAG AA

### F-028: Sentry crash reporting
**Wave**: 1 · **Track**: MOBILE-CORE, OPS
**Acceptance**:
- [ ] Sentry React Native SDK integrated
- [ ] Crashes auto-reported with stack, device, OS, user ID hash
- [ ] Source maps uploaded on EAS Build
- [ ] Sentry alerts route to PagerDuty for high-severity

### F-029: PostHog analytics
**Wave**: 1 · **Track**: MOBILE-CORE, OPS
**Acceptance**:
- [ ] PostHog React Native SDK integrated
- [ ] Key events tracked: signup, item_created, item_classified, item_eaten, item_tossed
- [ ] User properties: tier, household_count, dietary_prefs (anon)
- [ ] Feature flags wired
- [ ] Surveys can be triggered from PostHog dashboard

### F-030: TestFlight + Play Internal Testing
**Wave**: 1 · **Track**: OPS
**Acceptance**:
- [ ] iOS app submitted to TestFlight (internal testers + 100 external)
- [ ] Android app on Play Internal Testing
- [ ] Beta cohort recruited (Reddit, Twitter, IndieHackers — 100+ testers)
- [ ] Feedback channel established (TestFlight feedback + Crisp/email)

### F-031: Privacy policy + Terms of Service pages
**Wave**: 1 · **Track**: OPS, SECURITY
**Acceptance**:
- [ ] Privacy policy hosted at `/privacy`
- [ ] Terms hosted at `/terms`
- [ ] In-app links from settings
- [ ] App Store / Play Store listings reference URLs

### F-032: Customer support — basic
**Wave**: 1 · **Track**: OPS
**Acceptance**:
- [ ] In-app "Contact us" → mailto:support@whatsforlunch.app
- [ ] FAQ Notion page linked from settings
- [ ] Bug report screen attaches device info, recent logs, Sentry event ID
- [ ] Shake-to-report enabled (`react-native-shake`)

## Wave 2 — Sharing + Cooking

### F-101: Households
**Wave**: 2 · **Track**: BACKEND, MOBILE-SOCIAL
**Acceptance**:
- [ ] Create household (name, optional photo)
- [ ] Invite via shareable link (token-based, 7-day expiry)
- [ ] Accept invite via deep link
- [ ] Member list with roles (owner, member, viewer)
- [ ] Owner can change roles, remove members
- [ ] Members can leave; owners can transfer ownership
- [ ] Household-scoped containers and items

### F-102: Real-time household sync
**Wave**: 2 · **Track**: BACKEND, MOBILE-SOCIAL
**Acceptance**:
- [ ] AppSync subscription for `onItemChanged` filtered by householdId
- [ ] Partner adds item → other members see it within 2 seconds
- [ ] Conflict resolution per data model rules
- [ ] Typing indicators on shopping list (nice-to-have)

### F-103: Per-user activity log
**Wave**: 2 · **Track**: MOBILE-SOCIAL, BACKEND
**Acceptance**:
- [ ] Item events show actor name + photo
- [ ] Activity feed in household settings
- [ ] Filterable by member

### F-104: Recipe suggestions
**Wave**: 2 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] "What can I make?" tab/CTA
- [ ] Sonnet generates 5 recipes from expiring items + dietary prefs
- [ ] Recipe cards with photo (AI-generated or stock match)
- [ ] Recipe detail with ingredients (linked to fridge), steps
- [ ] "I cooked this" CTA marks linked items as eaten

### F-105: Recipe library
**Wave**: 2 · **Track**: MOBILE-SOCIAL, BACKEND
**Acceptance**:
- [ ] Save AI recipes to favorites
- [ ] Manually add user recipes
- [ ] Recipe history with rating
- [ ] Search saved recipes

### F-106: Daily "what to eat" digest
**Wave**: 2 · **Track**: BACKEND, MOBILE-CORE
**Acceptance**:
- [ ] Morning push: "Today: leftover pasta, expiring spinach. Want a recipe?"
- [ ] User-configurable time
- [ ] Tappable to open dashboard or recipe suggestions

### F-107: AI preference learning
**Wave**: 2 · **Track**: AI, BACKEND
**Acceptance**:
- [ ] DynamoDB Stream → learn-preferences Lambda processes events
- [ ] Updates `LearnedPreferences` (top eaten, top tossed, cuisine affinity)
- [ ] Used by recipe + restaurant suggestions
- [ ] Visible to user in settings (transparency)

## Wave 3 — Outside the kitchen

### F-201: Nearby restaurant recommendations
**Wave**: 3 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] "Eat out tonight" CTA on dashboard
- [ ] Location permission flow
- [ ] Google Places nearby search
- [ ] Sonnet ranks by user's learned preferences
- [ ] Match score + reason shown
- [ ] Deep links to DoorDash, Uber Eats, Grubhub

### F-202: Receipt scanning
**Wave**: 3 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] Camera "Receipt" mode
- [ ] Textract async parsing
- [ ] Sonnet normalizes line items to food types
- [ ] User reviews parsed list, toggles which to add
- [ ] Bulk create items

### F-203: Shopping list
**Wave**: 3 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] List per household
- [ ] Add manually or auto-suggested from history
- [ ] Mark purchased
- [ ] Auto-suggest based on consumption patterns ("you usually buy milk every 9 days")
- [ ] Categorize (produce, dairy, etc.)

### F-204: Stats & insights
**Wave**: 3 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] Weekly stats: items eaten vs tossed, $ saved/wasted
- [ ] Most-eaten and most-wasted foods
- [ ] Streak counter
- [ ] Bento layout dashboard

### F-205: Affiliate links (Instacart)
**Wave**: 3 · **Track**: BACKEND
**Acceptance**:
- [ ] "Buy ingredients" CTA on recipe detail
- [ ] Deep link to Instacart with affiliate ID
- [ ] Track click-through

## Wave 4 — Health & nutrition (optional, opt-in)

### F-301: Nutrition data per item
**Wave**: 4 · **Track**: MOBILE-AI, AI, BACKEND
**Acceptance**:
- [ ] Optional nutrition fields per item (calories, protein, carbs, fat)
- [ ] Auto-estimate via USDA FoodData Central + Bedrock fallback
- [ ] Display on item detail

### F-302: Daily intake tracking
**Wave**: 4 · **Track**: MOBILE-CORE, BACKEND
**Acceptance**:
- [ ] User can set daily goals (calories, macros)
- [ ] Sum nutrition from items marked eaten that day
- [ ] Visualization (rings or bars)
- [ ] Disclaimer: "Not medical advice"

### F-303: Diet plan support
**Wave**: 4 · **Track**: MOBILE-AI, AI
**Acceptance**:
- [ ] Pick diet (keto, vegetarian, mediterranean, etc.)
- [ ] Recipe suggestions filtered to diet
- [ ] Daily intake compared to diet's recommended ranges

## Wave 5 — Social & community (TBD)

### F-401: Recipe sharing within household
- Send recipe to a household member's saved list

### F-402: Public recipe gallery (opt-in, moderated)
- Share recipe publicly; others can copy to their library
- Moderation queue for inappropriate content

### F-403: Friend follow / social feed
- Follow friends; see their public recipes; comment + react

## Wave 6 — Platform

### F-501: Public REST API
**Wave**: 6 · **Track**: BACKEND
**Acceptance**:
- [ ] OAuth 2.0 with scoped tokens
- [ ] Endpoints: `/v1/items`, `/v1/households`, etc.
- [ ] Rate limiting per token
- [ ] OpenAPI documentation

### F-502: Webhooks
**Wave**: 6 · **Track**: BACKEND
**Acceptance**:
- [ ] User-configured webhook endpoints
- [ ] Events: `item.created`, `item.expired`, `item.eaten`, etc.
- [ ] HMAC signing
- [ ] Retry with exponential backoff

### F-503: MCP server
**Wave**: 6 · **Track**: BACKEND
**Acceptance**:
- [ ] HTTP/SSE MCP server hosted at `mcp.whatsforlunch.app`
- [ ] Tools: `list_items`, `create_item`, `mark_eaten`, `get_recipes`, `get_household_status`
- [ ] User authenticates with scoped Cognito token
- [ ] Documented for Claude / OpenAI / etc.

### F-504: Smart home integrations
**Wave**: 6 · **Track**: BACKEND
**Acceptance**:
- [ ] Alexa skill: "What's expiring today?"
- [ ] Google Home action: same
- [ ] Samsung Family Hub integration (if API available)

## Phase 10 — Hardware (separate track)

### F-601: Custom containers with permanent QR
- Branded containers with laser-etched or printed QR codes on lids
- No electronics, no indicator lights
- Sold in 6-pack and 12-pack via Shopify or direct

### F-602: Possible Bluetooth temp sensor cartridge
- Only if customer demand validates
- Sealed cartridge, dishwasher-friendly via removal

## Cross-cutting requirements

These apply to every feature:

### CC-01: Real data, no mocks in production
- Every feature must wire to real AWS services
- Mocks only for unit tests
- E2E tests run against ephemeral CDK stack with real services

### CC-02: Accessibility tested
- Every feature passes VoiceOver + TalkBack manual test before "done"

### CC-03: Sentry-instrumented
- Every feature has crash reporting
- Critical paths have transaction tracing

### CC-04: Analytics-instrumented
- Every feature emits PostHog events for funnel analysis

### CC-05: Performance budget
- Every feature respects: 60fps animations, < 500ms API p95, < 2s cold start

### CC-06: Localization-ready
- Every UI string in i18n catalog (`en.json`)
- Even at MVP (EN only), strings are externalized for future locales

### CC-07: Tested with offline
- Every feature works (or degrades gracefully) when offline

## Definition of "done" for any feature

A feature is done when:
1. Code merged to main
2. Acceptance criteria all checked
3. Unit tests added and passing
4. E2E test added (Maestro flow)
5. Sentry + PostHog wired
6. Accessibility tested (VoiceOver + TalkBack)
7. Dark mode verified
8. Documented in this catalog (and any related docs)
9. Reviewed by another worker
10. Deployed to staging
11. Smoke-tested on real devices (iOS + Android)
12. Promoted to production via canary

## Cross-references

- Architecture each feature relies on → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- API contracts → [03_API_SPEC.md](03_API_SPEC.md)
- UI specs → [05_UI_UX.md](05_UI_UX.md)
- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
