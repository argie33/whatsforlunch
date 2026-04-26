# 11 — Monetization Strategy

**Strategy in one line**: Get thousands of users on a free tier first. Only introduce paid tiers after we hit 5K MAU and 30%+ Day-30 retention. Avoid dark patterns. Build for lifetime value.

## Pricing ladder (post-validation, Wave 2+)

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| **Free** | $0 | $0 | Up to 50 active items, 10 AI scans/day, single household |
| **Premium** | $4.99 | $29.99 | Unlimited items, unlimited AI, household sharing, recipes |
| **Family** | — | $44.99 | Up to 6 members, multiple households |
| **Lifetime** | — | $79.99 (limited promo) | One-time, removes future revenue risk |

**Reasoning**:
- Anchor pricing in utility-app range ($3-7/mo expected)
- Annual = 50% discount over monthly (RevenueCat 2024 sweet spot)
- Family at 1.5x annual matches Apple One / Spotify ratios
- Lifetime as scarcity-driven promo (don't make permanent)

## What's free vs. paid

### Free (forever)
- Manual item entry
- Barcode scanning
- Up to 50 active items
- Local notifications (expiry alerts)
- Basic dashboard with status
- Print QR stickers
- Mark eaten / tossed / frozen
- Settings, account deletion, data export
- Single device, single household, solo use

### Premium ($4.99/mo, $29.99/yr)
- **AI photo classification** (high marginal cost — must gate)
- **Receipt scanning** (OCR cost)
- **Printed expiry date OCR** (quota-gated free, unlimited premium)
- **Unlimited active items**
- **Household sharing** (multi-user; #1 reason couples convert)
- **Recipe suggestions** (Claude-powered)
- **Restaurant recommendations** (when location-enabled)
- **Stats with $ tracking + history**
- **Multi-device sync**
- **Priority support** (24h response vs 48h)

### Family ($44.99/yr only — annual)
- Everything in Premium
- Up to 6 household members
- Multiple households per account
- Activity log per user
- Family billing (one card)

### Stay free forever (don't gate, would kill virality)
- Single-device basic sync
- Manual entry
- Local notifications
- Status dashboard
- Print stickers

### Don't gate (would feel mean)
- Account deletion
- Data export
- Privacy controls

## Conversion benchmarks

From RevenueCat's 2024 State of Subscription Apps + comparable utility/lifestyle apps:

| Metric | Realistic target |
|---|---|
| Free → trial start | 1.5-3% of installs |
| Trial → paid | 30-50% (7-day trial), 60-70% (3-day) |
| Net free → paid (mature) | 1.5-2.5% of MAU |
| Annual mix | aim for 60%+ annual subs |
| 12-month retention on annual | 50-65% |

## In-app purchase tooling

**Choice**: **RevenueCat**

**Why over alternatives**:
- Free until $2.5K MTR (covers entire pre-PMF window)
- After that: 1% of revenue (cheaper than building it ourselves)
- Cross-platform entitlement model (Apple + Google + future Stripe web)
- Built-in receipt validation
- Webhooks to AWS (subscribe to status changes)
- Handles edge cases: grace periods, billing retry, refund detection, family sharing
- React Native SDK officially maintained (`react-native-purchases`)

**Adapty** is comparable but smaller ecosystem; pick RevenueCat unless we need its no-code paywall A/B tester specifically.

**Raw StoreKit 2 / Play Billing**: only worth it past $5M ARR.

## Restore purchases (mandatory)

App Store guideline 3.1.1 requires:
- "Restore Purchases" button on Settings + Paywall
- `Purchases.restorePurchases()` (RevenueCat method)
- Handles users on new devices

## Free trial flow

- Default: 7-day free trial on annual (Premium)
- User taps "Start free trial" → RevenueCat handles via Apple/Google
- Trial reminder push 1 day before expiry (Apple/Google handle)
- Cancellation: Apple/Google native flow (we don't manage)

## Paywall design

Premium paywall shown when:
- User attempts AI photo classification on free tier (after quota hit)
- User attempts to invite household member on free tier
- User taps "Upgrade" in settings
- After completing a key value action ("you've used X for 30 days, enjoying it?")

**Never show**:
- On first launch
- Before user gets value
- More than 3x per session

**Paywall content**:
- Hero illustration
- 3 key benefits (with icons)
- Price comparison (monthly vs annual, savings highlighted)
- Trust signals (number of users, testimonials, App Store rating)
- Restore purchases link
- Terms + privacy

## Webhook integration

RevenueCat webhook → AWS API Gateway → `revenuecat-webhook` Lambda:
- Validates HMAC signature against shared secret
- Updates Cognito custom attribute `subscription_tier`
- Updates `Profile.subscriptionTier` and `subscriptionExpiresAt` in DynamoDB
- Triggers analytics event (PostHog) for conversion tracking

## Future revenue streams (Wave 3+)

In order of effort vs return:

### 1. Instacart Developer Platform affiliate (3-7%)
- "Buy ingredients" CTA on recipe detail
- Deep link with affiliate ID
- Click-through tracked

### 2. Amazon Fresh / Amazon Associates (1-4%)
- Product links for items frequently in user's lists

### 3. OpenTable Affiliate ($1.50/seated diner)
- Reservation deep links from restaurant cards

### 4. Sponsored recipes (only past 100K MAU)
- Branded recipes labeled "Sponsored" (FTC + Apple 3.2.2 compliance)

### 5. Branded container partnerships
- "Powered by WhatsForLunch" QR codes on Tupperware boxes
- Phase 10 hardware track

### 6. White-label / B2B for restaurants
- Inventory tracking for small restaurants
- Separate product, separate team — Year 2+

### 7. Marketplace for near-expiry food (Too Good To Go style)
- High regulatory burden (food safety, payments, liability)
- Year 2+ if at all

### 8. API access for third parties (Wave 6+)
- Public REST API + MCP server
- Paid tiers based on call volume
- Worth it past 500K users

## Anti-patterns (DON'T do)

- ❌ Hard paywall on first launch (kills D1 retention)
- ❌ Hidden recurring billing / unclear trial terms (Apple 3.1.2 rejection magnet)
- ❌ Free tier so crippled it's unusable ("Evernote 2023 mistake" — capped to 50 notes, mass exodus)
- ❌ Asking for review before user has hit a "wow" moment
- ❌ "Cancel" button hidden 3 taps deep
- ❌ Auto-upgrading free users to trial without consent
- ❌ Drip-charging without notice
- ❌ Locking account deletion behind cancellation

## Phase roll-in for monetization

### MVP (Wave 1)
- **Free, no paywall**
- Focus on retention and PMF first
- RevenueCat installed + products defined but not surfaced
- Goal: 5K MAU and 30% Day-7 retention before introducing pricing

### Wave 2 (~6-8 weeks post-launch)
- Activate paywall: $4.99/mo, $29.99/yr, 7-day trial
- Gate: AI photo classification, receipt scanning, household sharing
- Crisp chat for paid users
- Public Canny board for feature requests

### Wave 3 (~3-4 months post-launch)
- Family plan (annual only)
- Instacart affiliate live
- A/B test paywall copy + price points via RevenueCat experiments
- Lifetime tier ($79.99) as 30-day promo

### Wave 4-5
- OpenTable affiliate (with restaurant features)
- Sponsored recipes (if scale supports)
- Discord community

### Wave 6
- Public API + MCP — separate B2B pricing

## Key metrics to watch

- **D1 retention** (target 60%)
- **D7 retention** (target 30%)
- **D30 retention** (target 15%)
- **Free → paid conversion** (target 2% MAU)
- **Trial → paid** (target 40%+)
- **Monthly churn (paid)** (target < 5%)
- **LTV** (target $30+ over 18 months)
- **CAC** (track per channel; aim < LTV/3)

Dashboards in PostHog + RevenueCat dashboard.

## Pricing experiments

Once on RevenueCat with 5K+ users, run experiments:
- Trial length (3 vs 7 vs 14 days)
- Annual price ($24.99 vs $29.99 vs $39.99)
- Family plan threshold (4 vs 6 vs 8 members)
- Paywall copy (benefits-led vs price-led vs social-proof-led)

## International pricing

- Use Apple's auto-pricing tiers (regional adjustment)
- Local currencies via App Store / Play Store
- Don't price-gouge in lower-income regions

## Refund policy

- Apple/Google handle refunds
- Generous: honor any refund request within 14 days
- Document policy in Terms of Service

## Tax & legal

- Sales tax: Apple/Google handle (their merchant of record)
- VAT (EU): Apple/Google handle
- 1099-K from Apple/Google for revenue tracking
- Set up business entity (LLC) before first revenue

## Cross-references

- Subscription state in data model → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- API for subscription tier → [03_API_SPEC.md](03_API_SPEC.md)
- Pricing in App Store / Play Store → [10_APP_STORES.md](10_APP_STORES.md)
