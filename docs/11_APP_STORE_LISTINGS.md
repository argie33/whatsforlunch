# 11 — App Store Listings

This document provides the complete metadata, copy, and screenshot requirements for submitting WhatsFresh to the Apple App Store and Google Play Store.

---

## iOS App Store (Apple App Store Connect)

### Metadata

| Field | Value |
|-------|-------|
| App Name | WhatsFresh |
| Bundle ID | com.whatsfresh.app |
| SKU | whatsfresh-ios-2026 |
| Primary Category | Food & Drink |
| Secondary Category | Lifestyle |
| Content Rating | 4+ |
| Age Rating (IARC) | 4+ |
| Privacy Policy URL | https://whatsfresh.app/privacy |
| Terms of Service URL | https://whatsfresh.app/terms |
| Support URL | https://whatsfresh.app/support |
| Marketing URL | https://whatsfresh.app |

### App Description

**Subtitle:**
> Stop wasting food. Track everything in your kitchen.

**Full Description (160 chars for tagline, 4000 chars max for full):**
> WhatsFresh helps you track everything in your kitchen and get reminders before food goes bad.
>
> **Capture anything, instantly:**
> • Scan QR stickers on containers
> • Snap photos for AI identification
> • Scan expiry dates with OCR
> • Scan barcodes for instant lookup
> • Add items manually
>
> **Never waste food again:**
> • Get notified before items expire
> • See what's expiring soon at a glance
> • Find recipes that use what you have
> • Track your waste reduction over time
>
> **Share with household:**
> • Invite family or roommates
> • See what others are adding
> • Get real-time sync across all devices
>
> **AI-powered, privacy-first:**
> • Photos are never stored — deleted immediately after identification
> • All data stored locally on your device
> • Optional sync to your account only
> • No ads, no data sales, no tracking
>
> **Premium features (optional):**
> • Unlimited containers and items
> • AI-suggested recipes
> • Household sharing (up to 6 members)
> • Data export & backup
>
> Download free and start tracking today.

### Keywords

(Up to 100 characters total)
> food waste, kitchen, expiry, tracking, recipes, ai, container

### Release Notes (Current Version)

> **Wave 1 MVP: Core tracking features**
> 
> ✅ QR code sticker system for containers
> ✅ AI photo classification (powered by Claude)
> ✅ OCR expiry date detection
> ✅ Barcode product lookup
> ✅ Real-time household sharing and sync
> ✅ Offline-first with automatic sync
> ✅ Expiry notifications
> ✅ Account deletion and data export (GDPR compliant)
> 
> Coming in Wave 2: recipe suggestions, restaurant recommendations, shopping list.

### Privacy Nutrition Label

(This is required for all App Store submissions after Sept 2020)

**Data Collection:**

- [ ] Contact Information
  - Email address: **YES** (required for account)
  
- [ ] Health & Fitness
  - Not collected
  
- [ ] Identifiers
  - User ID, device ID: **YES** (for sync)
  
- [ ] Usage Data
  - Crash logs: **YES** (via Sentry)
  - Analytics: **YES** (via PostHog, anonymized)
  
- [ ] Diagnostics
  - Crash reports: **YES**

**Data Usage:**

- Used to track user across apps/websites: **NO**
- Data linked to user: **YES**
- Data linked to device: **YES**
- Data tracking enabled: **YES** (can be disabled in Settings → Privacy)

**Tracking Domains:**

- Sentry (sentry.io)
- PostHog (posthog.com)
- RevenueCat (revenuecat.com)
- AWS (amazonaws.com)

### Screenshots (Required)

Create screenshots for:

**iPhone 6.7" (Max, iPad Pro 12.9"):**
- Onboarding slide 1 (app intro)
- Dashboard with items
- Scan screen (QR mode)
- Item detail + actions
- Settings screen
- Recipes screen (Wave 2 placeholder)

**iPhone 5.5" (standard size):**
- Same 5 screenshots, resized

**iPad 12.9" (optional but recommended):**
- Dashboard layout
- Container details
- Settings
- Household members
- Recipes

Each screenshot should include:
- Clean, real app UI
- No code visible
- At least one call-to-action
- Landscape or portrait (use landscape for iPad)

### Promotional Artwork

- App Icon: 1024 × 1024 px (required)
- App Preview (optional): 30-second video showing core flows
  - Sign up → add item → get notification

### Submission Checklist

- [ ] Bundle ID matches Xcode
- [ ] Version number incremented
- [ ] Build number incremented
- [ ] Screenshots are 72 dpi, JPG/PNG
- [ ] No demo or placeholder text visible
- [ ] Privacy Policy URL resolves
- [ ] Terms URL resolves
- [ ] Support email functional
- [ ] Content rating questionnaire completed (IARC)
- [ ] Export Compliance form checked (non-encryption: NO)
- [ ] Advertising Identifier (IDFA) declared (collect for ads: NO)

---

## Android (Google Play Store)

### Metadata

| Field | Value |
|-------|-------|
| App name | WhatsFresh |
| Package name | com.whatsfresh.app |
| App title (50 chars max) | WhatsFresh - Food Tracking |
| Short description (80 chars max) | Stop wasting food. Track everything in your kitchen. |
| Full description (4000 chars max) | (Same as iOS, above) |
| Category | Food & Drink |
| Content rating | Everyone |
| Privacy Policy URL | https://whatsfresh.app/privacy |
| Terms of Service URL | https://whatsfresh.app/terms |
| Developer Contact | support@whatsfresh.app |
| App Version | 1.0.0 |
| Minimum API | 24 (Android 7.0) |
| Target API | 34 (Android 14) |

