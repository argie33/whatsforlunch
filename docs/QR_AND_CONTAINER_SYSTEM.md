# QR Code & Container System Design

**Scope**: Support 3 business models for QR codes + containers  
**Models**: (1) DIY print-at-home, (2) Pre-printed packs sold, (3) Containers with engraved QR codes

---

## 1. Data Model

### Containers Table

Tracks physical containers and their QR codes.

```sql
containers {
  id: UUID (local)
  cloud_id: UUID (synced to cloud)
  household_id: UUID (who owns this container)

  -- QR Identity
  qr_token: STRING (8-char, e.g. "A1B2C3D4")
  qr_number: INTEGER (numeric ID for user reference, e.g. #42)

  -- Physical Details
  nickname: STRING (user's label, e.g. "Front Fridge")
  imageUrl: STRING (photo of container)

  -- Source (determines how physical code was obtained)
  qr_source: ENUM['diy_printed', 'pre_printed_pack', 'engraved_container']

  -- Pre-printed/Engraved Tracking
  pack_id: UUID (if pre_printed_pack)
  container_order_id: UUID (if engraved_container)

  -- Lifecycle
  claimed_at: TIMESTAMP (when user first scanned this QR)
  archived_at: TIMESTAMP (soft delete)

  -- Sync
  _version: INTEGER
  _last_changed_at: TIMESTAMP
}
```

### QRCode Packs Table (Pre-printed inventory)

Tracks packs of pre-printed QR codes sold.

```sql
qr_code_packs {
  id: UUID
  shop_sku: STRING (e.g. "WFL-QR-24-01")

  -- Contents
  qr_count: INTEGER (typically 24, 50, 100)
  page_size: ENUM['letter', 'a4']
  finish: ENUM['matte_sticker', 'glossy_sticker', 'label_roll']

  -- Codes in this pack (pre-generated, not yet claimed)
  qr_tokens: [STRING] (array of 24 tokens)

  -- Inventory
  batch_generated_at: TIMESTAMP
  batch_printed_at: TIMESTAMP
  boxes_in_stock: INTEGER

  -- Commerce
  price_usd: DECIMAL
  active: BOOLEAN
}
```

### Container Products Table (Hardware with engraved QR)

Tracks containers sold with engraved QR codes.

```sql
container_products {
  id: UUID
  shop_sku: STRING (e.g. "WFL-CONT-500ML-01")

  -- Physical
  volume_ml: INTEGER
  material: ENUM['glass', 'plastic_bpa_free']
  color: STRING

  -- QR Details
  qr_token: STRING (engraved on lid)
  qr_number: INTEGER
  engraving_style: ENUM['laser_etched', 'printed']

  -- Inventory & Commerce
  boxes_in_stock: INTEGER
  price_usd: DECIMAL
  active: BOOLEAN
}
```

---

## 2. Three Business Flows

### Flow A: DIY Print-at-Home

```
User in Containers tab
  → Tap "Print QR codes"
  → Selects:
     - How many QR codes (24, 50, 100, custom)
     - Page size (Letter / A4)
     - Sticker type (optional: matte/glossy for future)
  → Generates unique tokens locally
  → Builds printable PDF (24 per page)
  → Options: [Print] [Export as PDF] [Share]

On printer:
  → 24 QR codes per page
  → Numeric ID below each (#1, #2, ... #24)
  → Dashed border for easy cutting
  → High DPI (600 minimum)

After printing & applying to containers:
  → User can scan QR codes in app
  → First scan "claims" container for that household
  → User sets nickname, photo, location
```

**Data Flow**:

- No pre-generation needed
- Tokens generated on-device, synced to cloud
- User stores physical containers however they want
- Each scan creates Container record

### Flow B: Pre-printed Packs (Sold on Shop)

