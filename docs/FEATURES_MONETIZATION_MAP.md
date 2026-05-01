# Features → Monetization Mapping

This document maps each feature to revenue stream and priority.

---

## Wave 1 Features (MVP)

### Free Tier (Adoption Features)

These drive user acquisition. No paywall.

| Feature                        | Purpose                        | Revenue Impact        | Status |
| ------------------------------ | ------------------------------ | --------------------- | ------ |
| F-001: Account creation        | Sign-up funnel                 | Acquisition           | ✅     |
| F-004: Onboarding flow         | First impression               | Retention             | ✅     |
| F-005: DIY QR print sheets     | **Monetization driver** (free) | Adoption → Containers | ✅     |
| F-006: Scan QR (claim)         | Container onboarding           | Retention             | ✅     |
| F-007: Container management    | Fridge operations              | Retention             | ✅     |
| F-008: Item creation (manual)  | Core UX                        | Retention             | ✅     |
| F-009: Barcode scanning        | Convenience                    | Retention             | ✅     |
| F-010: AI photo classification | **Waffle feature**             | AI quota              | ✅     |
| F-011: OCR date extraction     | Convenience                    | AI quota              | ✅     |
| F-012/013: Item lifecycle      | Core UX                        | Retention             | ✅     |
| F-014: Dashboard               | Hub screen                     | Retention             | ✅     |
| F-015: Search & filter         | UX quality                     | Retention             | ✅     |
| F-017: Local notifications     | Engagement                     | Retention             | ✅     |

### Premium Tier Features (Upsell)

These unlock with subscription OR appear in containers.

| Feature                             | Monetization     | Unlock At              | Revenue      |
| ----------------------------------- | ---------------- | ---------------------- | ------------ |
| F-101: Households                   | Premium $2.99/mo | After 2 weeks          | Subscription |
| F-102: Real-time sync               | Premium $2.99/mo | When sharing household | Subscription |
| F-014: Dashboard (advanced filters) | Premium $2.99/mo | Advanced search        | Subscription |

### Affiliate Features (Passive Revenue)

These naturally integrate affiliate links.

| Feature               | Affiliate Partner   | Commission          | Revenue            |
| --------------------- | ------------------- | ------------------- | ------------------ |
| F-010: AI photo class | Instacart affiliate | 5-10%               | $0.50-2/user/mo    |
| Recipe suggestions    | HelloFresh, Factor  | 15-25% signup bonus | $1-3/signup        |
| Item creation         | Amazon Fresh        | 3%                  | $0.20-0.50/user/mo |

---

## Wave 2 Features (Premium Containers)

### F-104: Recipe Suggestions

```
Feature: AI-generated recipes from expiring items
Monetization:
  → Affiliate links to ingredients (Instacart, Amazon Fresh)
  → "Buy ingredients" CTA → 5% commission
  → Premium: Export recipe to shopping list (Premium feature)
Revenue: $1-3/user/month via affiliates
```

### F-105: Recipe Library

```
Feature: Save favorite recipes
Monetization:
  → Premium only (encourages subscription)
  → Affiliate: "Share with a friend" → referral bonus
Revenue: Premium subscription upsell
```

### F-203: Shopping List

```
Feature: Auto-suggested shopping list
Monetization:
  → Premium: Shared shopping lists (teams)
  → Affiliate: Links to grocery delivery (Instacart 5%)
  → Affiliate: Meal kit signup bonuses
Revenue: Premium subscription + $0.50-1/user/mo affiliates
```

---

## Wave 3 Features (High-Value)

### F-201: Restaurant Recommendations

```
Feature: Nearby restaurants based on preferences
Monetization:
  → DoorDash affiliate links (3-5% commission)
  → Uber Eats affiliate links (3-5% commission)
  → Grubhub affiliate links (4-5% commission)
Revenue: $1-2/user/month (passive)
Status: Wave 3 (lower priority than containers)
```

### F-204: Stats & Insights

```
Feature: Waste reduction dashboard
Monetization:
  → Free tier: Basic stats
  → Premium: Advanced insights, trends, goals
  → B2B: White-label for restaurants ($500+/mo)
Revenue: Premium subscription + B2B licensing
```

---

## E-Commerce Features (New in Wave 2)

### Shop Tab (Future)

