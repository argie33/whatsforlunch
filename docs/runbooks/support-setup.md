# Customer Support Setup Runbook

## Overview

WFL's support stack:

| Channel         | Tool                                         | For                            |
| --------------- | -------------------------------------------- | ------------------------------ |
| Email           | Google Workspace `support@whatsforlunch.app` | Primary inbound                |
| In-app feedback | Sentry User Feedback                         | Crash reports + quick feedback |
| Bug tracking    | Linear                                       | Engineering triage             |
| Help center     | Notion (public)                              | Self-serve FAQ                 |

---

## Step 1 — Google Workspace (support@ email)

### Create workspace (skip if already done)

1. Go to `admin.google.com`
2. Create workspace for `whatsforlunch.app`
3. Add billing card (Starter plan — $6/user/month)

### Create support@ mailbox

```
Admin console → Directory → Users → Add new user
Name: Support
Email: support@whatsforlunch.app
Role: Editor (limited admin)
```

### DNS records (in Route 53 or Cloudflare)

Add MX records:

| Priority | Value                   |
| -------- | ----------------------- |
| 1        | ASPMX.L.GOOGLE.COM      |
| 5        | ALT1.ASPMX.L.GOOGLE.COM |
| 5        | ALT2.ASPMX.L.GOOGLE.COM |
| 10       | ALT3.ASPMX.L.GOOGLE.COM |
| 10       | ALT4.ASPMX.L.GOOGLE.COM |

Add SPF TXT record:

```
v=spf1 include:_spf.google.com ~all
```

### Gmail filters (auto-label)

Create filters for common subjects:

| Subject contains  | Label      | Auto-reply               |
| ----------------- | ---------- | ------------------------ |
| bug               | Bug Report | No                       |
| can't log in      | Account    | Yes (see template below) |
| delete my account | GDPR       | No — human must confirm  |
| refund            | Billing    | No — escalate            |

### Auto-reply template (out of office / first response)

```
Subject: We got your message — expect a reply within 48h

Hi [Name],

Thanks for reaching out to WhatsForLunch support.

We've received your message and will reply within 48 business hours.
For urgent issues, describe the steps to reproduce the problem and
include your device model and app version (Settings → About).

— The WFL Team
support@whatsforlunch.app
```

---

## Step 2 — Sentry User Feedback

User feedback is already wired via `@sentry/react-native`. To view:

1. Sentry → Projects → `wfl-mobile` → User Feedback
2. Filter by `has_reply = false` to find open items
3. Reply directly from Sentry or export to Linear

### Triage cadence

| Frequency       | Action                           |
| --------------- | -------------------------------- |
| Daily (weekday) | Check new feedback, flag crashes |
| Weekly          | Export P1+ items to Linear       |
| Monthly         | Review patterns, update FAQ      |

---

## Step 3 — Linear Integration

### Create support label

```
Linear → Settings → Labels → New label: "Support"
Color: yellow
```

### Routing

| Source           | Action                                                     |
| ---------------- | ---------------------------------------------------------- |
| Email bug report | Create Linear issue manually, label "Support" + "P1/P2/P3" |
| Sentry crash     | Auto-creates Linear issue via Sentry→Linear integration    |
| App store review | Weekly sweep — create Linear issue if actionable           |

### Sentry → Linear integration

1. Sentry → Settings → Integrations → Linear → Connect
2. Map `wfl-mobile` project → `WFL` Linear team
3. Enable "Create issue on first occurrence of new error"

---

## Step 4 — Response SLAs

| Priority              | First response | Resolution      |
| --------------------- | -------------- | --------------- |
| P0 (crash, data loss) | 2h             | 24h             |
| P1 (core flow broken) | 24h            | 72h             |
| P2 (cosmetic)         | 48h            | Next sprint     |
| General inquiry       | 48h            | 5 business days |

---

## Step 5 — App Store Review Monitoring

### iOS

1. App Store Connect → My Apps → WFL → Ratings and Reviews
2. Sort by "Most Recent" weekly
3. Reply to 1-star reviews within 48h — it improves ratings and shows Apple engagement

Reply template (1-star with specific complaint):

```
Hi [Name], thanks for the feedback. We've logged this issue and
are working on a fix. Please update to the latest version and let
us know if it persists at support@whatsforlunch.app.
— WFL Team
```

### Android

1. Play Console → WFL → Ratings and Reviews → Filter: 1-2 stars, Unanswered
2. Same SLA and template as iOS

### Monitoring script (optional)

Add to `nightly.yml` to get Slack alerts for new 1-star reviews:

```yaml
- name: Check app store reviews
  run: |
    # Placeholder: integrate with AppFollow or AppBot API
    echo "Manual check: https://appstoreconnect.apple.com"
```

---

## Step 6 — GDPR / Account Deletion Requests

When support@ receives a deletion request:

1. Verify identity: reply asking user to confirm from their registered email
2. Once confirmed, trigger deletion via AppSync mutation or directly via Lambda:

```bash
aws lambda invoke \
  --function-name wfl-delete-account-prod \
  --payload '{"userId":"<cognito-sub>","householdIds":["<hh-id>"],"purge":false}' \
  --cli-binary-format raw-in-base64-out \
  /tmp/response.json
```

3. Confirm deletion to user: "Your data has been queued for deletion. You'll receive a confirmation within 30 days once all data is permanently purged."
4. Log in Linear with label "GDPR" and date of request

