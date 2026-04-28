# 10 — App Store & Play Store Compliance

We ship to both stores. Each has rules. Both must say yes.

## Apple App Store

### Account setup
- **Apple Developer Program**: $99/year, 24–48h enrollment with D-U-N-S verification (longer if LLC)
- Enroll under business entity (not personal) if LLC formed
- Set up App Store Connect with team roles

### Required URLs
- **Privacy Policy URL** (required)
- **Support URL** (required) — can be Notion-hosted at MVP
- **Marketing URL** (optional but recommended)

### Privacy Nutrition Labels (mandatory)

| Category | Data we collect | Linked to user? | Used for tracking? |
|---|---|---|---|
| Contact Info | Email | Yes | No |
| Identifiers | User ID | Yes | No |
| Usage Data | Product Interaction | Yes | No |
| User Content | Photos, food data, notes | Yes | No |
| Diagnostics | Crash data, performance | No (anon) | No |

We do not track. We do not use third-party tracking SDKs (no Facebook SDK, no AppsFlyer, no Branch in MVP).

### App Tracking Transparency (ATT)

We do **not** track across other apps/sites → ATT prompt not required.

If we ever add Facebook Login, marketing SDKs, or cross-app analytics → we must show the ATT prompt.

### Required features by Apple

| Requirement | Where in our app |
|---|---|
| **Account deletion in-app** (5.1.1(v), since June 2022) | Settings > Account > Delete Account |
| **Data export** (recommended) | Settings > Privacy > Export My Data |
| **Restore purchases** (3.1.1) | Settings > Subscription > Restore |
| **Apple Sign-In if Google offered** (4.8) | Auth screen |
| **Privacy policy URL** (5.1.1) | Settings > About + App Store listing |
| **App-level permission descriptions** | Info.plist (camera, notifications, photos) |

### Permission strings (Info.plist)

```
NSCameraUsageDescription
"WhatsForLunch uses the camera to scan QR codes, barcodes, and identify food in photos."

NSPhotoLibraryUsageDescription
"Allow access to attach photos of food items you've already photographed."

NSLocationWhenInUseUsageDescription
"Allow location to suggest nearby restaurants when you don't want leftovers. Optional."

NSContactsUsageDescription
"Optional — invite household members from your contacts."

NSUserTrackingUsageDescription
(Not needed unless we track in the future)
```

### App Store Review Guidelines (key sections)

| Section | Our compliance |
|---|---|
| **1.1 Safety** — no objectionable content | Food tracking; no user-generated public content at MVP |
| **1.2 User-generated** — moderation if any | N/A at MVP (recipes are private) |
| **2.1 App Completeness** — no crashes, no placeholders | Real wired-up features only; Sentry monitors |
| **2.5 Software Requirements** — works on supported devices | iPhone SE 2nd gen and newer |
| **3.1 Payments** — Apple IAP for digital goods | RevenueCat → Apple IAP |
| **3.2 Other Business Model Issues** — clear disclosures | Pricing visible before purchase |
| **4.0 Design** — premium UX | Per [05_UI_UX.md](05_UI_UX.md) |
| **4.8 Sign in with Apple** — required if other social | Apple Sign-In + Google Sign-In both supported |
| **5.1 Privacy** — privacy policy + data handling | Per [04_SECURITY.md](04_SECURITY.md) |

### Common rejections to avoid

- Missing demo account credentials in App Store Connect → **Provide test account** (premium-tier-enabled if relevant)
- Incomplete IAP metadata → **Fill all subscription fields**
- Privacy nutrition label mismatch → **Audit before submit**
- App feels like a "web wrapper" (4.2) → **Use native nav, native sheets, native chrome**
- Broken restore purchases → **Test thoroughly**
- Account deletion missing → **In-app, not email-only**
- Permission string too vague → **Use the strings above**

### Submission flow

1. EAS Build → IPA generated
2. EAS Submit → uploaded to App Store Connect
3. Set up app record (name, bundle ID, screenshots, description)
4. Configure IAP products (RevenueCat handles)
5. Submit for review
6. Median review time 24–48 hours; budget 5 days for first submission

