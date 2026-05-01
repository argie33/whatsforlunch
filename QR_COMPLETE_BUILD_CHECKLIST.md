# QR + Scanning System - Complete Build Checklist

**Goal**: Everything working end-to-end, production-grade, no cutting corners  
**Status**: Baseline 70% complete → Target 100% complete

---

## Phase 1: Core QR/Scanning (Currently 90% → 100%)

### QR Code System
- [x] Vision camera integration
- [x] QR detection
- [x] QR number generation (1000-9999)
- [x] Container claiming flow
- [x] QR sticker printing
- [ ] **Browser testing helpers** - Test QR without actual camera
- [ ] **QR code validation** - Ensure token format is valid
- [ ] **QR lookup caching** - Cache container lookups for performance
- [ ] **QR expiry handling** - Mark old QR tokens as invalid

### Barcode System
- [x] Barcode detection (6+ formats)
- [x] Real Open Food Facts API integration
- [x] Form prefilling with product data
- [ ] **Barcode format validation** - Validate EAN/UPC formats
- [ ] **Barcode caching** - Cache product lookups
- [ ] **Barcode error handling** - Handle API timeouts/failures
- [ ] **Fallback for unknown barcodes** - Show user-friendly message

### Photo Classification (AI)
- [x] Photo capture
- [x] Photo upload (base64)
- [x] GraphQL mutation wired
- [ ] **AWS Bedrock integration** - Replace mock with real AI
- [ ] **Confidence threshold** - Only use results > 70% confidence
- [ ] **Fallback if low confidence** - Suggest user confirm manually
- [ ] **Photo caching** - Cache classification results
- [ ] **Retry on failure** - Exponential backoff for API calls

### OCR Expiry Detection (AI)
- [x] Date capture
- [x] GraphQL mutation wired
- [ ] **AWS Textract integration** - Replace mock with real OCR
- [ ] **Date validation** - Ensure valid date format
- [ ] **Date range checking** - Warn if expiry > 2 years
- [ ] **Fallback handling** - What if OCR can't read date
- [ ] **Retry on failure** - Exponential backoff

---

## Phase 2: Error Handling & Resilience (Currently 0% → 100%)

