# 12 — Customer Support, Feedback & Communication

A real product needs real support channels. We design these from day one even if we're a small team.

## Support tiers

### Free tier
- Email-based support: `support@whatsforlunch.app`
- 48-hour response SLA (business hours)
- FAQ self-serve

### Premium tier
- Same email + Crisp in-app chat
- 24-hour response SLA
- "Priority Support" badge in settings (cheap perceived value)

### Crashes / data loss (any tier)
- < 4-hour response regardless of tier
- Sentry alerts route to PagerDuty

## Tooling stack

### MVP (free)
- **Email**: `support@`, `hello@` via Google Workspace ($7/user/mo)
- **FAQ / knowledge base**: Notion public page (free)
- **Bug reporting**: Sentry React Native SDK (free tier 5K errors/mo)
- **Crash reports**: Sentry (free)
- **Total cost**: < $10/mo

### Post-1K MAU
- Add **Crisp** ($0–25/mo) for in-app chat — value pick over Intercom ($74+/mo)
- Add **Canny** ($79/mo) for public feature voting once at 5K+ users

### Avoid
- **Zendesk** — overkill for consumer mobile until support team exists
- **Intercom** — gold standard but expensive at MVP
- **Helpshift** — mobile-first but enterprise-priced; only past 100K MAU

## In-app support (the critical UX)

### Settings > Help & Support

Three options:
1. **Browse FAQ** → opens Notion page in WebView (or Safari)
2. **Email us** → mailto link with pre-filled subject + device info
3. **Report a bug** → custom screen

### Bug report screen

```
┌────────────────────────────────────┐
│ ← Report a bug                     │
│                                    │
│ What happened?                     │
│ ┌────────────────────────────────┐ │
│ │ Describe the bug...            │ │  textarea
│ └────────────────────────────────┘ │
│                                    │
│ ☑ Attach screenshot                │
│ ☑ Attach recent app activity       │
│                                    │
│ The following will be sent:        │
│ • App version: 1.0.2               │
│ • Device: iPhone 14 Pro             │
│ • OS: iOS 17.4.1                   │
│ • User ID: (hashed)                │
│ • Sentry ID: abc-123               │
│                                    │
│ [ Send ]                           │
└────────────────────────────────────┘
```

Auto-attaches:
- App version, OS version, device model, locale
- User ID (hashed for privacy)
- Sentry event ID (for cross-reference)
- Last 50 log lines (sanitized)
- Recent screen breadcrumbs from Sentry
- Optional screenshot

Sends via:
- Email to `support@` for processing
- (Wave 2) Crisp in-app chat conversation

### Shake-to-report

- `react-native-shake` library
- Three shakes within 2s → opens bug report modal
- Includes screenshot (`react-native-view-shot`)
- Can be disabled in settings (if user prefers)

## Feedback collection

### App Store / Play Store ratings

- Use `SKStoreReviewController` (iOS) / Play In-App Review API (Android)
- Trigger after positive moment: user marks 5+ items as eaten (not tossed)
- Apple caps at 3 prompts/year automatically
- Don't trigger on first launch, after a crash, or to free users on hard quota hits

### NPS (Net Promoter Score)

- Ask at Day 14 of active use, then quarterly
- Use **PostHog Surveys** (already integrated) or **Delighted**
- "On a scale of 0-10, how likely are you to recommend WhatsForLunch to a friend?"
- Follow-up: "What's the main reason for your score?"

### Feature requests

#### MVP (no tools)
- Notion board
- Read responses to support email
- Track in Linear

#### Post-5K users (add Canny)
- Public feature voting board
- Categories: Bug, Feature Request, Improvement
- Auto-import from support emails
- Status updates: Planned → In Progress → Shipped
- Auto-post to Twitter on "Shipped"

### User interviews

- Recruit 5-10 power users for monthly 30-min calls
- Record (with permission) for product team review
- Compensate with free Premium year

## Communication channels

### Email
- `support@whatsforlunch.app` — primary support
- `hello@whatsforlunch.app` — general inquiries / press
- `security@whatsforlunch.app` — security disclosures
- All routed to Google Workspace shared inbox

