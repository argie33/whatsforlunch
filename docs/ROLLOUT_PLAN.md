# Phased Rollout Plan — What's For Lunch

## Timeline overview

| Phase | Scope | Audience | Duration | Go criteria |
|---|---|---|---|---|
| 0 — Dog food | Internal | Team only | 1 week | Zero P0 crashes |
| 1 — Closed beta | TestFlight / Play Internal | 50 handpicked testers | 2 weeks | < 1% crash rate, NPS ≥ 40 |
| 2 — Open beta | TestFlight public / Play Open | 100–500 testers | 2 weeks | P1 queue clear, Core funnel ≥ 60% |
| 3 — Soft launch | App Store / Play (20% rollout) | General public, 20% | 1 week | No P0/P1, rating ≥ 4.0 |
| 4 — Full launch | 100% rollout | General public, 100% | ongoing | — |

---

## Phase 0 — Dog food (internal)

**Goal**: Shake out launch-blockers before anyone outside sees the app.

**Steps**:
1. Trigger production EAS build: `gh workflow run mobile-build.yml -f platform=all -f profile=production`
2. Submit to TestFlight internal group + Play Internal Testing (team accounts only)
3. All team members use the app daily for 1 week
4. Triage every Sentry event daily; close all P0s before moving to Phase 1

**Exit criteria**:
- Crash-free sessions ≥ 99% (Sentry)
- No P0 issues open
- Core onboarding → add first item flow works on iOS 16+, Android 12+

---

## Phase 1 — Closed beta (50 testers)

**Goal**: Real users, controlled blast radius.

**Recruit via**:
- Personal networks
- r/MealPrepSunday, r/ZeroWaste (post invite form link)
- Friends-and-family email

**Distribute**:
- iOS: App Store Connect → TestFlight External → invite by email
- Android: Play Console → Internal Testing → add tester emails

**Feedback channels**:
- In-app feedback button → routes to `support@whatsforlunch.app`
- TestFlight feedback (iOS built-in)
- Optional: Discord server `#beta-feedback`

**Metrics to watch** (PostHog dashboards):
```
Onboarding funnel: ONBOARDING_STARTED → SIGN_IN_COMPLETED → ITEM_ADD_COMPLETED
Target: ≥ 60% complete the funnel within first session

7-day retention
Target: ≥ 40%

AI classify usage
Target: ≥ 50% of new items use AI (photo/barcode)
```

**Exit criteria**:
- Crash-free sessions ≥ 99.5%
- Onboarding funnel completion ≥ 60%
- NPS score ≥ 40 (survey sent at day 7)
- No P1 open

---

## Phase 2 — Open beta (100–500 testers)

**Goal**: Stress test sync, AI quota, DynamoDB capacity.

**Distribute**:
- iOS: TestFlight public link (App Store Connect → TestFlight → Public Link)
- Android: Play Console → Open Testing track

**Announce on**:
- Reddit: r/MealPrepSunday, r/Frugal, r/ZeroWaste
- Twitter/X: announce public beta
- ProductHunt "upcoming" page (start collecting upvotes)

**Scale monitoring** (CloudWatch):
```
Watch: DynamoDB throttled requests → alarm at threshold 1
Watch: Lambda error rate → alarm at 1%
Watch: AI classification cost/day → alarm at $50/day (abuse indicator)
Watch: AppSync 5xx rate
```

**Load test**: before opening beta, run k6 script at 10× expected DAU.

**Exit criteria**:
- P1 queue clear
- Core funnel ≥ 60%
- App Store review submitted + approved
- Play Store review submitted + approved
- Sentry crash-free sessions ≥ 99.5%

---

## Phase 3 — Soft launch (20% rollout)

**iOS**:  
App Store Connect → Phased Release → ON  
(Apple distributes to 1%→2%→5%→10%→20%→50%→100% over 7 days automatically)

**Android**:  
Play Console → Production → Create new release → Rollout percentage: 20%

**Watch for 1 week**:
- Rating: if < 4.0 stars pause rollout and investigate
- Crash rate: if > 1% pause rollout
- CloudWatch: DynamoDB/Lambda health

**Rollout controls**:
```bash
# Pause Android rollout
# Play Console UI → Production → Manage rollout → Halt rollout

# Emergency OTA fix (JS-only changes — does not require App Store review)
gh workflow run eas-update-production.yml -f message="hotfix: <description>"

# Full binary rollback iOS — expedited review request in App Store Connect
# Full binary rollback Android — halt rollout, activate previous release in Play Console
```

---

## Phase 4 — Full launch (100%)

**iOS**: App Store Connect → Phased Release → Complete release (or wait 7 days)

**Android**: Play Console → Production → Manage rollout → 100%

**Launch day checklist**:
- [ ] ProductHunt launch post live
- [ ] Press kit sent to food/tech bloggers (`docs/press-kit/`)
- [ ] Status page live at `status.whatsforlunch.app`
- [ ] Support email `support@whatsforlunch.app` monitored
- [ ] On-call rotation set for first week

---

## Rollback decision tree

```
P0 crash detected (Sentry alert fires)
├─ JS-only fix possible?
│   ├─ YES → eas update --channel production (live in ~5 min, no review)
│   └─ NO  → pause App Store phased release
│             halt Android rollout
│             → hotfix binary build → expedited review
│
P1 data loss / auth failure
└─ Same as P0 path above
   If DynamoDB: restore from PITR (see rollback-cdk.md)
   If AppSync: revert CDK stack (see rollback-cdk.md)
```

---

## Key contacts

| Role | Contact |
|---|---|
| Ops on-call | ops@whatsforlunch.app |
| Apple review escalation | App Store Connect → Contact Us |
| Google Play review escalation | Play Console → Policy → Contact |
| Sentry alerts | configured in ops-stack.ts (SNS → ops@) |
| EAS build issues | Expo Discord #eas-build |
