# Customer Support Setup Runbook

## Overview

WFL's support stack:

| Channel | Tool | For |
|---------|------|-----|
| Email | Google Workspace `support@whatsforlunch.app` | Primary inbound |
| In-app feedback | Sentry User Feedback | Crash reports + quick feedback |
| Bug tracking | Linear | Engineering triage |
| Help center | Notion (public) | Self-serve FAQ |

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

| Priority | Value |
|----------|-------|
| 1 | ASPMX.L.GOOGLE.COM |
| 5 | ALT1.ASPMX.L.GOOGLE.COM |
| 5 | ALT2.ASPMX.L.GOOGLE.COM |
| 10 | ALT3.ASPMX.L.GOOGLE.COM |
| 10 | ALT4.ASPMX.L.GOOGLE.COM |

Add SPF TXT record:
```
v=spf1 include:_spf.google.com ~all
```

### Gmail filters (auto-label)

Create filters for common subjects:

| Subject contains | Label | Auto-reply |
|-----------------|-------|------------|
| bug | Bug Report | No |
| can't log in | Account | Yes (see template below) |
| delete my account | GDPR | No — human must confirm |
| refund | Billing | No — escalate |

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

| Frequency | Action |
|-----------|--------|
| Daily (weekday) | Check new feedback, flag crashes |
| Weekly | Export P1+ items to Linear |
| Monthly | Review patterns, update FAQ |

---

## Step 3 — Linear Integration

### Create support label

```
Linear → Settings → Labels → New label: "Support"
Color: yellow
```

### Routing

| Source | Action |
|--------|--------|
| Email bug report | Create Linear issue manually, label "Support" + "P1/P2/P3" |
| Sentry crash | Auto-creates Linear issue via Sentry→Linear integration |
| App store review | Weekly sweep — create Linear issue if actionable |

### Sentry → Linear integration

1. Sentry → Settings → Integrations → Linear → Connect
2. Map `wfl-mobile` project → `WFL` Linear team
3. Enable "Create issue on first occurrence of new error"

---

## Step 4 — Response SLAs

| Priority | First response | Resolution |
|----------|---------------|------------|
| P0 (crash, data loss) | 2h | 24h |
| P1 (core flow broken) | 24h | 72h |
| P2 (cosmetic) | 48h | Next sprint |
| General inquiry | 48h | 5 business days |

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

## Contacts / Escalation

| Issue | Escalate to |
|-------|-------------|
| Security vulnerability | `security@whatsforlunch.app` (alias → founder) |
| Legal / IP | `legal@whatsforlunch.app` (alias → founder) |
| Press inquiry | `press@whatsforlunch.app` |
| Billing dispute | RevenueCat dashboard + Stripe |
