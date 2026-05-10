# Wave 2 — Sharing + Cooking (Plan)

**Wave Goal**: Enable multi-household sharing + real-time sync + AI recipe suggestions  
**Estimated Duration**: 2 weeks (parallel worker model)  
**Start Date**: 2026-05-02  
**Target Completion**: 2026-05-16

---

## Overview: 7 Features, 3 Phases

Wave 2 unlocks the core "sharing" experience: create households, invite partners, see updates in real-time, and get AI recipes from what's expiring.

### Features at a Glance

| Feature                           | Workers | Complexity | Priority               |
| --------------------------------- | ------- | ---------- | ---------------------- |
| **F-101: Households**             | W2, W6  | High       | P0 (blocks all others) |
| **F-102: Real-time sync**         | W2, W8  | High       | P0 (F-101 dependency)  |
| **F-103: Activity log**           | W2, W6  | Medium     | P1                     |
| **F-104: Recipe suggestions**     | W4, W2  | High       | P1                     |
| **F-105: Recipe library**         | W2, W6  | Medium     | P2                     |
| **F-106: Daily digest**           | W2      | Low        | P2                     |
| **F-107: AI preference learning** | W4, W2  | Medium     | P1                     |

---

## Critical Path

```
F-101 (Households) → F-102 (Real-time sync)
                  ↓
           F-103, F-104, F-107 (parallel)
                  ↓
           F-105, F-106 (final polish)
```

**Must complete F-101 before any other work can start.**

---

## Worker Assignments & Phases

### 🟦 W2 — Backend / Data (Lead on F-101, F-102, F-103, F-106, F-107)

#### F-101: Households (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Add `Household` entity to DynamoDB schema
  - PK: `HOUSEHOLD#{householdId}`, SK: `METADATA`
  - Fields: name, ownerId, createdAt, photoUrl, settingsJson
  - GSI: `GSI1PK=ownerId, GSI1SK=createdAt` (list households by owner)
