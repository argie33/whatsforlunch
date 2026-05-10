# Bug Bash Runbook

## Purpose

A structured 2-hour session where the team and invited testers hammer the app to surface bugs before a public release milestone.

## Pre-requisites

- TestFlight (iOS) or Play Internal Testing (Android) build live
- Sentry project + dashboard accessible
- PostHog events flowing
- Linear board set up with a `Bug Bash` label and `P0`/`P1`/`P2` priority labels
- Slack `#bug-bash` channel created

## Schedule

| Milestone | When to run |
|-----------|-------------|
| Before closed beta | ≥ 1 week before beta invite drop |
| Before open beta | ≥ 2 weeks before public launch |
| Before App Store submit | ≥ 3 days after final RC build |

Aim for **1-2 hour** time-boxed session; longer sessions produce diminishing returns.

## Participants

| Role | Count |
|------|-------|
| Core team (W1-W10) | All available |
| External testers (TestFlight / Play) | 10-20 |
| One designated **scribe** | 1 |

The scribe captures bugs in Linear in real time so testers can focus on exploring.

---

## Session Structure

### T-30 min: Setup

1. Post invite in `#bug-bash`: build number, TestFlight/Play link, focus areas
2. Verify Sentry is receiving events: check Sentry Issues → Last 24h
3. Open Linear → Bug Bash board → archive any stale items
4. Start a shared Loom or Google Meet (optional — can be async for remote testers)

### T-0: Kick-off (5 min)

Read aloud:

> "For the next 90 minutes, try to break the app. Focus on edge cases, weird inputs, and the areas listed in the brief. If something feels off — UI glitch, slow response, confusing copy — file it. Use Sentry feedback or ping in Slack."

Share the **Focus Areas sheet** (see below).

### T+5 to T+90: Testing

- Testers explore freely; scribe watches Slack for reports and files Linear issues
- Every 30 min, scribe does a quick Sentry check for new crashes and calls them out in Slack
- Use device matrix: at least one iPhone (latest), one older Android, one tablet if possible

### T+90: Triage (20 min)

- Scribe and at least one engineer review all filed issues together
- Assign severity:
  - **P0** — crash, data loss, security issue → fix before release
  - **P1** — broken core flow (add item, scan, household invite) → fix before release
  - **P2** — visual glitch, non-critical error → can ship, fix in hotfix
  - **P3** — nice-to-have, copy tweak → backlog
- Assign owner for P0/P1 items immediately

### T+110: Wrap-up (10 min)

Post summary in `#bug-bash`:

```
Bug Bash Summary — [Build X.Y.Z] — [Date]

Participants: N
Issues filed: N total (N P0, N P1, N P2)
Crashes in Sentry: N new

P0 issues (must fix):
- #ISSUE Linear link — description

P1 issues (should fix):
- #ISSUE Linear link — description

Target fix PR: [date]
```

---

## Focus Areas (customize per session)

Copy this into the session brief and highlight 3-5 areas:

- **Onboarding** — sign-up, magic link, first household creation
- **Item logging** — manual entry, camera scan, barcode scan, pantry items (no expiry)
- **Expiry notifications** — manually advance device clock, verify notification fires
- **Household sharing** — invite link, member join, role change
- **Sync** — add item offline, reconnect, verify sync; conflict resolution
- **Account deletion** — request deletion, verify data cleared, verify Cognito disabled
- **Subscription** — upgrade flow, RevenueCat sandbox, free tier limits (AI quota)
- **Accessibility** — VoiceOver on iOS, TalkBack on Android, minimum touch targets
- **Edge inputs** — emoji in food names, very long strings, special characters in email

---

## Filing a Good Bug Report

Testers should include:

1. Device + OS version
2. App version (build number)
3. Steps to reproduce (numbered list)
4. Expected vs. actual behavior
5. Screenshot or screen recording if visual

Sentry feedback widget auto-captures device/OS/version — encourage testers to use it.

---

## Post-Bug-Bash Checklist

- [ ] All P0/P1 issues assigned and in-progress within 24h
- [ ] Sentry alerts silenced for known issues (add fingerprint rules)
- [ ] Release notes updated with fixes
- [ ] Thank-you message sent to external testers (include next beta date)
