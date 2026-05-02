# App Store Submission Checklist

**Status**: Pre-Wave 1 Polish complete. Ready for store enrollment.

---

## Phase 1: Pre-Submission Setup (1-2 days)

### App Configuration ✅

- [x] App name: "WhatsFresh"
- [x] Bundle ID (iOS): `app.whatsfresh.mobile`
- [x] Package (Android): `app.whatsfresh.mobile`
- [x] Version: 1.0.0
- [x] Icons (iOS + Android): Generated
- [x] Splash screen: Configured
- [x] Permissions configured:
  - [x] Camera (scan QR/barcodes/photos)
  - [x] Photo library (attach existing photos)
  - [x] Location (future: nearby restaurants)
  - [x] Contacts (household invites)
  - [x] Notifications (expiry alerts)

### App Configuration Remaining ⚠️

- [ ] Privacy Policy (HTML) — see template below
- [ ] Terms of Service (HTML)
- [ ] Support email: support@whatsfresh.app
- [ ] Website: https://whatsfresh.app
- [ ] Support/Contact form (in-app)

### Build Configuration ✅

- [x] EAS (Expo Application Services) configured in `eas.json`
- [x] Build profiles:
  - [x] preview (for internal testing)
  - [x] production (for store)
- [x] No local/mock services in production builds
- [x] Environment variables configured
- [x] TypeScript strict mode enabled
- [x] ESLint + Prettier configured
- [x] 260+ tests passing

---

## Phase 2: Prepare Store Listings (1-2 days)

### iOS App Store

#### Account Setup

- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App ID: `app.whatsfresh.mobile`
- [ ] Create App Store Connect certificate
- [ ] Create provisioning profiles
- [ ] Add team members if needed

#### App Information

- [ ] App name: "WhatsFresh"
- [ ] Subtitle: "Stop wasting food"
- [ ] Description (160 chars for search):
  ```
  Track your kitchen inventory, get AI-powered expiry alerts, and recipe suggestions to reduce food waste.
  ```
- [ ] Full description (up to 4000 chars):

  ```
  WhatsFresh helps you:
  • Track everything in your fridge, freezer, and pantry
  • Get AI-powered expiry date predictions
  • Scan QR codes on smart containers
  • Scan barcodes for instant product info
  • Scan photos to auto-identify food
  • Get smart recipe suggestions from what you have
  • Share household inventory with family
  • Get push notifications before food expires
  • Reduce food waste and save money

  Wave 1 Features:
  ✓ Core inventory tracking
  ✓ AI photo classification (Claude)
  ✓ Barcode scanning
  ✓ Expiration date OCR
  ✓ Smart QR codes for containers
  ✓ Household sharing
  ✓ Real-time sync + offline support
  ✓ Recipe recommendations
  ✓ Beautiful, accessible UI
  ```

- [ ] Keywords: "food waste, expiry dates, inventory, kitchen, recipe, fridge, pantry, smart home, sustainability"
- [ ] Category: "Lifestyle"
- [ ] Rating/Content: No objectionable content
- [ ] Age rating: 4+
- [ ] Privacy policy URL: https://whatsfresh.app/privacy
- [ ] License agreement: Custom (see below)
- [ ] Contact email: support@whatsfresh.app
- [ ] Website: https://whatsfresh.app
- [ ] Support URL: https://whatsfresh.app/support

#### Screenshots (Required)

- [ ] 2-5 screenshots per device (iPhone, iPad)
  - [ ] Dashboard with items
  - [ ] Scan QR code
  - [ ] Food classification
  - [ ] Recipes from items
  - [ ] Household sharing
- [ ] Text: Brief explanation of each screen
- [ ] Design: Must match current app UI

#### Preview Video (Optional)

- [ ] 30s demo video showing:
  - Login
  - Add item via photo
  - View dashboard
  - See recipe suggestion
  - Share household

---

### Google Play Store

#### Account Setup

- [ ] Enroll in Google Play Developer Program ($25 one-time)
- [ ] Create merchant account
- [ ] Add payment information

#### App Information

- [ ] App name: "WhatsFresh"
- [ ] Short description: "Stop wasting food. Track your kitchen inventory, get AI expiry alerts."
- [ ] Full description: (same as iOS, above)
- [ ] Category: "Lifestyle"
- [ ] Content rating: Questionnaire → 4+
- [ ] Privacy policy URL: https://whatsfresh.app/privacy
- [ ] Permissions justification: Auto-generated from app.json
- [ ] Contact email: support@whatsfresh.app

#### Screenshots (Required)

- [ ] 2-8 screenshots (per device type)
  - Phone, tablet, wearable
  - Same as iOS screenshots

#### Preview Video (Optional)

- [ ] Same as iOS

---

## Phase 3: Legal & Compliance (1-2 days)

### Privacy Policy Template

Create `docs/PRIVACY_POLICY.md` with:

- [ ] Data collected (photos, barcode data, location)
- [ ] How data is used (AI classification, recipe suggestions)
- [ ] Data retention (DynamoDB + S3)
- [ ] Third parties (AWS, Bedrock, Anthropic)
- [ ] User rights (export, delete account)
- [ ] Contact: privacy@whatsfresh.app

### Terms of Service Template

Create `docs/TERMS_OF_SERVICE.md` with:

- [ ] Usage rights and restrictions
- [ ] Limitation of liability
- [ ] Disclaimers (free tier, beta features)
- [ ] Acceptable use policy
- [ ] Modifications to service
- [ ] User content ownership
- [ ] Contact for legal: legal@whatsfresh.app

### Data Handling

- [ ] GDPR compliance:
  - [ ] Clear data collection disclosures
  - [ ] Right to access/delete implemented
  - [ ] Data processing agreement with AWS
- [ ] CCPA compliance (if serving California users)
- [ ] Age restrictions: 4+ (requires parental consent <13)
- [ ] Child safety: No social, no third-party ads, location gated to 16+

---

## Phase 4: Build & Test (2-3 days)

### Create Release Builds

#### iOS

```bash
cd apps/mobile
eas build --platform ios --auto-submit=false
# Manual review of build + code signing in App Store Connect
```

#### Android

```bash
cd apps/mobile
eas build --platform android --auto-submit=false
# Upload to internal testing first
```

### Testing Checklist

- [ ] QA tested on:
  - [ ] iPhone 13/14/15 (latest OS)
  - [ ] iPad (landscape + portrait)
  - [ ] Android 13/14 (flagship devices)
  - [ ] Network conditions (WiFi, 4G, offline)
- [ ] All permissions work:
  - [ ] Camera (scan QR, barcode, photo)
  - [ ] Photo library (select existing photo)
  - [ ] Contacts (invite members)
  - [ ] Notifications (scheduled + delivered)
- [ ] Performance metrics:
  - [ ] Cold start < 3s
  - [ ] Classification latency < 5s
  - [ ] Scroll smooth (60fps)
  - [ ] Memory usage < 200MB
- [ ] Offline functionality:
  - [ ] Add items without network
  - [ ] Sync when online
  - [ ] No data loss
- [ ] Accessibility:
  - [ ] VoiceOver/TalkBack functional
  - [ ] Color contrast WCAG AA
  - [ ] Text sizing respects user settings
  - [ ] All buttons keyboard accessible

---

## Phase 5: Submit to Stores (1 day)

### iOS App Store

1. [ ] Sign app with distribution certificate
2. [ ] Upload to App Store Connect
3. [ ] Fill metadata (name, description, screenshots, etc.)
4. [ ] Submit for review
5. [ ] Monitor review status (typically 24-48 hours)
6. [ ] Respond to any rejections
7. [ ] Approve for release

### Google Play Store

1. [ ] Build signed APK/AAB
2. [ ] Upload to Google Play Console
3. [ ] Fill store listing
4. [ ] Submit for review (usually approved in hours)
5. [ ] Gradual rollout (1% → 10% → 100%)

---

## Phase 6: Post-Launch (Ongoing)

### Monitoring

- [ ] Crash reporting (Sentry) dashboard active
- [ ] Analytics (PostHog) tracking events
- [ ] CloudWatch alarms set for:
  - [ ] Lambda errors > 1%
  - [ ] API latency p99 > 5s
  - [ ] S3 upload failures
  - [ ] Image CDN 5xx errors
- [ ] User support channel active (email, in-app)

### Response Plan

- [ ] How to respond to reviews
- [ ] How to handle critical bugs
- [ ] How to communicate status page
- [ ] Major version update schedule
- [ ] Beta testing program (TestFlight, Google Play Beta)

---

## Timelines & Responsibilities

| Phase          | Owner     | Time      | Status      |
| -------------- | --------- | --------- | ----------- |
| Pre-submission | Backend   | 1-2d      | In Progress |
| Store listings | Design/PM | 1-2d      | Pending     |
| Legal          | PM        | 1-2d      | Pending     |
| Build & QA     | QA        | 2-3d      | Pending     |
| Submission     | DevOps    | 1d        | Pending     |
| **Total**      |           | **7-10d** |             |

---

## Critical Path Items (Block Submission)

- [ ] Privacy policy + Terms of Service approved
- [ ] All 260+ tests passing (automated gate)
- [ ] Zero critical bugs (security, data loss)
- [ ] All permissions documented and justified
- [ ] Screenshots aligned with current UI
- [ ] GDPR/CCPA compliance verified
- [ ] Apple Developer + Google Play Developer accounts ready
- [ ] Build signing certificates created
- [ ] Sentry + PostHog operational

---

## Future Waves (Don't Block Wave 1)

Wave 2 (after launch):

- [ ] In-app feedback survey
- [ ] Premium features (subscription)
- [ ] Household limits (free: 1, paid: unlimited)
- [ ] Analytics dashboard
- [ ] Export data UI

Wave 3+:

- [ ] Restaurant integration
- [ ] Social features
- [ ] Web dashboard
- [ ] REST API access