### Screenshots required (2025)

- 6.9" (iPhone 16 Pro Max) — primary
- 6.5" (older Plus models) — required
- 13" iPad Pro — required if supporting iPad

Shoot ours on real devices via the iOS simulator's "Save Screenshot" + a frame template.

### TestFlight

- 100 internal testers (team)
- 10,000 external testers (public link or invite)
- External builds get a lightweight Apple review (~24h)
- Use TestFlight feedback for beta input

### Phased rollout

When promoting to App Store production:
- Phase 1: 1% → wait 24h → check Sentry, ratings
- Phase 2: 2% → 24h
- Phase 3: 5% → 24h
- Phase 4: 10% → 24h
- Phase 5: 20% → 24h
- Phase 6: 50% → 24h
- Phase 7: 100%

Pause anytime if issues. Hold marketing until 100% rolled out + 24h stable.

## Google Play Store

### Account setup
- **Google Play Console**: $25 one-time
- Apply under business entity if LLC

### Required URLs
- **Privacy Policy URL** (required)
- **Support email + website** (required)

### Data Safety form (mandatory)

| Category | Data | Encryption in transit | Deletion | Optional? |
|---|---|---|---|---|
| Personal info | Email | Yes | Yes | No |
| Personal info | Name (display name) | Yes | Yes | Yes |
| Photos and videos | Food photos | Yes | Yes | Yes |
| Files and docs | (none) | — | — | — |
| App activity | Product interaction | Yes | Yes | Yes |
| App info and performance | Crash logs | Yes | Yes | Yes |
| Device or other IDs | Device ID | Yes | Yes | No |

Mark:
- Data encrypted in transit: **YES**
- Data deletion request: **YES** (in-app)
- Data shared with third parties: **NO** (operators only: AWS, Anthropic-via-Bedrock, RevenueCat, Sentry, PostHog)

### Required features by Google

| Requirement | Where |
|---|---|
| **Account deletion in-app** (since 2024) | Settings > Account > Delete Account |
| **Privacy policy in listing AND in-app** | Settings + Play listing |
| **Permissions justified** | Use only what we need; declare each |
| **Target API level current** | API 35 (Android 15) at submission |
| **64-bit native libs** | RN handles |
| **App Bundle (AAB) format** | EAS Build outputs AAB |

### Permissions

Declare only what we use:
- Camera (always)
- Notifications (POST_NOTIFICATIONS on Android 13+)
- Internet (always)
- Photos (READ_MEDIA_IMAGES on Android 13+)
- Foreground service (for sync background)
- Network state

