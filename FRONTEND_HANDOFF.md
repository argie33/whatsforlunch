# Frontend Work Handoff

## Current Status

- ✅ All 208 mobile tests passing
- ✅ TypeScript compilation succeeds
- ✅ App structure complete (Expo, React Native, Tamagui)
- ✅ Core database layer (WatermelonDB) operational
- ✅ Authentication working

## Critical Incomplete Features to Address

### 1. **Dashboard (index.tsx) - NEEDS COMPLETION**

**Current**: Simple form-based UI (242 lines)
**Issue**: Missing critical features from complex version (744 lines):

- [ ] FlashList virtualization for performance
- [ ] Swipeable item actions (delete, freeze, eat)
- [ ] BottomSheet for adding items (AddItemSheet component exists)
- [ ] Storage location filtering (fridge/freezer/pantry/all)
- [ ] Search functionality
- [ ] Multi-select bulk actions
- [ ] Sync status indicator
- [ ] Better grouping of items by expiry status

**Action**: Consider adopting the complex dashboard (`apps/mobile/app/(main)/index.complex.tsx`) which has all features implemented.

### 2. **Recipes Screen (recipes.tsx) - NEEDS COMPLETION**

**Current**: Basic implementation (220 lines)
**Missing**:

- [ ] Proper integration with getRecommendations query
- [ ] Recipe detail view
- [ ] Ingredient listing with sourcing (Instacart affiliate links)
- [ ] Rating/favoriting recipes
- [ ] Advanced recipe filtering
- [ ] Cooking steps UI

**Reference**: Complex version exists at `recipes.complex.tsx` (519 lines)

### 3. **Shopping List (shopping.tsx) - SIMPLE BUT FUNCTIONAL**

**Status**: Appears functionally complete (182 lines)

- Has both simple and complex versions that are similar size
- May need refinement but not blocking

### 4. **API Sync Integration - PARTIALLY COMPLETE**

**Status**: Database sync partially implemented
**Issues**:

- [ ] WebSocket subscriptions commented out (SyncService.ts TODO)
- [ ] Real-time updates not working
- [ ] Offline-first queue needs verification
- [ ] Conflict resolution needs testing

**Files**:

- `apps/mobile/src/services/SyncService.ts` - WebSocket support commented out
- `apps/mobile/src/services/SyncContext.ts` - Context exists but may be incomplete

### 5. **Photo Capture & AI Classification - NEEDS TESTING**

**Status**: scan.tsx exists with camera support, but needs end-to-end test
**Components**:

- [ ] Camera permission handling verified
- [ ] QR code scanning (implemented)
- [ ] Barcode scanning (implemented)
- [ ] Photo classification via AI (implemented via mutation)
- [ ] Date OCR via AI (implemented via mutation)

**Test**: Verify classifyFood and ocrExpiryDate mutations work with photo uploads

### 6. **Authentication - JWT TODO**

**Location**: `apps/mobile/src/features/auth/authService.ts` line ~87
**Issue**: JWT decoding not fully implemented (comment: "TODO: In future, decode JWT to get real user info")
**Impact**: Currently uses stored ID instead of decoding token

## Architecture Notes

### Two Parallel Implementations

Some screens have both simple and complex versions:

- `index.tsx` vs `index.complex.tsx` (dashboard)
- `recipes.tsx` vs `recipes.complex.tsx` (recipes)
- `shopping.tsx` vs `shopping.complex.tsx` (shopping - both similar)

**Decision needed**: Consolidate - either complete the complex version and use it, or delete the complex versions and finish the simple ones.

**Recommendation**: Use complex versions (they're more complete) or merge features from both.

### Database vs API Architecture

- **Simple screens**: Use API hooks (`useLocalAPIItems`)
- **Complex screens**: Use WatermelonDB directly (`useDatabase`)

Both work currently, but WatermelonDB is the intended "local-first" architecture.

## Quick Start for Next Developer

### Run Tests

```bash
pnpm test --filter @wfl/mobile
```

### Check TypeScript

```bash
pnpm typecheck --filter @wfl/mobile
```

### Run App

```bash
pnpm dev --filter @wfl/mobile
```

### Run API Server

```bash
pnpm dev --filter @wfl/local-mock
```

### Integration Tests (API)

```bash
pnpm integration-test --filter @wfl/local-mock
```

## API Status

✅ All integration tests passing (13/13)

- Sign in
- Create household
- Create item (via classifyFood - AI with mock fallback)
- Mark item eaten/tossed/frozen
- Get recipes (mock data)
- Shopping list
- Authorization/error handling

## Files to Focus On

1. `apps/mobile/app/(main)/index.tsx` - Dashboard (needs features)
2. `apps/mobile/app/(main)/recipes.tsx` - Recipes (needs features)
3. `apps/mobile/src/services/SyncService.ts` - Sync implementation
4. `apps/mobile/src/features/auth/authService.ts` - JWT TODO
5. `apps/mobile/app/(main)/scan.tsx` - Photo/AI integration (test it)

## What's Already Working

✅ Sign in / Authentication
✅ Household creation & management
✅ Item CRUD operations
✅ Item status changes (eaten/tossed/frozen)
✅ AI photo classification (via mock)
✅ Recipe recommendations (via mock)
✅ Shopping list management
✅ QR scanning for containers
✅ Database schema & WatermelonDB
✅ All 208 unit tests

## Next Steps (Priority Order)

1. Complete Dashboard with all features from complex version
2. Complete Recipes screen
3. Implement WebSocket sync in SyncService
4. Test photo upload & AI classification end-to-end
5. Complete JWT decoding in auth
6. Delete duplicate .complex.tsx files once consolidated

---

**Last Updated**: May 1, 2026
**Status**: Ready for frontend work
**Tests**: 208/208 passing ✅
**TypeScript**: No errors ✅
