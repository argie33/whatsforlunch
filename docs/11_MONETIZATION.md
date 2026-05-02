# 11 — Monetization Strategy

**Strategy in one line**: Free DIY QR codes drive adoption → premium containers drive margin → subscriptions drive recurring revenue → affiliates drive passive income → B2B drives scale.

**Key insight**: Selling DIY QR codes for $2.99 would net $0.03/user. Free DIY QR codes net $0.31/user (10x more) by driving container purchases ($0.21/user), subscriptions ($0.03/user), and affiliate revenue ($0.07/user).

**See also**: [MONETIZATION_STRATEGY.md](MONETIZATION_STRATEGY.md) (detailed business model), [FEATURES_MONETIZATION_MAP.md](FEATURES_MONETIZATION_MAP.md) (feature-to-revenue mapping), [QR_AND_CONTAINER_SYSTEM.md](QR_AND_CONTAINER_SYSTEM.md) (three QR code purchase models).

## Pricing ladder (Wave 2+, updated for container-first model)

### Subscription Tiers

| Tier        | Monthly | Annual | Notes                                                               |
| ----------- | ------- | ------ | ------------------------------------------------------------------- |
| **Free**    | $0      | $0     | Core features, single household, limited sync                       |
| **Premium** | $2.99   | $24.00 | Household sharing, real-time sync, recipe library, advanced filters |
| **Pro**     | $7.99   | $79.00 | Unlimited households, team roles, API access, nutrition tracking    |

**Reasoning**:

- Free tier drives adoption (no friction)
- Premium ($2.99) targets couples/roommates who want shared households
- Pro ($7.99) targets small restaurants, meal prep services, team use
- Annual pricing = 17-20% discount (seasonal commitment signal)
- Revenue target: 2-5% premium conversion at scale (conservative)

### E-Commerce: Premium Containers (Primary Revenue Driver)

| Product               | Price       | COGS    | Margin | Volume Target (Year 1) |
| --------------------- | ----------- | ------- | ------ | ---------------------- |
| **250ml Glass**       | $12-15      | $5-7    | 45-50% | 500 units              |
| **500ml Glass**       | $15-20      | $7-10   | 45-50% | 1K units               |
| **1L Borosilicate**   | $18-25      | $8-12   | 45-60% | 300 units              |
| **QR Sticker Sheets** | $4.99-12.99 | $1.50-3 | 60-70% | 1K units (secondary)   |

**Key**: Each premium container purchase increases stickiness + household shares container (network effect) + drives subscriptions (sync needed for sharing).

## What's free vs. paid (Wave 1-3)

### Free Tier (Forever)

Core features, no paywall. Drives adoption.

**Always free**:

- Account creation (email magic link, Apple/Google Sign-In)
- Manual item entry (name, expiry, location, notes)
- Barcode scanning (UPC lookup)
- AI photo classification (uses daily quota)
- OCR date extraction (uses daily quota)
- Container management (create, name, archive)
- Dashboard ("Today" view with expiry status)
- Search & filter (basic by name, location, status)
- Bulk actions (mark eaten/tossed/frozen)
- Local notifications (expiry alerts)
- Print QR stickers (DIY, no cost)
- Scan QR codes (claim containers)
- Settings, account deletion, data export
- Dark mode, accessibility

**Free tier limits**:

- Single household only
- Cloud sync on-demand (background sync disabled until Premium)
- Basic dashboard filters

### Premium Tier ($2.99/mo or $24/year)

Network effects. Drives household sharing + engagement.

**Unlocked features**:

- **Multiple households** (5+ households, invite members)
- **Real-time sync** (AppSync subscriptions, instant updates)
- **Household activity log** (who ate what, when)
- **Recipe library** (save/organize AI recipes)
- **Advanced search** (date range, category, tags)
- **Export reports** (PDF, CSV)
- **Priority support** (faster response)

**Note**: Recipe suggestions, restaurant recommendations are FREE tier features that drive affiliate revenue. Premium just adds **save recipes** (library).

### Pro Tier ($7.99/mo or $79/year)

For restaurants, meal prep services, teams.

