---
layout: '../layouts/LegalLayout.astro'
title: Privacy Policy — WhatsForLunch
description: How WhatsForLunch collects, uses, and protects your personal data.
lastUpdated: '2026-04-27'
---

# Privacy Policy

**Effective date: April 27, 2026**

WhatsForLunch ("we," "our," or "us") is committed to protecting your privacy. This policy explains what data we collect, why we collect it, and your rights regarding that data.

## 1. Summary (plain language)

- We collect your email address and the food data you enter.
- Photos you take are processed by AI to identify food, then **deleted immediately** — we never store them.
- We do not sell your data. Ever.
- You can delete your account and all data at any time, in the app.
- We use a small number of trusted sub-processors (listed below).

---

## 2. Data we collect

### 2.1 Account data
- Email address (required to sign in)
- Display name (optional)
- Profile photo (optional; stored in your account only)

### 2.2 Food data
- Food items you log: name, category, quantity, expiry date, storage location, notes
- Container names and QR codes you create
- Actions you take: marking items as eaten, tossed, frozen, or snoozed
- When and by whom items were added (for household sharing features)

### 2.3 AI classification data
- Photos you take within the app are sent to our AI model to identify food
- **Photos are deleted immediately after classification** — we do not retain them
- The classification result (food name, estimated expiry) is stored as food data

### 2.4 Usage and diagnostics
- Crash reports (via Sentry) — include device type, OS version, app version, and a stack trace. No personal food data is included in crash reports.
- Analytics events (via PostHog) — anonymized feature usage (e.g., "scan used," "item added"). We use this to improve the app. We do not use cookies or device fingerprinting.

### 2.5 Device data (local only)
- Your food data is stored locally on your device using encrypted storage.
- Sync data is transmitted over TLS to your account only.

---

## 3. How we use your data

| Purpose | Legal basis (GDPR) |
|---|---|
| Provide the app features you use | Contract |
| Send expiry notifications | Contract / Legitimate interest |
| AI food identification | Contract |
| Fix bugs and improve the app | Legitimate interest |
| Comply with legal obligations | Legal obligation |
| Respond to your support requests | Contract |

We do **not** use your data for advertising, profiling, or data brokerage.

---

## 4. Who we share data with

We use the following sub-processors. All are bound by data processing agreements.

| Sub-processor | Purpose | Location |
|---|---|---|
| Amazon Web Services (AWS) | Cloud infrastructure, database, AI processing | US-East-1 (primary), with EU options |
| Anthropic (via AWS Bedrock) | AI food classification | AWS-hosted |
| Sentry | Crash reporting | US |
| PostHog | Product analytics | US / EU |
| RevenueCat | Subscription management | US |
| Apple | Sign-in with Apple | Per Apple's privacy policy |
| Google | Sign-in with Google | Per Google's privacy policy |

We do not share your data with any other third parties.

---

## 5. Data retention

- **Food data**: retained while your account is active. Deleted immediately on account deletion.
- **Photos**: not retained (processed and discarded immediately).
- **Crash reports**: retained for 90 days.
- **Analytics**: retained for 12 months in aggregated, anonymized form.
- **Account data**: deleted within 30 days of account deletion request.

---

## 6. Your rights (GDPR / CCPA)

You have the right to:

- **Access** (Article 15): request a copy of all data we hold about you
- **Correction** (Article 16): correct inaccurate data
- **Deletion** (Article 17 / CCPA): delete your account and all associated data
- **Portability** (Article 20): export your food data as a CSV
- **Restriction**: limit how we process your data in certain circumstances
- **Object**: object to processing based on legitimate interest

**To exercise any of these rights:**
- Use the in-app options: Settings → Privacy → Export my data, or Settings → Account → Delete Account
- Email us at [privacy@whatsforlunch.app](mailto:privacy@whatsforlunch.app)

We will respond within **30 days** (or 45 days for complex requests, with notice).

**CCPA disclosures (California residents):**
- We do not sell personal information.
- We do not share personal information for cross-context behavioral advertising.
- You have the right to know, delete, and opt out (though we have nothing to opt out of — we don't sell or share data).

---

## 7. Children's privacy (COPPA)

WhatsForLunch is not directed to children under 13. We do not knowingly collect data from children under 13. If you believe a child under 13 has provided us personal data, please contact us and we will delete it.

Users in the EU must be at least 16 years old (or the applicable age of digital consent in their country) to create an account.

---

## 8. Security

- All data transmitted over TLS 1.3
- Data at rest encrypted with AES-256 (AWS KMS-managed keys)
- Local device data encrypted using platform secure storage (iOS Keychain / Android Keystore)
- Access tokens expire every 60 minutes
- We never store passwords (magic link / social sign-in only)
- We participate in responsible disclosure — contact [security@whatsforlunch.app](mailto:security@whatsforlunch.app)

---

## 9. International transfers

Our primary data processing region is AWS US-East-1. Data may be processed in the US even if you are located in the EU. We rely on Standard Contractual Clauses (SCCs) for EU-to-US transfers.

EU users can request that their data be stored in an EU region — contact [privacy@whatsforlunch.app](mailto:privacy@whatsforlunch.app).

---

## 10. Changes to this policy

We may update this policy. We'll notify you by email and/or an in-app notice for material changes. The "effective date" at the top reflects the latest update.

---

## 11. Contact

**Privacy inquiries:**
[privacy@whatsforlunch.app](mailto:privacy@whatsforlunch.app)

**General support:**
[support@whatsforlunch.app](mailto:support@whatsforlunch.app)

**Mailing address:**
WhatsForLunch  
[Address to be added]

---

*This policy was written to be read, not just to exist. If something is unclear, email us.*
