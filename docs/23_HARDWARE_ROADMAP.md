# 23 — Hardware Roadmap

We start with paper. We ship branded hardware later. Same QR system end-to-end.

## Operating principle

**Software first, hardware second.** The app is the product. Hardware is an upgrade path.

We don't let hardware delay the app. We design the app so hardware is plug-in-able when ready.

## Phase 1 — Paper QR (MVP)

**Status**: launches with the app

### What

- User generates QR sticker sheets in the app
- App produces a printable PDF
- User prints on regular sticker paper or label paper
- Stickers go on any container the user already owns (Tupperware, glass, etc.)

### Stack
- **App**: PDF generation via `react-native-qrcode-svg` + `expo-print`
- **Sheet sizes**: Letter (US) and A4 (international)
- **Stickers per sheet**: 24 (4×6 grid; 2.5×1.5 inch each)
- **QR contains**: Universal Link `https://app.whatsfresh.app/c/<token>` where token is a UUIDv4

### Cost to user
- Free (printable from any printer)
- Optional: branded sticker paper from Avery / Amazon (~$10/100 stickers)

### Pros
- Zero hardware investment for us
- Zero waterproofing problems
- Zero electronics, zero batteries
- Ships day one

### Cons (acceptable at MVP)
- Stickers peel after 30-50 dishwasher cycles
- Print quality varies by printer
- Not branded
- User has to print

## Phase 2 — Branded sticker kits (post-launch sales)

**Status**: 1-3 months post-MVP

### What

We sell sticker sheets directly. Premium sticker paper, dishwasher-safe, professionally printed with our branding.

### Product

- 6 sheets per pack = 144 stickers
- Vinyl waterproof material rated for 100+ dishwasher cycles
- Pre-printed with unique QR codes (each linked to a pre-claimed token)
- Subtle WhatsFresh branding on the bottom

### Cost to user

$9.99 for a pack of 144 stickers. (~$0.07 per sticker.)

### Margin
- Cost to produce: $2-3 per pack (small print runs)
- Retail: $9.99
- Gross margin: ~65%

### Distribution
- Direct via Shopify on `/shop`
- Stretch goal: Amazon FBA

### Pre-claim model
- Stickers are printed with QR tokens our backend has pre-generated
- Tokens are in DynamoDB as "unclaimed containers"
- First user to scan claims it (with anti-abuse: rate limit + token age limit)
- Allows us to ship physical stickers without per-customer customization

### Sticker sheet generation pipeline
- Internal admin tool generates batches of 1000 unclaimed tokens
- Tokens are exported as printable PDF
- PDF goes to print fulfillment partner

## Phase 3 — Branded containers (sold separately)

**Status**: 6-9 months post-launch (assuming demand validates)

### What

WhatsFresh-branded plastic food storage containers with permanent QR codes printed on the lid.

### Product specs

| Spec | Value |
|---|---|
| Material | BPA-free PP plastic (food-safe, dishwasher-safe to 65°C) |
| Sizes | 2-cup, 4-cup, 6-cup |
| Lid type | Snap-on with silicone gasket for airtight seal |
| QR placement | Top of lid, 1.5×1.5 inch, laser-etched (permanent) |
| Branding | Subtle WhatsFresh logo embossed on side |
| Stack | All sizes nest |

### Why laser-etched (not printed)

- Permanent: survives indefinite dishwasher cycles
- Doesn't fade
- Premium feel (commercial food packaging standard)
- Adds ~$0.50 per unit in manufacturing cost

### NOT in this phase

- ❌ Indicator lights (decided: no electronics; phone is the indicator)
- ❌ Bluetooth sensors (decided: out of scope)
- ❌ Temperature sensors
- ❌ Batteries
- ❌ Anything with electronics

### Cost to produce (estimated)

- Container + lid (injection molded): $1.50-2.50 per unit at small batches (1000+ MOQ)
- Laser etching: $0.50 per unit
- Packaging: $0.20 per unit
- Shipping (in pack): $0.50 per unit
- **Total cost**: ~$3-4 per unit

### Retail pricing

- Single 4-cup container: $11.99
- 6-pack (mixed sizes): $49.99
- 12-pack: $89.99
- Bundled with 12-month premium subscription: $129.99 ($90 perceived value)

