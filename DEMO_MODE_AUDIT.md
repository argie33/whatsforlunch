# 🔍 Complete Demo/Mock Feature Audit

**Date**: 2026-05-02  
**Status**: All test infrastructure fixed, 260+ tests passing  
**Goal**: Identify all demo/mock features that need to be made real

---

## 📊 Executive Summary

| Category | Count | Priority | Impact |
| -------- | ----- | -------- | ------ |
| **AI/ML Features** | 3 | HIGH | Core functionality |
| **Infrastructure** | 2 | HIGH | Data persistence |
| **Notifications** | 1 | MEDIUM | UX polish |
| **Web Content** | 1 | LOW | Marketing site |
| **Analytics** | 1 | MEDIUM | Business insights |
| **Total Demo Items** | 8 | - | - |

---

## 🤖 AI/ML Features (3 items) — HIGH PRIORITY

### 1. **Food Classification (Photo AI)** ⚠️ CRITICAL
- **Location**: `services/local-mock/src/ai-service.ts:43-88`
- **Current Status**: Mock returns random food from hardcoded list
- **What It Returns**:
  ```ts
  // Currently returns one of:
  - Greek Yogurt (dairy, 14 days, 85% confidence)
  - Leftover Pasta (prepared, 4 days, 85% confidence)
  - Baked Chicken (protein, 3 days, 92% confidence)
  - Fresh Berries (produce, 5 days, 85% confidence)
  ```
- **Should Return**: Actual food classification from uploaded image using Claude API or AWS Bedrock
- **Impact**: Core app feature - users can't identify food from photos
- **Fix Timeline**: 2-3 hours (already has Claude API integration)
- **Files to Update**:
  - `services/local-mock/src/ai-service.ts` → `classifyFood()` method
  - Ensure real Claude API or Bedrock is called instead of mock

### 2. **Recipe Generation** ⚠️ CRITICAL
- **Location**: `services/local-mock/src/ai-service.ts:101-114`
- **Current Status**: Generates 1 simple mock recipe
- **What It Returns**:
  ```ts
  {
    title: `Quick ${items} Stir Fry`,
    summary: "A simple and delicious stir fry using available ingredients",
    cuisine: "asian",
    durationMinutes: 20,
    difficulty: "easy",
    servings: 4,
    missingIngredients: ["soy sauce", "garlic"],
    steps: ["Heat oil", "Add ingredients", "Stir and cook"]
  }
  ```
- **Should Return**: 5+ creative recipes using Claude API based on household items
- **Impact**: Users see repetitive "Stir Fry" recipes instead of varied meal ideas
- **Fix Timeline**: 1-2 hours (Claude API integration exists)
- **Files to Update**:
  - `services/local-mock/src/ai-service.ts` → `generateRecipes()` method
  - `services/local-mock/src/resolvers.ts:377-402` (recipe endpoint)

### 3. **Expiry Date OCR** ⚠️ MEDIUM
- **Location**: `services/local-mock/src/ai-service.ts:90-99`
- **Current Status**: Returns random date 7-37 days from today
- **What It Returns**:
  ```ts
  {
    expiryDate: "2026-05-XX", // Random date +7-37 days
    confidence: 0.9,
    source: "mock"
  }
  ```
- **Should Return**: Actual expiry date read from product packaging photo using Claude API
- **Impact**: Users manually enter expiry dates instead of scanning
- **Fix Timeline**: 1-2 hours
- **Files to Update**:
  - `services/local-mock/src/ai-service.ts` → `ocrExpiryDate()` method
  - Enable Claude API-based text extraction from images

---

## 🏗️ Infrastructure (2 items) — HIGH PRIORITY

### 4. **Image Upload S3 Integration** ⚠️ CRITICAL
- **Location**: Backend resolvers - S3 bucket integration missing
- **Current Status**: Presigned URLs mocked, real S3 not integrated
- **What Happens Now**: Photo uploads fail silently without real AWS
- **Should Happen**: Photos stored in real S3 bucket with signed URLs
- **Impact**: Food photo features completely broken in production
- **Fix Timeline**: 2-3 hours (infrastructure already scaffolded)
- **Files to Update**:
  - `infra/cdk/lib/appsync/resolvers/Mutation.uploadImage.js`
  - `apps/mobile/src/services/PhotoUploadService.ts`
  - Need: Real S3 bucket, IAM permissions, presigned URL generation

### 5. **Real-Time Subscriptions (WebSocket)** ⚠️ DEFERRED
- **Location**: `apps/mobile/src/services/SyncService.ts:60` (TODO comment)
- **Current Status**: AppSync subscriptions disabled for local dev
- **What Happens Now**: Polling every 30s when app comes to foreground (sufficient for MVP)
- **Should Happen**: WebSocket subscriptions for true real-time multi-user sync
- **Impact**: Delayed updates in shared households (30s latency)
- **Fix Timeline**: Phase C.2 (2-3 hours) — NOT BLOCKING MVP
- **Note**: Workaround (polling) is acceptable for initial release
- **Files to Update**:
  - `apps/mobile/src/services/SyncService.ts` → Enable WebSocket subscriptions
  - Configure AWS AppSync connection in prod