- [ ] Add `HouseholdMember` entity
  - PK: `HOUSEHOLD#{householdId}`, SK: `MEMBER#{userId}`
  - Fields: role (owner/member/viewer), joinedAt, displayName
  - GSI: `GSI2PK=userId, GSI2SK=createdAt` (list user's households)
- [ ] Add `HouseholdInvite` entity
  - PK: `HOUSEHOLD#{householdId}`, SK: `INVITE#{token}`
  - Fields: invitedBy, createdAt, expiresAt (7 days), acceptedAt
  - TTL: expiresAt (auto-delete 7 days)
- [ ] Update Container & Item schemas: add `householdId` to all items (defaults to user's personal household)
- [ ] Zod schemas: HouseholdSchema, HouseholdMemberSchema, HouseholdInviteSchema

**Phase B (Days 4-10)**

- [ ] Mutations:
  - `createHousehold(name, photoUrl)` → returns Household + auto-add caller as owner
  - `updateHousehold(householdId, name, photoUrl)` → owner-only
  - `deleteHousehold(householdId)` → owner-only, cascades (soft-delete households + archive containers)
  - `inviteToHousehold(householdId) → returns inviteToken + 7-day expiry`
  - `acceptHouseholdInvite(token) → creates HouseholdMember with role=member`
  - `updateMemberRole(householdId, userId, role)` → owner-only
  - `removeMember(householdId, userId)` → owner or self
  - `transferOwnership(householdId, newOwnerId)` → owner-only
  - `leaveHousehold(householdId)` → self
- [ ] Queries:
  - `myHouseholds()` → all households for current user (sorted by role, then createdAt)
  - `householdDetail(householdId)` → full Household + MemberList (cross-tenant check)
  - `householdMembers(householdId)` → list with roles
- [ ] Authorization:
  - All mutations check: caller is householdMember AND role permits action
  - Add `checkHouseholdMembership(householdId, userId, minRole)` utility to appsync/functions/
- [ ] Resolvers: JS pipeline resolvers for all mutations + queries

**Phase C (Days 11-14)**

- [ ] Integration tests:
  - Create household → invite → accept flow
  - Owner can change roles, remove members
  - Non-owner cannot modify household
  - Invite tokens expire after 7 days
  - Deleting household archives containers + items
- [ ] Load test: 100 invites/minute + 50 accepts/minute (SLA: p99 <500ms)
- [ ] Audit logging: all mutations logged with actor + timestamp

---

#### F-102: Real-time Household Sync (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Update Item + Container mutations to include AppSync `onItemChanged`, `onContainerChanged` subscriptions
- [ ] Subscription filters: `householdId == $householdId`
- [ ] Define conflict resolution rules for multi-user edits (per `02_DATA_MODEL.md`)

**Phase B (Days 4-10)**

- [ ] Subscription resolvers:
  - `onItemChanged(householdId)` → emitted when item created/updated/deleted in household
  - `onContainerChanged(householdId)` → emitted when container changed
  - `onHouseholdMemberJoined(householdId)` → emitted when member added
- [ ] Implement conflict resolution in mutations:
  - Last-write-wins for most fields
  - Merge for arrays (e.g., tags)
  - Manual merge for quantity (user picks)
- [ ] Wire into SyncEngine: consume subscriptions + apply deltas

**Phase C (Days 11-14)**

- [ ] E2E tests:
  - Partner A adds item → Partner B receives within 2s
  - Simultaneous edits → resolve without crash
  - Offline → online → subscription catches up
- [ ] Performance: <2s latency, <100ms UI update

---

#### F-103: Activity Log (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Add `Activity` entity to schema
  - PK: `HOUSEHOLD#{householdId}`, SK: `ACTIVITY#{timestamp}#{actorId}`
  - Fields: actor (userId + displayName), action (itemCreated/itemUpdated/itemDeleted/memberJoined), resourceType, resourceId, resourceData (diff), timestamp

**Phase B (Days 4-10)**

- [ ] Auto-emit Activity records on all mutations (post-resolve hook)
- [ ] Query: `householdActivity(householdId, limit, startKey)` → paginated activity feed
- [ ] Filter by actor (optional parameter)

**Phase C (Days 11-14)**

- [ ] Tests: activity records created on all mutations
- [ ] Pagination works (1000+ records)

---

#### F-104: Recipe Suggestions (W4 Lead, W2 Support)

See W4 section below.

---

#### F-106: Daily Digest (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Add `DigestSchedule` to user Profile
  - Fields: enabled (boolean), time (HH:MM), timezone, lastSent (timestamp)

**Phase B (Days 4-10)**

- [ ] EventBridge cron: daily at user's preferred time
- [ ] Lambda `send-digest`:
  - Query expiring items in all user's households (next 3 days)
  - Personalize message with dietary prefs
  - Send push notification + email
- [ ] Database: track digest sent + click-through

**Phase C (Days 11-14)**

- [ ] Tests: digest sent at correct time, personalizes based on prefs

---

#### F-107: AI Preference Learning (W4 Lead, W2 Support)

See W4 section below.

---

### 🟨 W4 — AI (Lead on F-104, F-107; Support F-102)

#### F-104: Recipe Suggestions (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Update RecipeResponse schema for AppSync
  - Fields: id, title, ingredients (with fridge-item links), steps, prepTime, servings, difficulty, image, matchScore, matchReason
- [ ] Eval suite: 20 test cases (expiring items + dietary prefs → recipe quality)

**Phase B (Days 4-10)**

- [ ] Lambda `generate-recipe`:
  - Input: householdId, dietaryPrefs (from user Profile), expiringItems (list)
  - Bedrock Sonnet prompt: "Given these expiring items and dietary restrictions, suggest 5 recipes"
  - Output: 5 recipes with confidence scores
  - Cache recipes for 2 hours (reduce Bedrock calls)
- [ ] Mutation: `generateRecipeSuggestions(householdId)` → returns recipes
- [ ] Query: `householdRecipes(householdId)` → all recipes (generated + saved)
- [ ] Cost tracking: log Bedrock calls → PostHog

**Phase C (Days 11-14)**

- [ ] E2E tests: generate recipes → user picks one → marks items as eaten
- [ ] Performance: <3s Bedrock response (including caching)
- [ ] Eval suite passes (recipe quality ≥0.7)

---

#### F-107: AI Preference Learning (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Add `LearnedPreferences` entity
  - PK: `USER#{userId}`, SK: `LEARNED_PREFERENCES`
  - Fields: topEaten (food → count), topTossed, cuisineAffinity (map of cuisine → score)

**Phase B (Days 4-10)**

- [ ] DynamoDB Streams → Lambda `learn-preferences`
  - Listen to Item updates (created/marked eaten/marked tossed)
  - Update LearnedPreferences counters
- [ ] Query: `myPreferences()` → returns topEaten, topTossed, cuisineAffinity
- [ ] Use in recipe suggestions: boost recipes matching user's top eaten foods

**Phase C (Days 11-14)**

- [ ] Tests: preferences update correctly
- [ ] Recipes ranked by learned preferences

---

### 🟩 W6 — Mobile Core (Lead on F-101, F-103 UI; Support F-102)

#### F-101: Households Mobile UI (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Create screens:
  - `HouseholdList` — grid of households (owner badge)
  - `CreateHousehold` — form (name, optional photo)
  - `HouseholdDetail` — name, photo, member list, invite button, settings
  - `InviteModal` — show invite link + copy button + QR code
  - `MemberList` — members with roles + action buttons (owner only)
- [ ] Navigation: add to (main) route group

**Phase B (Days 4-10)**

- [ ] Wire mutations:
  - Create: form → mutation → refresh list
  - Invite: generate token → show link + QR
  - Accept invite: deep-link handler (custom URL scheme `whatsfresh://invite/{token}`)
  - Update member role: role picker → mutation
  - Leave/remove member: confirm dialog → mutation
- [ ] Deep-link handling: intercept `whatsfresh://invite/{token}` → navigate to HouseholdDetail with token
- [ ] Auth check: redirect to login if needed

**Phase C (Days 11-14)**

- [ ] E2E tests (Maestro):
  - Create household flow
  - Invite partner (copy link + send)
  - Partner accepts via deep-link
  - Member list shows both users
  - Owner changes partner's role
- [ ] Accessibility: WCAG 2.1 AA all screens
- [ ] i18n: all strings in keys

---

#### F-103: Activity Log Mobile UI (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Create `ActivityFeed` screen under HouseholdDetail
  - Timeline layout: actor avatar + name, action text, timestamp, resource thumbnail

**Phase B (Days 4-10)**

- [ ] Query `householdActivity()` + pagination
- [ ] Filter by actor (optional)
- [ ] Format action text: "Alice added milk to Fridge" (i18n-friendly)

**Phase C (Days 11-14)**

- [ ] Tests: feed displays, pagination works, filter works

---

#### F-102: Real-time Sync Integration (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Review W8 SyncEngine for subscription handling
- [ ] Plan: SyncEngine subscribes to `onItemChanged(householdId)` in background

**Phase B (Days 4-10)**

- [ ] Integrate W8 subscription service with SyncEngine
- [ ] Test: item added by partner → appears in local DB within 2s

**Phase C (Days 11-14)**

- [ ] E2E tests: household sync scenario

---

#### F-104: Recipe UI (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Create `RecipeTab` screen under (main) navigation
  - "What can I make?" CTA
  - Recipe card layout: title, image, matchScore, matchReason, prep time

**Phase B (Days 4-10)**

- [ ] Query mutation `generateRecipeSuggestions()` on tab load
- [ ] Recipe detail screen: ingredients (link to fridge), steps, "I cooked this" button
- [ ] "I cooked this" → marks items as eaten, removes from fridge

**Phase C (Days 11-14)**

- [ ] E2E tests: generate → view → mark eaten

---

#### F-105: Recipe Library (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Add "Save recipe" + "Saved recipes" tab

**Phase B (Days 4-10)**

- [ ] Mutation: `saveRecipe(recipeId)`, `unsaveRecipe(recipeId)`
- [ ] Query: `mySavedRecipes()`
- [ ] Saved recipes searchable

**Phase C (Days 11-14)**

- [ ] Tests: save/unsave work

---

### 🟦 W8 — Mobile Sync (Lead on F-102 integration)

#### F-102: Sync Engine Integration (Phase A/B/C)

**Phase A (Days 1-3)**

- [ ] Review: SyncEngine already supports offline + conflict resolution
- [ ] Plan: add subscription consumer for `onItemChanged(householdId)` + `onContainerChanged(householdId)`

**Phase B (Days 4-10)**

- [ ] Implement subscription handler in SyncService
- [ ] Test: subscription receives delta → SyncEngine applies → local DB updated

**Phase C (Days 11-14)**

- [ ] E2E tests: partner A edits → partner B sees in <2s

---

## Phasing Timeline (Parallel Model)

| Week         | Phase A                | Phase B                                      | Phase C                     |
| ------------ | ---------------------- | -------------------------------------------- | --------------------------- |
| **May 2-8**  | F-101 DB + types       | F-101 mutations, F-102 subscriptions         | F-101/102 tests             |
| **May 9-16** | F-103, F-104 scaffolds | F-103 queries, F-104 recipes, F-107 learning | All features tests + polish |

**Critical dependency**: F-101 Phase B must complete before F-102, F-103, F-105 can start Phase B.

---

## Success Criteria (Definition of Done)

### F-101: Households

- [x] Create household with name + photo
- [x] Invite via shareable token (7-day expiry)
- [x] Accept invite via deep-link
- [x] Member list shows roles (owner/member/viewer)
- [x] Owner can change roles, remove members, delete household
- [x] Members can leave
- [x] Containers + items scoped to household
- [x] Handled correctly: 0 integration test failures

### F-102: Real-time Sync

- [x] Partner edits item → other sees within 2s
- [x] Simultaneous edits → conflict-free (last-write-wins or merge)
- [x] Offline → online → catches up
- [x] Handled correctly: 0 E2E test failures

### F-103: Activity Log

- [x] All mutations logged (actor, action, timestamp)
- [x] Visible in household settings feed
- [x] Filterable by member
- [x] Pagination works (1000+ records)

### F-104: Recipe Suggestions

- [x] "What can I make?" generates 5 recipes from expiring items
- [x] Recipes match user's dietary prefs + learned preferences
- [x] "I cooked this" marks items as eaten
- [x] Eval suite ≥0.7 quality score

### F-105: Recipe Library

- [x] Save AI recipes to favorites
- [x] Manually add recipes
- [x] Search + browse saved recipes

### F-106: Daily Digest

- [x] Morning push at user's time
- [x] Personalizes by dietary prefs
- [x] Tappable → dashboard or recipes

### F-107: AI Preference Learning

- [x] Learns top eaten + tossed foods
- [x] Cuisine affinity scores updated
- [x] Recipes boosted by learned prefs

---

## Risks & Mitigations

| Risk                           | Impact | Probability | Mitigation                            |
| ------------------------------ | ------ | ----------- | ------------------------------------- |
| Subscription latency >2s       | High   | Medium      | Pre-fetch recipes; cache aggressively |
| Conflict resolution edge cases | High   | Low         | Add automated fuzz tests              |
| Household sync race conditions | Medium | Low         | Pessimistic locking on edits          |
| Recipe quality < 0.7           | Medium | Medium      | Invest in Sonnet prompt engineering   |
| Deep-link invite UX broken     | Medium | Low         | Maestro E2E tests cover flows         |

---

## Success Checklist (End of Wave 2)

- [ ] 7 features implemented + tested
- [ ] 300+ tests passing (255 Wave 1 + 45+ Wave 2)
- [ ] All Maestro E2E flows passing
- [ ] Households + real-time sync working locally + in dev environment
- [ ] Recipes generating with ≥0.7 quality
- [ ] Activity log capturing all mutations
- [ ] Zero regressions to Wave 1 features
- [ ] All workers merged to main
- [ ] Deployment runbook updated

---

## Next Steps

1. ✅ Verify Wave 1 complete → Done
2. 🚀 Start F-101 immediately (W2 + W6)
3. 📋 Daily async standups in GitHub Discussions
4. 🔄 Bi-weekly sync (if needed for blockers)