The 30-day retention window is enforced automatically by the Step Function in `billing-stack.ts`.

---

---

## Step 7 — Reply Templates (Top 10 Questions)

Copy-paste these in Gmail. Replace `[Name]` with the user's name where shown.

### T1 — Can't log in / magic link not received

```
Hi [Name],

Sorry to hear you're having trouble signing in! Here are a few things to try:

1. Check your spam / junk folder for the magic link email.
2. Make sure you're using the same email address you signed up with.
3. Magic links expire after 10 minutes — tap "Resend" on the sign-in screen if needed.
4. On iOS 17+, check that Mail is not filtering our domain. Settings → Mail → Focused Inbox → Other.

If none of the above helps, reply with your email address and we'll look it up on our end.

— The WFL Team
```

### T2 — AI classification got it wrong

```
Hi [Name],

Thanks for letting us know! The AI isn't perfect — it works best with clear, well-lit photos of individual items.

When the AI guesses wrong, tap "Edit" on the result to correct it. Your corrections help us improve future accuracy.

If you're seeing consistent wrong guesses for a specific food type, let us know what it is and we'll add it to the training set.

— The WFL Team
```

### T3 — Items disappeared / data gone

```
Hi [Name],

I'm sorry to hear about the data issue — that's really frustrating.

A few questions to help me investigate:
- Did you recently switch devices or sign in on a new phone?
- Were the items shared in a household?
- When did you last see them (roughly)?

If you're on WiFi and the sync spinner (top of the dashboard) is still showing, wait a minute and pull down to refresh — the items may still be syncing.

I'll look into your account as soon as I hear back from you.

— The WFL Team
```

### T4 — How do I cancel / refund

```
Hi [Name],

To cancel your Premium subscription:

iOS: Settings → Apple ID → Subscriptions → WhatsForLunch → Cancel
Android: Play Store → Subscriptions → WhatsForLunch → Cancel

Cancellations take effect at the end of the current billing period — you won't be charged again.

For a refund, Apple and Google handle billing directly:
- iOS refunds: reportaproblem.apple.com
- Android refunds: play.google.com/store/account/subscriptions

If you're within 24 hours of your first charge and have a specific issue, we can request a refund on your behalf — just let us know.

— The WFL Team
```

### T5 — How do I delete my account

```
Hi [Name],

You can delete your account directly in the app:
Settings → Scroll to bottom → Delete Account

Your data is soft-deleted immediately (no one can see it) and permanently purged within 30 days per our privacy policy.

If you'd prefer us to trigger it manually, reply to confirm and we'll process it within 24 hours. Please confirm from your registered email address so we can verify your identity.

— The WFL Team
```

### T6 — How do I invite family members

```
Hi [Name],

To invite someone to your household:

1. Tap Settings → Household
2. Tap "Invite member"
3. Enter their email address or share the invite link

They'll receive an email with a join link. Once they accept, you'll both see the same fridge in real time.

Each account supports one household at MVP — multi-household support is coming in the next wave.

— The WFL Team
```

### T7 — Notifications not working

```
Hi [Name],

Let's get those expiry alerts working!

1. Make sure notifications are enabled: Settings → Notifications → WhatsForLunch
2. In the app: Settings → Notifications → make sure "Expiry alerts" is on
3. Items need an expiry date set before a notification can be scheduled — check that the item has a date.
4. Notifications fire 1 day before expiry and 2 hours before (if expiring the same day).

If you've checked all of the above and they're still not arriving, restart the app and let me know what device + OS version you're on.

— The WFL Team
```

### T8 — QR sticker / container not working

```
Hi [Name],

QR sticker tips:

- Make sure the sticker is flat and well-lit when scanning (no glare, full QR code visible).
- The container must be created in the app before the QR can be linked to it.
- If you printed your own stickers: verify the QR code links to https://whatsforlunch.app/c/<token> — the URL must be exact.

To regenerate a sticker: Containers → [container name] → Print Sticker

If scanning still fails, share a photo of the sticker and I'll investigate.

— The WFL Team
```

### T9 — I found a bug

```
Hi [Name],

Thanks for reporting this — every bug report makes the app better!

Could you share:
1. Steps to reproduce (what you tapped and in what order)
2. What you expected to happen vs. what actually happened
3. Your device model and app version (Settings → About → Version)
4. A screenshot if you can

I'll log this as an issue and reply when we have a fix. If it's blocking you, let me know and I'll bump the priority.

— The WFL Team
```

### T10 — Feature request

```
Hi [Name],

Thanks for the suggestion — I've logged it! We're a small team but we do read every request.

Our public roadmap isn't live yet, but here's what's coming in the next wave:
- Recipe suggestions based on what's in your fridge
- Barcode scanning for packaged goods
- Grocery list integration
- Multi-household support

If your request fits one of those, it's already on our radar. If it's something new, we'll add it to the backlog.

Thanks for taking the time to write in.

— The WFL Team
```

---

## Contacts / Escalation

| Issue                  | Escalate to                                    |
| ---------------------- | ---------------------------------------------- |
| Security vulnerability | `security@whatsforlunch.app` (alias → founder) |
| Legal / IP             | `legal@whatsforlunch.app` (alias → founder)    |
| Press inquiry          | `press@whatsforlunch.app`                      |
| Billing dispute        | RevenueCat dashboard + Stripe                  |