```
User in Shop
  → Browse "QR Code Packs"
  → Options:
     - 24 codes (Letter / A4)
     - 50 codes
     - 100 codes
  → Add to cart, checkout
  → Shipped within 3-5 days

User receives packs:
  → Each pack contains 24 ready-to-use stickers
  → Already printed, already cut (easy peel)
  → Numeric IDs printed below QRs
  → Can apply directly to any containers

In app:
  → After purchasing, "Activate QR Pack"
  → Scan first QR code
  → App pairs pack tokens to household
  → User can now use codes to claim containers
```

**Data Flow**:

- Admin pre-generates N packs (tokens)
- Stores in QRCode Packs table with status "active"
- User purchases → packs assigned to household
- First scan activates the codes for that household
- Codes become available for claiming containers

### Flow C: Containers with Engraved QR

```
User in Shop
  → Browse "Containers with QR"
  → Pick:
     - Volume (250ml, 500ml, 1L)
     - Material (glass, BPA-free plastic)
     - Color
  → 1x Ordered
  → Receives container with QR engraved on lid

In app:
  → Scan QR on container lid
  → App recognizes it's a "container product"
  → Prompts: "Claim this container to [Household]"
  → Sets nickname, photo, etc.
  → Can now use for item tracking
```

**Data Flow**:

- Admin creates product in Container Products table
- Each product gets unique QR token + QR number
- Supplier engraves QR code on lids (laser etching)
- User scans → container linked to household
- Each container is unique (per-unit QR code)

---

## 3. UX Flows

### Mobile App (Containers Tab)

**Option 1: Print My Own**

```
[+ Create Container] button
  ↓
Modal: "How do you have your QR code?"
  ├─ DIY: I'll print it myself
  ├─ Pre-printed: I bought a pack from you
  └─ Hardware: It came engraved on a container

If DIY:
  → "How many QR codes?"
  → [24] [50] [100] [Custom]
  → Select page size: [Letter] [A4]
  → [Generate PDF]
  → [Print] [Share] [Download]
  → Shows preview: "24 codes per page"

If Pre-printed:
  → "Which pack did you buy?"
  → User selects from their purchase history
  → "Scan the first QR code to activate"
  → Scans → codes available for containers

If Hardware:
  → "Scan the QR code on your container"
  → User scans lid
  → Container auto-created with serial info
```

**Option 2: Scan & Claim**

```
Container tab → [Scan QR Code] button
  → Camera opens
  → User scans QR on container lid/sticker
  → App matches QR token to container
  → If new: "Found new container. Claim for [Household]?"
  → User: names it, adds photo
  → Container appears in list
```

### Shop (Future Commerce)

**Browse & Buy**

```
[Shop] tab → [QR & Containers]
  ├─ QR Code Packs
  │  ├─ 24-pack (Letter)
  │  ├─ 24-pack (A4)
  │  ├─ 50-pack
  │  └─ 100-pack
  │
  └─ Containers with QR
     ├─ 250ml Glass (4 colors)
     ├─ 500ml Glass (4 colors)
     ├─ 1L BPA-free plastic (3 colors)
     └─ Multi-pack discounts
```

---

## 4. Database Schema Additions

### New Fields in Containers

```typescript
interface Container {
  id: string; // local ID
  cloudId?: string; // synced to cloud
  householdId: string;

  // QR Identity
  qrToken: string; // "A1B2C3D4" (8 char, unique)
  qrNumber: number; // 42 (user-friendly reference)

  // Source determines lifecycle
  qrSource: 'diy_printed' | 'pre_printed_pack' | 'engraved_container';

  // Backlinks to commerce
  packId?: string; // if from QRCode Pack purchase
  containerProductId?: string; // if from Container Product
  containerOrderId?: string; // if purchased from shop

  // Container details
  nickname: string;
  imageUrl?: string;
  location?: string; // "kitchen fridge" (optional)

  // Lifecycle
  claimedAt: number; // timestamp when first scanned
  archivedAt?: number; // soft delete

  // Sync
  _version: number;
  _lastChangedAt: number; // milliseconds
}
```

### New Tables in WatermelonDB

