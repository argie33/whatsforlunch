# App Store / Play Store Submission Runbook

Run this checklist before every submission — both initial launch and updates.

---

## Pre-submission: Run the Gate

```bash
# Trigger the App Store Gate workflow (must pass before submitting)
gh workflow run app-store-gate.yml \
  --field platform=both
```

Wait for all gates to go green before proceeding.

---

## iOS — App Store Connect

### 1. Metadata (one-time + per major release)

- [ ] App name: "WhatsFresh - Fridge Tracker"
- [ ] Subtitle: "Never waste food again"
- [ ] Description: see `docs/app-store/listing-ios.md`
- [ ] Keywords (100 chars max): see `docs/app-store/listing-ios.md`
- [ ] Support URL: `https://whatsfresh.app/support`
- [ ] Privacy URL: `https://whatsfresh.app/privacy`
- [ ] Marketing URL: `https://whatsfresh.app`

### 2. Screenshots (every submission)

Required sizes — use Xcode Simulator to capture:
| Device | Pixels | Count |
|--------|--------|-------|
| iPhone 6.9" (15 Pro Max) | 1320×2868 | 3-10 |
| iPhone 6.7" (14 Plus) | 1284×2778 | 3-10 |
| iPad Pro 12.9" (6th gen) | 2048×2732 | 3-10 |

Screenshots must show actual app UI — no device frames, no marketing text overlay (iOS rule since 2024).

Capture script:

```bash
cd apps/mobile
# Build simulator build
eas build --platform ios --profile preview --local
# Open in simulator, navigate to each screen, take screenshots
xcrun simctl io booted screenshot ~/Desktop/wfl-screenshot-$(date +%s).png
```

### 3. Privacy questionnaire (App Store Connect → App Privacy)

| Data type                 | Collected | Linked to user | Used for tracking |
| ------------------------- | --------- | -------------- | ----------------- |
| Email address             | Yes       | Yes            | No                |
| Identifiers (user ID)     | Yes       | Yes            | No                |
| Usage data (analytics)    | Yes       | No             | No                |
| Crash data                | Yes       | No             | No                |
| Food items (user content) | Yes       | Yes            | No                |
| Device token (push)       | Yes       | Yes            | No                |

### 4. Age rating

Complete questionnaire in App Store Connect. Expected rating: **4+** (no objectionable content).

### 5. Export compliance

WFL uses HTTPS for all API calls. When asked:

- "Does your app use encryption?" → **Yes**
- "Is it exempt?" → **Yes** (standard HTTPS/TLS, exempt under US EAR)
- Fill ECCN as 5D992

### 6. Submit via EAS

```bash
# Trigger App Store Gate first
gh workflow run app-store-gate.yml --field platform=ios

# Once gate passes, submit
gh workflow run mobile-submit.yml \
  --field platform=ios

# Or with a specific build ID:
gh workflow run mobile-submit.yml \
  --field platform=ios \
  --field build_id=<eas-build-id>
```

---

## Android — Play Console

### 1. Store listing (one-time + per major release)

- [ ] App name: "WhatsFresh - Fridge Tracker"
- [ ] Short description (80 chars): "Track fridge food, cut waste, get expiry alerts"
- [ ] Full description: see `docs/app-store/listing-android.md`
- [ ] Category: Food & Drink
- [ ] Content rating: Everyone

### 2. Screenshots

Required:

- Phone screenshots: 2-8, min 320px on short side, max 3840px
- 7-inch tablet: optional but recommended
- 10-inch tablet: optional

### 3. Data safety (Play Console → Data Safety)

| Category                              | Data collected | Purpose            |
| ------------------------------------- | -------------- | ------------------ |
| Personal info (email)                 | Yes            | Account management |
| App activity                          | Yes            | Analytics          |
| App info and performance (crash logs) | Yes            | App functionality  |
| User content (food items)             | Yes            | Core functionality |

Data encrypted in transit: **Yes**  
Users can request deletion: **Yes** (in-app account deletion)

### 4. Target API level

Must target API 34+ for new apps in 2025. Check `android/build.gradle`:

```
targetSdkVersion 34
```

### 5. Submit via EAS

```bash
gh workflow run app-store-gate.yml --field platform=android

gh workflow run mobile-submit.yml \
  --field platform=android
```

Initial release goes to **Internal Testing** track → promote to **Closed Testing (Beta)** → **Production**.

---

## Post-submission Checklist

### iOS review wait (~24-48h)

- [ ] Monitor App Store Connect for reviewer questions
- [ ] If rejected, read rejection reason, fix in hotfix PR, re-submit same day
- [ ] Common rejection reasons:
  - Metadata doesn't match app behavior
  - Missing privacy policy in-app
  - Crash on reviewer's device (check Sentry for new crash)
  - In-app purchase not working (RevenueCat sandbox vs. prod)

### Android review wait (~3-7 days for new apps)

- [ ] Check Play Console for policy issues
- [ ] Verify content rating questionnaire is complete

---

## Hotfix Release Process

If a P0 bug is found after App Store approval but before launch:

1. Create hotfix branch from the release tag: `git checkout -b hotfix/0.1.1 v0.1.0`
2. Fix the bug, PR to `main`
3. Run: `gh workflow run release.yml --field bump=patch`
4. Submit new build via `app-store-gate.yml` → `mobile-submit.yml`
5. In App Store Connect: select new build, expedited review if critical

---

## Required GitHub Secrets

| Secret                                      | Value source                       |
| ------------------------------------------- | ---------------------------------- |
| `EXPO_TOKEN`                                | Expo account → Access Tokens       |
| `APPLE_APP_STORE_CONNECT_API_KEY_ID`        | App Store Connect → Keys           |
| `APPLE_APP_STORE_CONNECT_API_KEY_ISSUER_ID` | App Store Connect → Keys           |
| `APPLE_APP_STORE_CONNECT_API_KEY_CONTENT`   | App Store Connect key file content |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`           | Google Cloud → Service Accounts    |
| `SLACK_DEPLOY_WEBHOOK`                      | Slack App incoming webhook         |