**Unlocked features**:

- **Unlimited households** (vs Premium's ~5)
- **Team management** (assign roles, edit permissions)
- **API access** (REST + webhooks for integrations)
- **Nutrition tracking** (calories, macros per item)
- **Barcode database** (upload custom barcodes)
- **Bulk CSV import/export**

### Stay free forever (network effects, don't gate)

- Manual entry, barcode scan, QR printing
- Photo/OCR AI classification (quota-limited but free)
- Recipe suggestions, restaurant recommendations (free + affiliate links)
- Local notifications, dashboard
- Search, filter, bulk actions
- Account deletion, data export

**Why**: Gating adoption features kills virality. AI quotas are natural limit without hard paywall.

## Affiliate Revenue (Zero-Effort, Passive)

**Strategy**: Links appear naturally in-product when user would shop anyway.

| Partner        | Commission            | Integration Point                          | Est. Revenue       |
| -------------- | --------------------- | ------------------------------------------ | ------------------ |
| **Instacart**  | 5-10%                 | "Buy these groceries" on recipes/dashboard | $0.50-1.00/user/mo |
| **HelloFresh** | 15-25% (signup bonus) | "Complete this recipe with kit"            | $1-3/user/mo       |
| **DoorDash**   | 3-5%                  | Restaurant recommendations                 | $0.50-1.00/user/mo |
| **Uber Eats**  | 3-5%                  | Restaurant recommendations                 | $0.20-0.50/user/mo |
| **Grubhub**    | 4-5%                  | Restaurant recommendations                 | $0.20-0.50/user/mo |

**Key**: Affiliate revenue does NOT require paywall. Every free user can see affiliate links. Year 1 target: **$50-200K/month** at 100K+ users.

## B2B / Institutional (Wave 3-4)

**Target**: Restaurants, meal prep services, cafeterias, catering.

| Segment            | License Fee | Supply Cost                    | Est. Total                      |
| ------------------ | ----------- | ------------------------------ | ------------------------------- |
| Meal prep service  | $500-1K/mo  | Branded containers @ $3-5/unit | $8-15K/month per 5-10 locations |
| School/cafeteria   | $300-500/mo | Branded containers + tracking  | $3-5K/month per 10-20 schools   |
| Commercial kitchen | $500-2K/mo  | API access + containers        | Variable                        |

**Key**: B2B customers buy premium containers in volume (network effect). Licensing + container margin = 60%+ gross margin.

## Conversion benchmarks

From RevenueCat's 2024 State of Subscription Apps + comparable utility/lifestyle apps:

| Metric                       | Realistic target                     |
| ---------------------------- | ------------------------------------ |
| Free → trial start           | 1.5-3% of installs                   |
| Trial → paid                 | 30-50% (7-day trial), 60-70% (3-day) |
| Net free → paid (mature)     | 1.5-2.5% of MAU                      |
| Annual mix                   | aim for 60%+ annual subs             |
| 12-month retention on annual | 50-65%                               |

## Year 1 Revenue Projection

Based on container-first model + subscription + affiliates + B2B:

```
Month 1-3: Growth Phase (0% revenue, focus on adoption)
  - 10K users
  - Revenue: $0 (free tier only)

Month 3-6: Container Launch
  - 50K users
  - Container sales: $8K/mo (1K units @ $8 avg margin)
  - Affiliate: $2K/mo
  - Total: $10K/mo

Month 6-9: Premium Launch
  - 100K users
  - Containers: $20K/mo
  - Subscriptions: $8K/mo (2% conversion)
  - Affiliates: $5K/mo
  - Total: $33K/mo

Month 9-12: B2B Pilot
  - 200K users
  - Containers: $40K/mo
  - Subscriptions: $15K/mo (3% conversion)
  - Affiliates: $10K/mo
  - B2B: $5K/mo (5 customers)
  - Total: $70K/mo

**Year 1 Total**: ~$180K revenue (ramping)
**Year 2 Target**: $500K-1M (if B2B scales)
```

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

- "Powered by WhatsFresh" QR codes on Tupperware boxes
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
