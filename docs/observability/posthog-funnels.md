# PostHog Dashboards & Funnels

Configuration reference for the PostHog project. Set these up in the PostHog UI after the project is created.

## Project settings

- **Project name**: WhatsFresh Production
- **Instance**: US Cloud (us.posthog.com)
- **Autocapture**: enabled
- **Session recording**: enabled, sampling 10%, sensitive UI masked (input fields, photo preview)
- **Feature flags**: enabled
- **Surveys**: enabled post-launch

---

## Events to instrument (custom)

These events are sent from the mobile app. Wire them with `posthog.capture(eventName, properties)`.

| Event name | When | Properties |
|---|---|---|
| `item_created` | Item saved | `method` (photo/barcode/qr/manual), `category`, `ai_accepted` (bool) |
| `item_eaten` | Marked eaten | `days_until_expiry`, `category` |
| `item_tossed` | Marked tossed | `days_past_expiry`, `category` |
| `item_frozen` | Marked frozen | `category` |
| `ai_classification_viewed` | AI result shown | `confidence`, `food_type` |
| `ai_classification_accepted` | User accepts AI suggestion | `confidence`, `food_type` |
| `ai_classification_overridden` | User edits AI suggestion | `original_food_type`, `confidence` |
| `scan_qr` | QR code scanned | `container_claimed` (bool) |
| `scan_barcode` | Barcode scanned | `product_found` (bool) |
| `scan_photo` | Photo taken for AI | — |
| `onboarding_completed` | Reaches dashboard first time | `sign_in_method` |
| `subscription_screen_viewed` | Paywall shown | `trigger` (quota_hit/manual) |
| `subscription_started` | Pro trial or purchase | `plan` (monthly/annual), `trial` (bool) |
| `household_member_invited` | Invite sent | — |

---

## Funnels

### Activation funnel (North Star)

Name: **Install → Activation**

Steps:
1. App opened (autocaptured session start)
2. `onboarding_completed`
3. `item_created` (first item)
4. `item_created` (5th item — "activated")
5. Session on day 7 (retained)

Target: 25% install → 5-item activation

---

### AI trust funnel

Name: **AI Classification Flow**

Steps:
1. `scan_photo`
2. `ai_classification_viewed`
3. `ai_classification_accepted` OR `ai_classification_overridden`

North Star metric: **AI override rate = overridden / (accepted + overridden)**
Target: < 15% override rate

---

### Conversion funnel

Name: **Free → Pro**

Steps:
1. `subscription_screen_viewed`
2. `subscription_started` (trial)
3. Subscription active after 7 days (retention)
4. Subscription active after 30 days (converted)

---

### Retention dashboard

**Daily Active Users**: unique sessions per day
**Weekly Active Users**: unique sessions in rolling 7 days
**Monthly Active Users**: unique sessions in rolling 30 days

DAU/MAU target: > 20%

---

## User properties

Set on identify with `posthog.identify(userId, properties)`:

| Property | Type | Example |
|---|---|---|
| `subscription_tier` | string | `free` \| `pro` |
| `household_count` | number | 1 |
| `items_total` | number | 47 |
| `sign_in_method` | string | `magic_link` \| `apple` \| `google` |
| `created_at` | ISO string | `2026-04-26T…` |
| `dietary_prefs` | string[] | `["vegetarian"]` |

---

## Feature flags

| Flag | Description | Default | Rollout |
|---|---|---|---|
| `recipe-suggestions` | Enable Wave 2 recipe feature | false | Phase in by tier |
| `household-sharing` | Enable household invite flow | true (pro only) | — |
| `ai-classification` | Enable AI photo flow | true | All users |
| `barcode-lookup` | Enable barcode scanning | true | All users |
| `nearby-restaurants` | Wave 3 restaurant feature | false | Wave 3 |

---

## Dashboards to create in PostHog UI

1. **Executive**: DAU, MAU, signups/day, items created/day, AI classifications/day
2. **Funnel**: activation funnel, AI trust funnel, conversion funnel
3. **Retention**: cohort retention curves by sign-in week
4. **Feature usage**: which features are used by free vs pro users
5. **AI quality**: override rate by day, confidence distribution, top overridden food types