Don't declare:
- Location (only if user enables nearby; runtime requested when needed)
- Contacts (only if user explicitly invites)
- All-files access (we don't need it; never use)

### Content rating

IARC questionnaire → likely "Everyone" rating.

### Testing tracks

- **Internal Testing** (100 testers, instant)
- **Closed Testing** (alpha; requires review)
- **Open Testing** (beta, public)
- **Production**

**Important policy** (since Nov 2023): new developer accounts require **20 testers in closed testing for 14 days** before production access. Plan for this.

### Pre-launch report

Google runs Robo crawler on real devices when uploading a new bundle. Check the report:
- No crashes
- No security issues
- No accessibility issues

### Submission flow

1. EAS Build → AAB
2. EAS Submit → Play Console internal track
3. Test internally
4. Promote to closed testing (alpha)
5. Recruit 20+ testers (mandatory for new accounts)
6. After 14 days, eligible for production
7. Promote to production with staged rollout

### Common rejections

- Data Safety mismatch with privacy policy
- Missing privacy policy link in listing OR in-app
- Permissions not justified (especially background location, all-files access)
- Crashes in pre-launch report
- App targets old API level

## Both stores: required pages

### Privacy Policy

Must include (template will be customized via Termly or iubenda):
- What data we collect
- Why we collect it (lawful basis under GDPR)
- Who we share with (operators)
- How long we retain
- User rights (access, deletion, opt-out)
- Cookie policy (web only)
- Children's privacy (COPPA)
- International transfers
- Contact information
- Changes to policy

Hosted at `https://app.whatsforlunch.app/privacy`

### Terms of Service

Required because we have user accounts. Must include:
- Acceptance of terms
- Account responsibilities
- Acceptable use
- Intellectual property
- Subscription terms (renewal, cancellation, refunds)
- Disclaimers (no medical advice for nutrition features)
- Limitation of liability
- Termination
- Governing law
- Dispute resolution

Hosted at `https://app.whatsforlunch.app/terms`

### Help / Support

In-app screen:
- Browse FAQ (Notion-hosted at MVP, custom site later)
- Email us (mailto:support@whatsforlunch.app)
- Report a bug (auto-attaches device info, Sentry event ID)

## Submission timeline

Submit **2-3 weeks before** intended launch to absorb rejection round-trips.

| Day | Action |
|---|---|
| T-21 | First submission to TestFlight + Play Internal |
| T-14 | Closed testing (Play) starts; 20+ testers recruited |
| T-10 | Submit for App Store review (production) |
| T-7 | App Store approval + Play closed testing complete |
| T-5 | Submit Play production for review |
| T-3 | Both stores approved; phased rollout begins |
| T-0 | Public launch (100% rollout) |
| T+7 | Stability period; monitor metrics |

## Disabilities & accessibility (App Store + Play Store)

Both stores increasingly weight accessibility:
- Apple's **Accessibility Nutrition Labels** (rolling out 2026): declare which accessibility features supported
- Google Play promotes well-tested apps in Accessibility section

We commit to:
- VoiceOver / TalkBack support
- Dynamic Type
- High contrast mode
- Reduce Motion
- Color-blind safe palette

(See [05_UI_UX.md](05_UI_UX.md) for details.)

## App identifiers

- Bundle ID (iOS): `app.whatsforlunch.mobile` (TBD; lock to brand name decision)
- Package name (Android): `app.whatsforlunch.mobile`
- App Store name: "WhatsForLunch — Food Tracker" (TBD)
- Subtitle: "Stop wasting food."

## Marketing copy (template)

### Short description (Play Store, 80 char)
"Track leftovers, scan QR codes, and never throw away food again."

### Long description

**Stop throwing away food — and money.**

WhatsForLunch turns your fridge into a smart pantry. Scan a QR code to claim a labeled container, snap a photo of last night's pasta, and the app tells you exactly how many days it's safe to eat. You'll never forget what's in the back of your fridge again.

**How it works:**
• **Scan** — Point your camera at any QR container or food label. AI identifies what it is and when it expires.
• **Track** — See every item in your fridge at a glance, color-coded from fresh (green) to urgent (red).
• **Act** — Mark items eaten or tossed in one tap. Get notified before something goes bad.
• **Share** — Add your household so everyone in the kitchen stays in sync in real time.

**Why families love it:**
The average household throws away $1,500 in food every year. WhatsForLunch pays for itself the first week — by reminding you that leftover chicken from Tuesday is still good today.

**Key features:**
• AI food recognition — just point and shoot
• Smart expiry dates from 500+ food rules
• Household sync across all devices
• Barcode scanner for packaged foods
• Shopping list that fills itself when you toss something
• Works offline — syncs when you reconnect

**Privacy first:**
Photos are processed by AI, then immediately deleted. We never sell your data. Delete your account and every byte of your data any time, right from the app.

Free forever for one household. Premium unlocks multiple households and unlimited AI scans.

### iOS subtitle (30 char max)
Stop wasting food.

### Keywords (App Store, 100 char max)
food,leftovers,fridge,expiration,tracker,QR,kitchen,waste,scan,pantry,meal,expiry

## App Store Connect / Play Console — what to fill

Both: app name, subtitle, description, keywords (App Store), category, content rating, screenshots, app icon, privacy policy URL, support URL, support email, screenshots per device, first-launch screen, age rating, IAP products, data safety / privacy nutrition.

## Cross-references

- Privacy policy contents → [04_SECURITY.md](04_SECURITY.md) (compliance section)
- Pricing → [11_MONETIZATION.md](11_MONETIZATION.md)
- Pre-launch checklist → [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md)