### Social
- **Twitter/X**: claim `@whatsforlunch` early (squatters are real)
- **Instagram**: `@whatsforlunch` — post recipe / waste-reduction content
- **Reddit**: monitor r/foodhacks, r/MealPrepSunday, r/ZeroWaste mentions

### Status page
- Not needed until 50K+ MAU
- Then use **Instatus** ($20/mo) or **Better Stack**
- Auto-detect outages from CloudWatch alarms
- Subscribe via email, RSS, Twitter

### Community
- Discord: defer until 5K+ engaged users (premature communities die)
- Subreddit: defer until users want one

## Response procedures

### Tier 1 (auto-resolve)
- FAQ matches → reply with link
- Common questions ("how do I delete my account?", "how do I cancel?") → templated response

### Tier 2 (manual)
- Personalized response within SLA
- Check Sentry for related crash
- Check PostHog for user's funnel state
- Refund requests honored within 14 days (generous policy)

### Tier 3 (escalation)
- Data loss → engineer pages
- Security issue → security@ inbox + immediate response
- Outage → status page update + tweet

### Documentation of every interaction
- All support tickets stored
- Track recurring issues → feed to product backlog
- Quarterly review of top 10 support topics → drive UX improvements

## In-app announcements

Important communications surfaced in-app:
- New feature launches (banner on dashboard)
- Subscription billing issues
- Security updates / forced re-auth
- Outages (rare; only when CloudWatch detects)

Use **PostHog feature flags** to control message visibility per cohort.

## Email marketing (post-launch)

Optional opt-in during onboarding: "Get monthly tips on reducing food waste"

- **Tool**: PostHog has email functionality, or use **Resend** ($0-20/mo at MVP scale)
- **Cadence**: monthly newsletter, weekly during first month
- **Content**: reduce-waste tips, new features, recipe of the week
- **Compliance**: CAN-SPAM, GDPR; clear unsubscribe in every email

## Press kit (for Wave 2+)

Hosted at `https://whatsforlunch.app/press`:
- Logo (PNG, SVG, light + dark)
- Screenshots (high-res)
- Founder bio + photo
- One-line description
- Long description
- Press inquiries email

## App Store reviews monitoring

- Daily check of new reviews (App Store Connect + Play Console)
- **Replies posted within 48h** to negative reviews
- Track sentiment trend
- Use top complaints to prioritize roadmap

## Customer onboarding emails (post-MVP)

Welcome email series via Resend:
- Day 0: "Welcome — here's how to get started"
- Day 1: "Tip: scan your first item"
- Day 3: "Did you know about AI photo classification?"
- Day 7: "Your first week — here's what you saved"
- Day 14: NPS survey

## Customer success metrics

- **First-response time** (target < 24h)
- **Resolution time** (target < 48h)
- **CSAT** (Customer Satisfaction Score, surveyed post-resolution)
- **Ticket volume / MAU** (lower = better UX)
- **Sentry crash-free sessions** (target > 99.5%)
- **NPS** (target 40+)
- **App Store rating** (target ≥ 4.5)

## Internal team support

For workers / contributors:
- Technical issues → GitHub Issues
- Architecture questions → docs/ folder + ADR file
- Quick chat → Slack (if team scales) / Discord

## Pre-launch readiness

Before public launch:

- [ ] `support@whatsforlunch.app` tested end-to-end
- [ ] FAQ Notion page written, covers top 20 questions
- [ ] Bug report flow tested on real device
- [ ] Sentry alerts wired to PagerDuty (or email if no on-call)
- [ ] Privacy policy + Terms accessible in app
- [ ] Status page (or "we're working on it" if no incidents)
- [ ] Twitter handle claimed
- [ ] Reply templates drafted for common questions
- [ ] Refund policy documented and team-trained

## Cross-references

- Bug reporting via Sentry → [13_OBSERVABILITY.md](13_OBSERVABILITY.md)
- App Store / Play Store policies → [10_APP_STORES.md](10_APP_STORES.md)
- Privacy policy contents → [04_SECURITY.md](04_SECURITY.md)
