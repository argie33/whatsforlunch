# Runbook: Beta Launch (TestFlight + Play Internal Testing)

**Phase**: C  
**Goal**: Get the app in front of 100+ external testers before public launch.

---

## Prerequisites

- EAS production build green (`pnpm run mobile:build --platform all --profile production`)
- App Store Connect record created (bundle ID: `app.whatsforlunch`)
- Play Console record created (package: `app.whatsforlunch`)
- Apple API key, Google service account JSON in GitHub secrets

---

## Step 1 — iOS: Submit to TestFlight

```bash
# Trigger the submit workflow from GitHub Actions
gh workflow run mobile-submit.yml -f platform=ios
```

In App Store Connect:
1. Go to **TestFlight → Builds**
2. Wait for processing (~15 min)
3. Add build to **External Testing** group "Beta Testers"
4. Fill out "What to Test" notes
5. Submit for Beta App Review (usually < 1 hour)

---

## Step 2 — Android: Submit to Play Internal Testing

```bash
gh workflow run mobile-submit.yml -f platform=android
```

In Google Play Console:
1. Go to **Testing → Internal testing**
2. Add the new release
3. Add tester email list (CSV upload)
4. Roll out to 100%

---

## Step 3 — Recruit testers

Target: 100+ testers across:
- Power users (food bloggers, meal-preppers)
- Target demographic (busy parents, couples)
- iOS + Android split (~60/40)

Channels:
- Reddit: r/MealPrepSunday, r/ZeroWaste, r/Frugal
- Twitter/X: "testing a new app to track fridge leftovers — join the beta!"
- Personal network
- Discord food communities

TestFlight link: share from App Store Connect **External Testing → Public Link**  
Android link: share from Play Console **Internal Testing → How to become a tester**

---

## Step 4 — Monitor during beta

Watch these signals daily:
- Sentry: new crash reports → `https://sentry.io/organizations/<org>/projects/`
- PostHog: funnel completion rate (sign-up → add first item)
- App Store Connect: crash rate, ratings
- TestFlight feedback submissions

Severity triage:
- **P0** (crash on launch) → hotfix OTA via `eas update --channel production` immediately
- **P1** (data loss, auth failure) → hotfix within 24h
- **P2** (UI bug) → next beta build within 1 week
- **P3** (cosmetic) → backlog

---

## Step 5 — Promote to public

Once < 1% crash rate + P0/P1 queue clear:

1. In App Store Connect: **Submit for Review** (allow 1–2 days)
2. In Play Console: **Promote internal → Production** (set 20% rollout, watch for 48h, then 100%)
3. Announce launch:
   - App Store review link
   - Play Store link
   - Press kit: `docs/press-kit/`

---

## Rollback

If a critical bug escapes to production:

**iOS (OTA — JS-only fix)**:
```bash
gh workflow run eas-update-production.yml -f message="hotfix: <description>"
```

**iOS (requires new binary)**:
1. Fix + rebuild: `gh workflow run mobile-build.yml -f platform=ios -f profile=production`
2. Submit: `gh workflow run mobile-submit.yml -f platform=ios`
3. Request expedited review in App Store Connect

**Android (OTA)**:
```bash
gh workflow run eas-update-production.yml -f message="hotfix: <description>"
```

**Android (requires new APK)**:
1. Rebuild + submit: `gh workflow run mobile-submit.yml -f platform=android`
2. In Play Console: halt rollout of bad version → promote new version