### Data Safety Form

(Introduced May 2022; required for all new apps)

**Data Types Collected:**

- [ ] Emails & contacts: **Email address** (required to sign in)
- [ ] Photos & videos: **YES** (photos for AI classification)
- [ ] App activity: **YES** (feature usage analytics)
- [ ] Device IDs: **YES** (unique user ID, device ID for sync)
- [ ] Approximate location: **NO**
- [ ] Precise location: **NO**
- [ ] Personal info (name, birthday, etc.): **Name only** (optional)
- [ ] Financial info: **NO** (RevenueCat handles payments)

**Data Sharing:**

- [ ] Shared with third parties: **YES** (AWS, Sentry, PostHog, RevenueCat)
- [ ] Shared for ads: **NO**

**Security Practices:**

- [ ] Data encrypted in transit: **YES** (TLS)
- [ ] Data encrypted at rest: **YES** (SQLCipher on device)
- [ ] Security updates: **Regular** (GitHub Actions CI/CD)
- [ ] Restricted access to sensitive data: **YES** (least-privilege IAM)
- [ ] Privacy policy URL: https://whatsfresh.app/privacy

### Screenshots

Create for all required device sizes:

**Phone (5.5"):**
- Main dashboard
- Add item (AI classification)
- Container details
- Settings profile
- Household sharing

**Tablet (7"):**
- Dashboard (landscape)
- Scan screen
- Container list

**Wear OS (if applicable):** None required for MVP

### Promotional Graphics

- Feature Graphic: 1024 × 500 px (required)
- Icon: 512 × 512 px (PNG, required)
- Screenshots: 1440 × 2560 px for phones
- App Preview: 30-second video (optional but recommended)

### Submission Checklist

- [ ] Google Play Developer account created ($25 one-time)
- [ ] Payment method verified
- [ ] App signed with release keystore
- [ ] Version code incremented
- [ ] AndroidManifest.xml has correct permissions
- [ ] Privacy Policy URL resolves
- [ ] Terms URL resolves
- [ ] Content rating questionnaire completed
- [ ] Data Safety form filled completely
- [ ] Screenshots clear and recent
- [ ] No profanity or inappropriate content
- [ ] App icon is distinct from similar apps
- [ ] App doesn't violate Play Store policies

---

## Content Shared Across Platforms

### Brand Assets

**Logo:**
- Filename: `whatsfresh-logo.png`
- Size: 500 × 500 px (square)
- Variants: light background, dark background, white

**Color Palette:**
- Primary: `#2F7D5B` (sage green)
- Secondary: `#F0E5D8` (warm cream)
- Accent: `#D4A574` (warm tan)

### Copy Guidelines

- **Tone:** Conversational, friendly, helpful
- **Voice:** First-person plural (we, our, us)
- **Length:** Short, scannable (max 3 sentences per section)
- **No jargon:** Avoid tech terms; use plain language
- **Action-oriented:** Each sentence should lead to an action

### Legal Compliance

- Privacy Policy: GDPR/CCPA compliant ✅ (hosted at `/privacy`)
- Terms of Service: Covers all use cases ✅ (hosted at `/terms`)
- Both updated within 30 days of launch

---

## Timeline

| Milestone | Date | Owner |
|-----------|------|-------|
| App Store Connect + Play Console accounts created | T-30 | W9 |
| Screenshots + promotional assets finalized | T-21 | W10 |
| Metadata + copy reviewed by team | T-14 | W9/W10 |
| TestFlight + Play Internal Testing submissions | T-10 | W9 |
| First beta cohort (50+ testers) active for 7 days | T-7 | W9 |
| Production submission to App Store | T-5 | W9 |
| Production submission to Play Store | T-3 | W9 |
| App Store approval + live | T-1 | W9 |
| Play Store approval + live | T | W9 |

---

## Key Dos and Don'ts

### ✅ DO

- Use clear, high-quality screenshots
- Show real app functionality, not mockups
- Highlight the most unique features first
- Include a call-to-action
- Test all URLs before submission
- Proofread copy for typos
- Use consistent branding across both stores

### ❌ DON'T

- Use placeholder text or lorem ipsum
- Include code or technical jargon
- Make unsupported claims (e.g., "never" food waste)
- Use competitor logos or branding
- Submit low-res or blurry screenshots
- Claim AI 100% accuracy (it's an estimate)
- Include sensitive user data in marketing

---

## Resources

- [Apple App Store Connect Guide](https://help.apple.com/app-store-connect/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [IARC Rating System](https://www.globalratings.com/)
- [Data Safety Form FAQ](https://support.google.com/googleplay/android-developer/answer/10787469)
- [ASO Best Practices (App Annie / Sensor Tower)](https://www.sensortower.com/blog)

---

## Sign-Off Checklist

- [ ] **W9** — Verified both app store accounts exist
- [ ] **W10** — Screenshots + assets finalized
- [ ] **W3** — Privacy/Terms legal review complete
- [ ] **W9** — All metadata entered and proofread
- [ ] **Coordinator** — Ready for TestFlight/Play Internal submissions
