# Privacy Policy — What's For Lunch

**Effective date**: TBD (update before launch)
**Last updated**: 2026-04-26

**Published at**: https://app.whatsforlunch.app/privacy

---

## 1. Who we are

What's For Lunch ("we", "us", "our") is a food-tracking application. Our contact email is privacy@whatsforlunch.app.

---

## 2. What data we collect

### Data you give us

| Data | Why | Stored |
|---|---|---|
| Email address | Account creation, magic link sign-in | Yes, encrypted |
| Display name | Optional; shown to household members | Yes |
| Food photos | AI food classification | Temporarily (deleted after classification) |
| Food item names, categories, notes | Core app functionality | Yes |
| Expiry dates | Core app functionality | Yes |
| Dietary preferences, allergies | Personalization | Yes |
| Household membership | Sharing feature | Yes |

### Data collected automatically

| Data | Why |
|---|---|
| App version, device OS | Crash analysis |
| Crash reports, error traces | Fixing bugs (Sentry) |
| Feature usage events | Product improvement (PostHog) |
| Screen views | UX improvement (PostHog) |
| Anonymised user ID | Linking analytics events |

We do **not** collect:
- Full name (unless you enter it as your display name)
- Phone number
- Location (not collected in MVP)
- Contacts (not collected in MVP)
- Payment card data (handled entirely by Apple/Google)
- IP address in application logs

---

## 3. How we use your data

| Purpose | Lawful basis (GDPR) |
|---|---|
| Provide the food tracking service | Contract performance |
| Send expiry notifications | Contract performance |
| Improve the app (anonymised analytics) | Legitimate interests |
| Fix crashes and bugs | Legitimate interests |
| Comply with legal obligations | Legal obligation |
| Respond to support requests | Legitimate interests |

We do **not** use your data to:
- Show advertising
- Sell to third parties
- Train AI models on your personal food photos
- Track you across other apps or websites

---

## 4. AI processing

When you photograph food for AI classification:
- The image is sent over HTTPS to our API
- Our API forwards it to Anthropic's Bedrock service (AWS) for analysis
- The response (food name, estimated expiry) is returned to your device
- **The photo is not stored** after classification is complete
- Anthropic processes the image under their data processing terms and does not train on customer data

You can always override the AI suggestion or enter items manually without any photo.

---

## 5. Who we share data with

We use the following processors:

| Processor | Purpose | Location |
|---|---|---|
| Amazon Web Services (AWS) | Hosting, database, authentication, AI routing | US (us-east-1) |
| Anthropic (via AWS Bedrock) | AI food classification | US |
| RevenueCat | Subscription management | US |
| Sentry | Crash reporting | US / EU |
| PostHog | Product analytics | US / EU |
| Apple | App distribution, payment (iOS) | US |
| Google | App distribution, payment (Android) | US |

We do not sell your data to any third party.

EU users: we sign a Data Processing Agreement (DPA) with each processor and use Standard Contractual Clauses for US transfers where required.

---

## 6. Data retention

| Data | Retention |
|---|---|
| Account data | Until you delete your account |
| Food items | Until you delete them, or your account |
| Food photos | Deleted immediately after AI classification |
| Crash reports | 90 days |
| Analytics events | 12 months (anonymised aggregates kept longer) |
| Billing records | 7 years (legal requirement) |

---

## 7. Your rights

Depending on your location, you have the right to:

- **Access**: request a copy of your data (in-app: Settings > Privacy > Export My Data)
- **Deletion**: delete your account and all data (in-app: Settings > Account > Delete Account)
- **Correction**: update your profile (in-app: Settings > Profile)
- **Portability**: export your data in JSON format (in-app: Settings > Privacy > Export My Data)
- **Opt-out of analytics**: contact us at privacy@whatsforlunch.app
- **Lodge a complaint**: with your local data protection authority (EU: your member state's DPA)

Account deletion completes within 30 days. You'll receive an email confirmation when done.

---

## 8. Children's privacy (COPPA)

The app is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, contact us at privacy@whatsforlunch.app.

---

## 9. California privacy rights (CCPA)

California residents have the right to know what personal information we collect, the right to delete, and the right to opt-out of the sale of personal information. We do not sell personal information.

---

## 10. Changes to this policy

We'll post changes here and update the "Last updated" date. For material changes, we'll send an in-app notification.

---

## 11. Contact

privacy@whatsforlunch.app

What's For Lunch
[Business address — TBD before launch]
