# App Store & Play Store Copy

**Owner**: W10  
**Consumer**: W9 (pastes directly into App Store Connect + Play Console)  
**Status**: Draft — final review before T-21 submission

---

## App Identifiers (locked)

| Field | Value |
|---|---|
| iOS Bundle ID | `app.whatsforlunch.mobile` |
| Android Package | `app.whatsforlunch.mobile` |
| Universal Link host | `whatsforlunch.app` |
| Deep link scheme | `wfl://` |

---

## App Store (iOS)

### Metadata

| Field | Value | Limit |
|---|---|---|
| **Name** | WhatsForLunch — Food Tracker | 30 chars ✅ (30) |
| **Subtitle** | Stop wasting food. | 30 chars ✅ (18) |
| **Category** | Food & Drink (primary), Lifestyle (secondary) | — |
| **Age Rating** | 4+ | — |
| **Content Rights** | Does not contain third-party content | — |

### Keywords (100 char limit)

```
food,fridge,leftovers,expiry,tracker,QR,kitchen,waste,recipes,scan,pantry,inventory
```

### Description

```
WhatsForLunch helps you track everything in your kitchen so nothing goes bad.

Scan a QR sticker on any container and see exactly what's inside and when it expires. Take a photo and AI identifies the food for you. Scan a barcode and we look up the product automatically.

Get a heads-up before things expire — not a guilt trip, just a helpful reminder that your Greek yogurt is on borrowed time.

TRACK YOUR KITCHEN
• QR sticker scanning — know what's in every container instantly
• AI photo identification — snap a photo, we figure out the rest
• Barcode lookup — scan packaging for instant product info
• Expiry date OCR — point at the "best by" text and we read it
• Manual add — quick-add anything in seconds

STAY ON TOP OF EXPIRY
• Smart alerts before things go bad
• Color-coded status: fresh (green), use soon (yellow), eat today (red)
• Daily morning digest — what to use today
• Snooze reminders when you're not ready

COOK WHAT YOU HAVE
• "What can I make?" suggests recipes from expiring items
• Step-by-step instructions with ingredients matched to your fridge
• "I cooked this" marks linked items as eaten

DESIGNED TO FEEL NATIVE
• Instant swipe actions — swipe to mark eaten or tossed
• Dark mode, Dynamic Type, VoiceOver — all supported
• Offline first — works without internet, syncs when connected

SHARE YOUR KITCHEN
• Invite household members to share a fridge
• Real-time sync — everyone sees the same items
• Activity feed — see what was added or eaten

Privacy: your food data stays yours. No ads, no selling data. Crash reports are anonymous. You can delete your account and all data at any time, in-app.
```

### What's New (v1.0.0)

```
Welcome to WhatsForLunch!

Track everything in your kitchen so nothing goes to waste. Scan QR stickers, take photos for AI food identification, scan barcodes, and read expiry dates with your camera.

We're just getting started. If you love it (or have ideas), tap Help & Support → Email us.
```

---

## Play Store (Android)

### Metadata

| Field | Value | Limit |
|---|---|---|
| **Title** | WhatsForLunch — Food Tracker | 50 chars ✅ (30) |
| **Short description** | Track leftovers, scan QR codes, and never throw away food again. | 80 chars ✅ (64) |
| **Category** | Food & Drink | — |
| **Content Rating** | Everyone | — |
| **Tags** | food tracking, kitchen, fridge, expiry, recipes | — |

### Full description

Same as App Store description above. Play Store limit is 4000 chars; the above is well under.

---

## Screenshots spec

W9 captures these on device/simulator. W10 provides the copy overlaid in each frame.

### iPhone 6.9" (16 Pro Max) — primary

| Screen | Overlay copy |
|---|---|
| 1 | "Know what's in your fridge." — hero dashboard with colored stripes |
| 2 | "Snap a photo. We figure out the rest." — camera scan + AI result |
| 3 | "Never miss an expiry again." — dashboard with eat-me-first hero card |
| 4 | "Recipes from what you already have." — recipe suggestions screen |
| 5 | "Your kitchen, shared." — household sync, two members |

### iPhone 6.5" (older Plus) — required

Same 5 screens, cropped/scaled.

### Pixel screenshots (Android)

Same 5 screens, Android chrome.

### Screenshot design notes (for W9)

- Background: warm off-white `#FBFAF7` behind device frame
- Font on overlay: SF Pro Display, title1 weight, brand primary `#2F7D5B`
- Device frame: Figma device mockup (clean, no bezels)
- No badges or "Download on App Store" buttons in screenshots (Apple policy)

---

## Privacy Nutrition Label (App Store)

| Category | Data | Linked to user | Used for tracking |
|---|---|---|---|
| Contact Info — Email address | Yes | No |
| Identifiers — User ID | Yes | No |
| Usage Data — Product interaction | Yes | No |
| User Content — Photos | Yes | No |
| User Content — Other (food data, notes) | Yes | No |
| Diagnostics — Crash data | No (anonymous) | No |

**We do not track.** ATT prompt not required.

---

## Data Safety (Play Store)

| Data type | Collected | Encrypted | User can delete |
|---|---|---|---|
| Email address | Yes | Yes | Yes (in-app) |
| Name | Yes | Yes | Yes |
| User ID | Yes | Yes | Yes |
| Photos | Yes | Yes | Yes |
| App activity | Yes | Yes | Yes |
| Crash logs | Yes | Yes | Yes |
| Device ID | Yes | Yes | Yes |

Shared with third parties: **No** (operators only: AWS, Anthropic via Bedrock, RevenueCat, Sentry, PostHog — none sell data).

---

## Support / Legal URLs

| Page | URL |
|---|---|
| Privacy Policy | `https://whatsforlunch.app/privacy` |
| Terms of Service | `https://whatsforlunch.app/terms` |
| Support | `https://whatsforlunch.app/support` |
| Marketing | `https://whatsforlunch.app` |

---

## Test account (for App Review)

Provide in App Store Connect "Notes for reviewer":

```
Test account
Email: review@whatsforlunch.app
(magic link will be sent — use the staging magic link bypass: enter "REVIEW2026" in the email field to get instant access without email)

The app includes:
- Pre-populated kitchen with 8 items across fridge/freezer/pantry
- 2 containers with QR stickers (use the in-app "Scan QR" demo mode)
- 1 completed household with 2 members

Premium tier is enabled on this test account.
```

---

## Submission timeline

| Day | Action | Owner |
|---|---|---|
| T-21 | TestFlight + Play Internal first build | W9 |
| T-14 | Play closed testing (20+ testers) | W9 |
| T-10 | App Store production submission | W9 |
| T-7 | App Store approval expected | W9 |
| T-5 | Play production submission | W9 |
| T-3 | Both approved; staged rollout starts | W9 |
| T-0 | 100% rollout + launch | W9 |

See [10_APP_STORES.md](10_APP_STORES.md) for full compliance checklist.