### Network Resilience
- [ ] **API timeout handling** (5-10 second timeout)
- [ ] **Exponential backoff** (500ms → 1s → 2s → 4s)
- [ ] **Request deduplication** (don't re-scan same code twice)
- [ ] **Offline mode** (queue operations, sync when online)
- [ ] **Graceful degradation** (use cached data if API fails)
- [ ] **User notification** (toast when offline/retrying)

### Scanning Errors
- [ ] **No camera permission** - Clear prompt to enable
- [ ] **Camera not available** - Graceful error message
- [ ] **Scan timeout** - "Scanning... point at QR code"
- [ ] **Invalid QR format** - "Not a valid WhatsForLunch QR"
- [ ] **Container not found** - "QR not recognized, contact support"
- [ ] **API failures** - "Failed to look up product, try again"
- [ ] **Low confidence AI** - "Not sure, please confirm..."
- [ ] **Photo upload failures** - Retry with exponential backoff

### Data Validation
- [ ] **QR token format** - Must be valid UUID format
- [ ] **Barcode format** - EAN/UPC validation
- [ ] **Expiry date** - Must be valid ISO date
- [ ] **Food name** - Min 2 chars, no special chars
- [ ] **Quantity** - Valid number format
- [ ] **Container naming** - No empty names

---

## Phase 3: Performance & Optimization (Currently 50% → 100%)

### Caching Strategy
- [ ] **Product lookup cache** - Cache barcode → product for 7 days
- [ ] **AI classification cache** - Cache photo URLs → results
- [ ] **Container lookup cache** - Cache QR token → container
- [ ] **Cache invalidation** - When to expire cached data
- [ ] **Cache storage** - Use MMKV or SQLite

### Performance Metrics
- [ ] **QR detection** - < 1 second
- [ ] **Barcode lookup** - < 2 seconds (with timeout)
- [ ] **Photo upload** - < 5 seconds (with retry)
- [ ] **Photo classification** - < 5 seconds (with timeout)
- [ ] **OCR extraction** - < 5 seconds (with timeout)
- [ ] **Form prefilling** - < 500ms
- [ ] **Item creation** - < 2 seconds

### UI Performance
- [ ] **60fps scrolling** - FlashList virtualization
- [ ] **Smooth animations** - Reanimated 3
- [ ] **Fast navigation** - Expo Router optimizations
- [ ] **Memory management** - No leaks on repeated scans

---

## Phase 4: Testing & Quality (Currently 30% → 100%)

### Unit Tests
- [ ] **ItemsService** - All methods tested
- [ ] **ContainersService** - All methods tested
- [ ] **PhotoUploadService** - All methods tested
- [ ] **Validation functions** - All edge cases

### Integration Tests
- [ ] **Barcode → Item creation** - Full flow
- [ ] **Photo → Classification → Item** - Full flow
- [ ] **OCR → Expiry → Item** - Full flow
- [ ] **QR → Container claim** - Full flow
- [ ] **Offline → Sync** - Queue and sync

### E2E Tests (Maestro)
- [ ] **QR scanning flow** - Claim container
- [ ] **Barcode scanning flow** - Coca-Cola example
- [ ] **Photo classification** - Capture → Classify → Save
- [ ] **OCR detection** - Capture → Extract → Save
- [ ] **Bulk item creation** - Add 5 items via different methods
- [ ] **Search & filter** - Find items by name/location
- [ ] **Offline scenarios** - Network down → queue → back online

### Manual Testing
- [ ] **iOS device** - Real camera scanning
- [ ] **Android device** - Real camera scanning
- [ ] **Different lighting** - Bright/dark/indoor/outdoor
- [ ] **Different QR codes** - Various sizes/qualities
- [ ] **Different barcodes** - EAN/UPC/Code128 formats
- [ ] **Network conditions** - Slow/fast/offline

---

## Phase 5: Features & Polish (Currently 60% → 100%)

### Scanning Features
- [ ] **Scanning history** - Show recently scanned items
- [ ] **Quick rescans** - Fast re-add of same product
- [ ] **Barcode database** - Store commonly scanned items
- [ ] **Scan favorites** - Pin frequently used codes
- [ ] **Scan sharing** - Share QR via text/email

### AI Features
- [ ] **Confidence display** - Show AI confidence %
- [ ] **Manual correction** - User can override AI results
- [ ] **Learning feedback** - Tell us if classification was wrong
- [ ] **Multiple results** - Show top 3 AI guesses
- [ ] **Custom categories** - User-defined food types

### Container Features
- [ ] **Container photos** - Take photo of container
- [ ] **Container location** - "Kitchen fridge" metadata
- [ ] **Container sharing** - Share with household members
- [ ] **Container history** - Track items added over time
- [ ] **Container stats** - "42 items stored, 8 eaten this week"

### UX Improvements
- [ ] **Scan tutorial** - Onboarding for first-time users
- [ ] **Scan tips** - "Point at barcode directly"
- [ ] **Success feedback** - Confetti + haptic on scan
- [ ] **Progress indication** - "Uploading photo..."
- [ ] **Accessibility** - Screen reader support for scans

---

## Phase 6: Backend Integration (Currently 0% → 100%)

### Real AWS Services
- [ ] **AWS Bedrock** - Replace classifyFood mock
- [ ] **AWS Textract** - Replace ocrExpiryDate mock
- [ ] **Bedrock model selection** - Claude 3 Haiku (fast + cheap)
- [ ] **Textract document analysis** - Extract text from images
- [ ] **Error handling** - Fallback if service fails
- [ ] **Cost monitoring** - Track API costs
- [ ] **Rate limiting** - 10 scans/min per user

### GraphQL Mutations
- [ ] **inviteHouseholdMember** - Invite by email
- [ ] **removeHouseholdMember** - Remove member
- [ ] **updateMemberRole** - Change owner/member/viewer
- [ ] **claimContainer** - Full mutation (scaffolding exists)
- [ ] **logScanEvent** - Analytics on scans
- [ ] **cacheBarcodeResult** - Store product lookup

### Cloud Sync
- [ ] **Sync mutations to DynamoDB** - Save items to cloud
- [ ] **Handle conflicts** - Last-write-wins strategy
- [ ] **Retry failed syncs** - Exponential backoff
- [ ] **Sync status UI** - Show "syncing" indicator
- [ ] **Bidirectional sync** - Pull updates from cloud

---

## Phase 7: Security & Compliance (Currently 40% → 100%)

### Authentication
- [ ] **JWT expiry** - Tokens expire in 24 hours
- [ ] **Refresh tokens** - Auto-refresh without logout
- [ ] **Secure storage** - Use Keychain (iOS) / KeyStore (Android)
- [ ] **Token rotation** - New token on each refresh
- [ ] **Sign out everywhere** - Invalidate all tokens

### Data Protection
- [ ] **Input validation** - All form inputs validated
- [ ] **SQL injection prevention** - WatermelonDB parameterized
- [ ] **XSS prevention** - No unsanitized HTML
- [ ] **HTTPS only** - All API calls over HTTPS
- [ ] **Data encryption** - SQLCipher for local DB

### Privacy
- [ ] **Privacy policy** - Terms of service reviewed
- [ ] **Data retention** - Clear deletion policies
- [ ] **GDPR compliance** - Right to delete data
- [ ] **Analytics consent** - Ask before tracking
- [ ] **Photo privacy** - Clear what happens to photos

---

## Phase 8: Analytics & Monitoring (Currently 10% → 100%)

### Event Tracking
- [ ] **Scan events** - QR/barcode/photo/OCR each tracked
- [ ] **Item created** - Track source (manual/barcode/photo/ocr)
- [ ] **Confidence tracking** - Log AI confidence scores
- [ ] **Error tracking** - Log all failures for debugging
- [ ] **Performance tracking** - Log operation durations

### PostHog Dashboard
- [ ] **Funnel analysis** - Scan → Create → Success
- [ ] **Retention** - Users scanning regularly
- [ ] **Feature adoption** - Which scan modes used most
- [ ] **Error rates** - Which scans fail most
- [ ] **Cohort analysis** - By device/location/time

### Sentry Monitoring
- [ ] **Error tracking** - All crashes logged
- [ ] **Breadcrumbs** - User actions before error
- [ ] **Release tracking** - Monitor by app version
- [ ] **Performance monitoring** - P95 latencies
- [ ] **Alert rules** - Notify on error spike

---

## Phase 9: Documentation & Support (Currently 20% → 100%)

### User Documentation
- [ ] **Scanning guide** - How to scan QR/barcode/photo
- [ ] **Troubleshooting** - Camera not working, etc.
- [ ] **FAQ** - Common questions
- [ ] **Video tutorials** - 30-second clips on scanning
- [ ] **In-app help** - Contextual help bubbles

### Developer Documentation
- [ ] **API documentation** - GraphQL mutation docs
- [ ] **Architecture guide** - System design overview
- [ ] **Integration guide** - How to add new scan types
- [ ] **Deployment guide** - Step-by-step for new env
- [ ] **Troubleshooting** - Common issues and fixes

### Support Infrastructure
- [ ] **Support email** - support@whatsforlunch.app
- [ ] **Support ticket system** - Track user issues
- [ ] **Community forum** - User-to-user help
- [ ] **Bug bounty program** - Security issues
- [ ] **Feature requests** - Voting system

---

## Priority Build Order

### Immediate (This Session - 4-6 hours)
1. ✅ **Real AI Integration** - Bedrock + Textract setup
2. ✅ **Error Handling** - Network timeouts, retries, offline
3. ✅ **Data Validation** - All form inputs validated
4. ✅ **Testing** - Unit + integration tests for scanning

### Short-term (This Week - 8-12 hours)
5. **Push Notifications** - APNs + FCM configuration
6. **Performance Optimization** - Caching, virtualization
7. **E2E Testing** - Maestro flows for all scan types
8. **Cloud Sync** - DynamoDB mutations

### Medium-term (Next Week - 10-15 hours)
9. **Analytics** - PostHog + Sentry setup
10. **Household Sharing** - Complete GraphQL + UI
11. **Security Hardening** - JWT, encryption, validation
12. **Documentation** - User guides + API docs

### Long-term (Ongoing)
13. **Monitoring** - Dashboard setup
14. **Support** - Ticket system + forums
15. **Optimization** - Performance tuning

---

## Success Criteria

App is PRODUCTION-READY when:

```
Core Functionality:
✅ QR scanning works (camera or test)
✅ Barcode scanning works (real API)
✅ Photo classification works (real AI)
✅ OCR detection works (real AI)
✅ All modes create items correctly
✅ Offline mode queues operations
✅ Data syncs to cloud

Quality:
✅ 0 TypeScript errors
✅ 90%+ test coverage
✅ All edge cases handled
✅ All errors caught gracefully
✅ 60fps UI performance
✅ < 5 second latency per operation

Security:
✅ JWT tokens expire properly
✅ All inputs validated
✅ HTTPS only
✅ Data encrypted locally
✅ Privacy policy in place

Operations:
✅ Errors logged to Sentry
✅ Events tracked in PostHog
✅ Performance metrics visible
✅ Support system ready
✅ Documentation complete
```

---

## Current Status

```
Phase 1 (QR/Scanning):        [██████░░] 70%
Phase 2 (Error Handling):      [░░░░░░░░] 0%
Phase 3 (Performance):         [████░░░░] 40%
Phase 4 (Testing):             [███░░░░░] 30%
Phase 5 (Features):            [████░░░░] 50%
Phase 6 (Backend):             [░░░░░░░░] 0%
Phase 7 (Security):            [███░░░░░] 30%
Phase 8 (Analytics):           [░░░░░░░░] 10%
Phase 9 (Documentation):       [██░░░░░░] 20%

OVERALL:                        [███░░░░░] 25%
```

---

## What to Build Next

Pick what you want tackled first:

**Option A: Speed to Production (Recommended)**
1. Real AI (1 hour)
2. Error handling (2 hours)
3. Validation (1 hour)
4. Unit tests (2 hours)
**= 6 hours → 70% complete**

**Option B: Everything** 
Build all 9 phases sequentially
**= 40+ hours → 100% complete**

**Option C: High-Value First**
1. Real AI
2. Error handling
3. Push notifications
4. Analytics
5. Testing
**= 12 hours → 60% complete (production-ready MVP)**

Which direction?