### Margin

- Single: 65% gross
- 6-pack: 50% gross
- Bundled: 60% gross

### Manufacturing partner

- Initial: small-batch manufacturer in China (MOQ 1000) via Alibaba / 1688
- Quality control: third-party inspection (PI / Asiainspection) before shipment
- Fulfillment: 3PL in US (e.g., ShipBob)
- Shipping: USPS / FedEx Ground

### Tooling cost (one-time)

- Custom mold: $20-50K
- Laser etching setup: $5K (subcontracted to manufacturer)
- Photography / packaging design: $5K

**Total upfront**: $30-60K. Defer until we have customer demand and ~$50K in revenue to justify.

### Distribution

- Direct via Shopify
- Target: Wave 4 onboards Amazon FBA
- Wave 5+: brick-and-mortar retail (Target, Bed Bath & Beyond)

### Validation gate

Before tooling:
- 100+ paying customers
- $25K+ in MRR
- 50+ users requesting branded containers in support tickets
- Pre-orders fund tooling

## Phase 4+ — Future hardware (NOT planned, NOT promised)

These are open possibilities, NOT decisions:

### Phase 4a: Bluetooth temperature cartridges (sealed, removable)

**Only if** customer demand validates AND we can solve durability.

Design (sketched only, not committed):
- Sealed plastic cartridge with bayonet mount onto branded lid
- Inside: tiny BLE chip + temp sensor + 200mAh rechargeable Li-po + USB-C charge port
- User unclips before washing
- Cartridge sends temp readings to phone
- Phone uses temp + storage time → more accurate spoilage prediction

Engineering challenges:
- Bayonet mount durability (500+ cycle test)
- Sealing the cartridge interior
- Battery life > 6 months on a single charge
- Manufacturing yield

Cost estimate:
- BOM: $12-15 per cartridge
- Retail: $40-60 per cartridge

Decision criteria: **revisit after Phase 3 has 1000+ customers**.

### Phase 4b: Smart fridge integration (no new hardware)

Partner with Samsung Family Hub / LG ThinQ / GE — read their fridge inventory APIs and surface in our app. No hardware.

This is post-MVP API work (Wave 6), not hardware.

### Phase 4c: NFC tags

Cheaper than QR; tap-to-open with phone. Could replace stickers in Phase 2.
- $0.10 per tag in bulk
- Compatible with iPhone/Android NFC
- No camera needed (faster scan)
- Decision after Phase 2 sticker sales validate the market

## Hardware roadmap summary

```
Phase 1 (MVP)              Paper QR, user-printed                 Day 1
Phase 2 (post-MVP)         Branded waterproof sticker kits        T+1-3 months
Phase 3 (validated)        Branded containers, laser-etched QR    T+6-9 months
Phase 4a (maybe)           Bluetooth temp cartridges              T+12-18 months (if validated)
Phase 4b (parallel)        Smart fridge API integrations          T+9-12 months (with Wave 6)
Phase 4c (maybe)           NFC tags                                T+6-12 months (sticker replacement)
```

## How the app design supports all phases

We designed the app so QR is QR — a token in a Universal Link. Whether that token is on:
- Paper sticker
- Branded sticker
- Laser-etched lid
- NFC tag (after API change)

…the app behaves identically. Switching hardware doesn't require app changes.

This is the **software-first** principle: hardware augments the experience, never replaces the core.

## Hardware-specific risks

- **Manufacturing defect**: third-party inspection + sample QC
- **Customs / shipping**: spread suppliers across 2 countries (China + Vietnam) post-validation
- **Returns / refunds**: 30-day no-questions-asked policy; budget 5% return rate
- **Liability** (food contact): use only suppliers with FDA / EU food-contact certifications
- **Inventory tied up**: order in tranches; don't pre-order > 3 months supply

## Hardware not currently planned

- Smart trash cans (separate market)
- Specialized scales
- Custom appliances
- AR glasses integration

We stay focused on food storage containers. That's our wedge.

## Cross-references

- App-side QR generation → [07_FEATURES.md](07_FEATURES.md) F-005
- Architecture support for hardware-agnostic tokens → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- Future revenue from hardware → [11_MONETIZATION.md](11_MONETIZATION.md)
