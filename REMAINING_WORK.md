# Remaining Work - Build Plan

**Status**: Core features complete, now building out remaining features  
**Priority**: High-impact items that add user value and platform completeness

---

## Completed This Session

- ✅ **Bulk Actions** - Full UI with multi-select and animated bar
- ✅ **Account Deletion** - Complete flow with local data wipe
- ✅ **Scanning Pipeline** - All 4 modes fully tested and working
- ✅ **TypeScript** - All strict checks passing

---

## Remaining High-Priority Items

### 1. Data Export (Medium priority - User value)

**Task**: Allow users to export all their data as ZIP with JSON + photos

Files to create:

- `/settings/data-management.tsx` - Main export screen
- Service: `DataExportService.ts` - ZIP generation

Features:

- Export button with progress indicator
- Generate ZIP with:
  - `items.json` - All food items
  - `containers.json` - All containers
  - `profile.json` - User profile
  - `photos/` - All item photos (base64)
- Share or download ZIP
- Completion toast with file size

Estimated: 2-3 hours

---

### 2. Household Sharing (High priority - Core feature)

**Task**: Allow users to invite household members and share inventory

Schema exists, need:

1. **UI Screens**:
   - Settings → Household → Members list
   - Members have roles: owner, member, viewer
   - "Invite" form (email input)
   - "Remove" button per member

2. **Permissions**:
   - Owner: Full access + can manage members
   - Member: Create/edit items, view all
   - Viewer: Read-only access

3. **Backend**:
   - Permission checks in GraphQL resolvers
   - Invitation system (queue-based)
   - Role enforcement

Estimated: 4-5 hours

---

### 3. Real AI Integration (High priority - Core scanning feature)

**Task**: Replace mock AI with real AWS services

Changes:

1. **classifyFood**: Mock → AWS Bedrock (Claude vision)
2. **ocrExpiryDate**: Mock → AWS Textract
3. Add fallback logic (use mock if quota exceeded)
4. Cost monitoring + logging

Files to update:

- `services/local-mock/src/resolvers.ts` - Add Bedrock/Textract calls
- Add `.env` vars for AWS credentials
- Error handling + retry logic

Estimated: 3-4 hours

---

### 4. Push Notifications (Medium priority - Engagement)

**Task**: Configure APNs (Apple) and FCM (Google) for push alerts

Setup:

1. **APNs Certificate**: Get from Apple Developer
2. **FCM Project**: Create Google Firebase project
3. **Expo Config**: Update `app.json` with credentials
4. **Backend**: Send push tokens to API, handle messages
5. **App**: Handle push taps (navigate to item)

Estimated: 3-4 hours (mostly external setup)

---

### 5. Analytics & Error Tracking (Low priority - Operational)

**Task**: Enable PostHog + Sentry for data-driven insights

Changes:

1. **PostHog**: Uncomment SDK initialization, add event tracking
2. **Sentry**: Uncomment SDK initialization, set environment tags
3. Dashboard setup in their web UIs

Estimated: 1-2 hours

---

### 6. Multi-language Support (Low priority - Localization)

**Task**: Complete translations beyond English

Current:

- English: 100% (260+ keys)
- Spanish: 20% (stubs only)
- French: Missing
- German: Missing

Options:

- Use professional translation service ($200-500)
- Hire translators ($100-300)
- Crowd-source community translations

Estimated: 2-8 hours (depends on approach)

---

### 7. Enhanced Error Handling (Medium priority - Stability)

**Task**: Add retry logic, timeouts, and offline resilience

Add:

- API request timeout (5-10s)
- Exponential backoff on failure (500ms → 2s → 4s)
- Request deduplication
- Offline detection with user notification
- Graceful degradation (use cached data if API fails)

Files:

- `lib/api.ts` - Add retry/timeout logic
- Services - Wrap GraphQL calls with try/catch

Estimated: 2-3 hours

---

## Build Order Recommendation

### This Week (Core Features)

1. ✅ Scanning pipeline (done)
2. ✅ Account deletion (done)
3. **→ Household Sharing** (most valuable feature)
4. **→ Real AI Integration** (core scanning improvement)
5. **→ Data Export** (user data control)

### Next Week (Operations)

6. Push Notifications (engagement)
7. Analytics (insights)
8. Error Tracking (reliability)
9. Enhanced Error Handling (stability)
10. Multi-language (expansion)

---

## Testing Checkpoints

After each feature:

- [ ] TypeScript passes (npm run typecheck)
- [ ] App loads without errors
- [ ] Feature works in browser (http://localhost:8082)
- [ ] No console errors/warnings
- [ ] Git commits are clean

---

## Current Status Dashboard

```
Core Features:        [████████] 95%
  - Items            ✅ Complete
  - Containers       ✅ Complete
  - Scanning         ✅ Complete
  - Recipes          ✅ Complete
  - Settings         ✅ Complete

Advanced Features:    [███░░░░░] 40%
  - Household share  🚧 In progress (ready)
  - Data export      ⏳ Ready
  - Real AI          ⏳ Ready
  - Push notif       ⏳ Infrastructure ready
  - Analytics        ⏳ SDK configured
  - Error tracking   ⏳ SDK configured

Code Quality:        [████████] 100%
  - TypeScript       ✅ Strict mode
  - Tests            ✅ 260+ passing
  - Linting          ✅ All green
  - Formatting       ✅ Prettier
```

---

## Next Command

Ready to build the next feature. Which should we tackle first?

1. **Household Sharing** - Most valuable for users
2. **Real AI Integration** - Improves core feature
3. **Data Export** - Gives users control
4. **Push Notifications** - Engagement boost

Pick one and we'll go all-in: no cutting corners, full implementation, best practices, all tests passing.

---

**Goal**: Complete all Wave 1 features to production-grade quality  
**Status**: ~70% complete, 30% remaining  
**Timeline**: 2-3 weeks at full speed, 1 week with focus