**Premium Containers with QR Codes Engraved**

```
F-Container-001: Glass containers (250ml, 500ml, 1L)
  → Pricing: $12-25 each
  → Margin: $8-15 per unit (40-60%)
  → QR engraved on lid, unique per container
  → Tied to container record in app
  → Revenue: HIGHEST PRIORITY

F-Container-002: Multi-pack discounts
  → 3-pack glass, 6-pack bundle
  → Revenue: Encourages bulk purchases

F-Container-003: Custom colors (future)
  → Premium pricing $20-35
  → Bulk corporate orders
  → Revenue: B2B channel
```

**Pre-Printed QR Code Packs (Nice-to-Have)**

```
F-Shop-001: 24-pack QR sticker sheets
  → Price: $4.99
  → Margin: 60-70% ($3 COGS)
  → Revenue: Secondary (not primary)

F-Shop-002: 50-pack QR sheets
  → Price: $7.99
  → Revenue: Upgrade for power users

F-Shop-003: 100-pack QR sheets
  → Price: $12.99
  → Revenue: Bulk for businesses
```

---

## B2B Features (Wave 3-4)

### F-B2B-001: Restaurant Integration

```
White-label WhatsForLunch for meal prep services
  → License: $500/month per location
  → Supply branded containers: $5/unit
  → API access: $100+/month
Revenue: $50K+ month if 100+ locations
```

### F-B2B-002: School/Cafeteria Integration

```
Track food storage, waste reduction
  → License: $300-500/month per school
Revenue: $30K+/month if 100+ schools
```

---

## Database Schema For Monetization

### Households Table (Premium Tracking)

```
households {
  id: UUID
  subscription_tier: ENUM['free', 'premium', 'pro']
  subscription_expires_at: TIMESTAMP
  member_count: INTEGER
  max_members_allowed: INTEGER (based on tier)
  trial_started_at: TIMESTAMP
  paid_started_at: TIMESTAMP
}
```

### Orders Table (Commerce)

```
orders {
  id: UUID
  user_id: UUID
  order_date: TIMESTAMP
  status: ENUM['pending', 'shipped', 'delivered', 'cancelled']
  total_usd: DECIMAL
  items: [{
    product_type: ENUM['container', 'qr_pack']
    product_id: UUID
    quantity: INTEGER
    price_per_unit: DECIMAL
  }]
  tracking_number: STRING
}
```

### Containers Table (Monetization Fields)

```
containers {
  id: UUID
  ...existing fields...

  -- Commerce tracking
  qr_source: ENUM['diy_printed', 'pre_printed_pack', 'engraved_container']
  order_id: UUID (if purchased)
  container_product_id: UUID (if physical container purchased)
  pack_id: UUID (if from QR pack)
}
```

---

## Revenue Forecast

```
Month 1-3: Free users only
  → 10K users
  → $0 revenue
  → Focus: Adoption

Month 3-6: Containers launch
  → 50K users
  → Container sales: $8K/month
  → Affiliate: $2K/month
  → **Total: $10K/month**

Month 6-9: Subscription launch
  → 100K users
  → Containers: $20K/month
  → Subscription (2% conv): $8K/month
  → Affiliates: $5K/month
  → **Total: $33K/month**

Month 9-12: B2B pilot
  → 200K users
  → Containers: $40K/month
  → Subscription (3% conv): $15K/month
  → Affiliates: $10K/month
  → B2B (5 customers): $5K/month
  → **Total: $70K/month**

Year 1 total: ~$180K revenue
```

---

## Key Principles

1. **Free QR Codes** = Adoption / No friction
2. **Premium Containers** = Stickiness / High margin / Viral
3. **Subscriptions** = Recurring / Network effects
4. **Affiliates** = Passive / Zero effort
5. **B2B** = Scale / High value

---

## Implementation Priority (Year 1)

1. ✅ **Wave 1 features** (mobile core) — Focus on FREE tier
2. 📦 **Containers shop** (Month 3) — Premium containers, engraved QR
3. 📱 **Premium tier** (Month 6) — Subscriptions, households
4. 🤝 **Affiliate integration** (Month 6) — Instacart, HelloFresh links
5. 🍽️ **B2B outreach** (Month 9) — Restaurants, meal prep services

DO NOT invest in pre-printed QR pack commerce until Month 6+.