---

## 🔔 Notifications (1 item) — MEDIUM PRIORITY

### 6. **Push Notifications (Expiry Reminders)** ⏳ DEFERRED
- **Location**: `services/notify-expiring/` Lambda exists but FCM/APNS not wired
- **Current Status**: Backend logic exists, but mobile client can't receive notifications
- **What Happens Now**: No alerts for expiring items
- **Should Happen**: Firebase Cloud Messaging (FCM) for Android + Apple Push Notification Service (APNS) for iOS
- **Impact**: Users miss expiry dates — core feature broken
- **Fix Timeline**: 3-4 hours after Phase C.1
- **Files Involved**:
  - Mobile: FCM/APNS setup in Expo (`expo-notifications`)
  - Backend: Lambda configuration in CDK
  - Don't ship without this for App Store approval

---

## 🎨 Web Content (1 item) — LOW PRIORITY

### 7. **Landing Page Screenshot Placeholder** 📸 COSMETIC
- **Location**: `apps/web/src/components/Hero.astro:67`
- **Current Status**: Generic app screenshot placeholder
- **What Shows**: Default "app screenshot placeholder" comment
- **Should Show**: Real screenshots from App Store release
- **Impact**: Marketing/landing page looks unfinished
- **Fix Timeline**: 1 hour (day before launch)
- **Files to Update**:
  - `apps/web/src/components/Hero.astro` → Replace placeholder with actual screenshots

---

## 📊 Analytics (1 item) — MEDIUM PRIORITY

### 8. **PostHog Integration Status** 📈 NEEDS VERIFICATION
- **Location**: `apps/mobile/src/features/settings/analytics.ts` + PostHog SDK
- **Current Status**: Integrated but not verified in production
- **What's Working**: Event tracking in app (analytics events firing)
- **What's Untested**: PostHog dashboard receiving events, cohort analysis
- **Impact**: No visibility into user behavior post-launch
- **Fix Timeline**: 2 hours (testing + dashboard setup)
- **Files Involved**:
  - Verify PostHog API key in production environment
  - Test: Create event in app → check PostHog dashboard
  - Setup: User cohorts, funnel analysis, retention metrics

---

## 🧪 Summary by Area

### **Backend (services/)**
```
✅ Database (DynamoDB Local mock)
✅ Authentication (JWT + Cognito mock)
✅ GraphQL API (all resolvers functional)
❌ AI Service (mock implementations)
❌ Image Storage (S3 integration missing)
❌ Real-Time Sync (subscriptions disabled)
✅ Notifications Lambda (exists, not integrated)
```

### **Mobile (apps/mobile/)**
```
✅ All UI screens fully built
✅ WatermelonDB sync engine working
✅ Authentication flow working
❌ Photo upload (no real S3)
❌ AI features (mock only)
❌ Push notifications (not configured)
✅ Local storage working
✅ Offline support working
```

### **Web (apps/web/)**
```
✅ Marketing site built
❌ App screenshots (placeholders)
```

---

## 🚀 Recommended Priority Order

**Phase 1 (Before Launch):**
1. ✅ Food Classification — replace mock with real Claude API
2. ✅ Recipe Generation — replace mock with real Claude API  
3. ✅ Expiry Date OCR — replace mock with real Claude API
4. ✅ S3 Image Upload — wire real AWS integration
5. ✅ Push Notifications — configure FCM/APNS

**Phase 2 (Week 2 post-launch):**
6. Real-Time WebSocket subscriptions
7. PostHog analytics verification

**Phase 3 (Day before App Store launch):**
8. Landing page screenshots

---

## 📋 Quick Reference: Mock Data Locations

| Feature | File | Method | Mock Data |
| ------- | ---- | ------ | --------- |
| Food Classification | `ai-service.ts:73-88` | `mockClassifyFood()` | 4 hardcoded foods |
| Recipe Generation | `ai-service.ts:101-114` | `mockGenerateRecipes()` | 1 stir fry template |
| Expiry OCR | `ai-service.ts:90-99` | `mockOCRExpiryDate()` | Random date +7-37d |
| Photo Upload | `PhotoUploadService.ts` | `uploadImage()` | Presigned URL mock |
| Subscriptions | `SyncService.ts:60` | `subscribe()` | Polling fallback |

---

## ✅ Verification Checklist

Before each feature goes "real", verify:

- [ ] Mock methods removed or wrapped in fallback
- [ ] Real API called on happy path
- [ ] Graceful fallback to mock if real API fails
- [ ] Tests updated to use real API (or mock it properly)
- [ ] Error handling for real API failures
- [ ] Performance impact measured (Claude API latency, S3 upload time)
- [ ] Type definitions match real API response

---

## 🔗 Related Docs

- `CRITICAL_BLOCKERS_&_HANDOFF.md` — Blocking issues
- `SESSION_LATEST_STATUS.md` — Current state snapshot  
- `LOCAL_DEV_COMPLETE.md` — How to run locally