```typescript
// For tracking purchases
interface Order {
  id: string;
  householdId: string;
  orderType: 'qr_pack' | 'container_product' | 'multi_pack';
  lineItems: {
    packId?: string;
    containerProductId?: string;
    quantity: number;
    priceUsd: number;
  }[];
  totalUsd: number;
  status: 'ordered' | 'shipped' | 'delivered';
  shippedAt?: number;
  deliveredAt?: number;
  trackingNumber?: string;
  createdAt: number;
}

// For admin: track generated packs
interface QRPack {
  id: string;
  skuId: string; // "WFL-QR-24-LETTER-001"
  qrTokens: string[]; // [A1B2C3D4, B2C3D4E5, ...]
  qrCount: 24 | 50 | 100;
  pageSize: 'letter' | 'a4';
  finish: 'matte_sticker' | 'glossy_sticker';
  batchGeneratedAt: number;
  batchPrintedAt?: number;
  boxesInStock: number;
  priceUsd: number;
  active: boolean;
}
```

---

## 5. QR Code Scanned Flow

```
User scans any QR code
  ↓
Backend lookup: match qrToken
  ↓
Found in: [diy_printed | pre_printed_pack | engraved_container]
  ↓
If not yet claimed:
  → Show modal: "New container detected. Claim for [Household]?"
  → User confirms
  → Container record created locally + synced
  ↓
If already claimed:
  → Open Container detail view
  → Show items inside
  → Can add more items
  ↓
Unknown QR (not in system):
  → "This QR code isn't recognized"
  → Offer: [Scan again] [Enter token manually]
```

---

## 6. Future Expansion

### Phase 2: Commerce Integration

- [ ] Shop checkout with Stripe
- [ ] Shipping integration (Shopify Fulfillment)
- [ ] Inventory sync with warehouse
- [ ] Order tracking in app

### Phase 3: B2B / Bulk Orders

- [ ] Business accounts (restaurants, catering, meal prep)
- [ ] Custom branding on stickers/containers
- [ ] Volume discounts
- [ ] API for enterprise inventory

### Phase 4: Smart Containers

- [ ] Bluetooth-enabled containers
- [ ] Temperature sensors
- [ ] Auto-expiry warnings
- [ ] IoT integration

---

## 7. Implementation Checklist

- [ ] **Database**: Add `qr_source`, `pack_id`, `container_product_id` to Containers
- [ ] **Mobile Stickers Screen**: Already generates PDFs ✅
- [ ] **Scan & Claim Flow**: Already scans QR codes ✅
- [ ] **Container Detail**: Show which source (DIY/Pre-printed/Hardware)
- [ ] **Purchase History**: Link orders to containers
- [ ] **Shop Pages**: Browse QR packs and containers (Wave 2)
- [ ] **Admin Panel**: Generate/manage QR packs (separate interface)
- [ ] **Documentation**: Update user guide with all 3 flows
- [ ] **Sync**: Ensure containers sync across devices

---

## 8. URL Scheme for QR Codes

All QR codes encode a Universal Link that opens the app:

```
https://whatsforlunch.app/c/{qrToken}

Examples:
https://whatsforlunch.app/c/A1B2C3D4
https://whatsforlunch.app/c/X9Y8Z7W6

When scanned:
  → Opens app if installed
  → Falls back to web if not installed
  → Initiates claim/scan flow
```

---

## 9. Key Decisions

| Decision                            | Rationale                                |
| ----------------------------------- | ---------------------------------------- |
| Generate tokens client-side for DIY | No server round-trip, works offline      |
| Pre-generate packs on demand        | Inventory control, cost efficient        |
| Per-unit QR for containers          | Each container is unique, trackable      |
| Numeric ID below QR                 | User-friendly reference without scanning |
| Support Letter + A4                 | Global market (US + Europe)              |
| Soft delete containers              | Keep purchase history, don't lose data   |

---

**Status**: Design complete. Ready for implementation Phase 1 (existing flows) → Phase 2 (commerce).
