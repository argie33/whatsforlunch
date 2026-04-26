# 16 — MVP Pre-Flight Checklist

This is the gate. Every box must be checked before MVP is "shippable."

## Decisions before kickoff

- [ ] Brand name confirmed (e.g., "WhatsForLunch" or rename)
- [ ] Domain name acquired (`*.app`, `*.io`, etc.)
- [ ] Bundle ID / package name decided
- [ ] AWS account: single account vs Org structure
- [ ] Apple Developer Program enrolled ($99/year)
- [ ] Google Play Console enrolled ($25)
- [ ] Anthropic Bedrock model access requested + approved
- [ ] Google Cloud account for Places API (billing enabled)
- [ ] RevenueCat account (free tier OK at MVP)
- [ ] PostHog account (free tier OK)
- [ ] Sentry account (free tier OK)
- [ ] GitHub org / repo created
- [ ] Google Workspace for `support@` email ($7/user/mo)
- [ ] Notion workspace for FAQ + internal docs

## Workers staffed

- [ ] W1 — Infra/IaC owner identified
- [ ] W2 — Backend owner identified
- [ ] W3 — Auth/Security owner identified
- [ ] W4 — AI owner identified
- [ ] W5 — Mobile Foundation owner identified
- [ ] W6 — Mobile Core owner identified
- [ ] W7 — Mobile Settings owner identified
- [ ] W8 — Mobile Sync owner identified
- [ ] W9 — Ops/QA owner identified
- [ ] W10 — Design/Polish owner identified

## Repository setup

- [ ] GitHub repo initialized with all 16 docs in `docs/`
- [ ] Branch protection on `main`
- [ ] CODEOWNERS configured
- [ ] CI workflows committed
- [ ] OIDC role configured for GitHub Actions
- [ ] AWS CLI access for all developers

## Phase A complete (foundation)

- [ ] pnpm workspace builds successfully
- [ ] CDK synth succeeds for all stacks
- [ ] Mobile app builds locally on iOS + Android
- [ ] Mobile app development build installable on a device via EAS
- [ ] All shared types compile (`pnpm typecheck` green)
- [ ] All linters pass (`pnpm lint`)

## Phase B complete (features wired)

- [ ] All Wave 1 features (F-001 to F-032) acceptance criteria checked
- [ ] All E2E Maestro flows passing on Cloud
- [ ] All unit tests passing
- [ ] AI eval suite within thresholds
- [ ] Sync works end-to-end (offline → online → real-time household)
- [ ] All UI primitives in Storybook
- [ ] Dark mode verified on every screen
- [ ] Accessibility verified (VoiceOver + TalkBack on every screen)

## Cloud infra deployed

- [ ] dev environment fully functional
- [ ] staging environment fully functional
- [ ] prod environment provisioned (DNS, certs, all stacks deployed but no users)
- [ ] CloudWatch dashboards live
- [ ] CloudWatch alarms wired to PagerDuty / email
- [ ] AWS Budgets alerts configured ($50, $100, $500, $1000)
- [ ] GuardDuty + Security Hub enabled
- [ ] CloudTrail with object lock
- [ ] AWS Inspector scanning
- [ ] Bedrock model access enabled in prod region

## Security verified

- [ ] All Cognito pools configured with advanced security ENFORCED
- [ ] All Lambda IAM roles least-privilege
- [ ] All RLS-equivalent checks tested (cross-tenant isolation)
- [ ] All inputs validated with Zod schemas
- [ ] No secrets in code or git history (gitleaks check)
- [ ] All secrets in Secrets Manager / SSM
- [ ] Magic link single-use enforced
- [ ] Rate limits enforced
- [ ] WAF rules deployed
- [ ] Photo upload validation working (magic bytes, EXIF strip)
- [ ] OWASP MASVS L1 self-assessment complete
- [ ] MobSF scan on release build
- [ ] Semgrep + CodeQL pass
- [ ] Snyk no HIGH/CRITICAL vulnerabilities

## App stores ready

- [ ] App Store Connect record created with full metadata
- [ ] Play Console record created with full metadata
- [ ] Privacy nutrition labels declared (App Store)
- [ ] Data Safety form filled (Play Store)
- [ ] Age rating questionnaires complete
- [ ] Screenshots ready (all required sizes)
- [ ] App icon designed (1024px)
- [ ] App Preview videos (optional but recommended)
- [ ] Description copy reviewed
- [ ] Keywords (App Store) optimized
- [ ] Privacy policy + ToS hosted at `/privacy` and `/terms`
- [ ] Support URL active
- [ ] Permission strings reviewed (Info.plist + AndroidManifest)
- [ ] In-app account deletion verified
- [ ] In-app data export verified
- [ ] In-app restore purchases working (RevenueCat)
- [ ] Apple Sign-In working alongside Google Sign-In
- [ ] Universal Links + App Links verified

## Content ready

- [ ] Privacy policy reviewed by legal (or template customized via Termly)
- [ ] Terms of Service reviewed
- [ ] FAQ Notion page written (top 20 questions)
- [ ] Onboarding copy finalized
- [ ] Empty state copy
- [ ] Error message copy (every error code → user-friendly message)
- [ ] Push notification copy
- [ ] Email templates (magic link, account deletion confirmation, data export)

## Testing

- [ ] All unit tests passing
- [ ] All component tests passing
- [ ] All E2E Maestro flows passing
- [ ] AI eval suite within thresholds
- [ ] Performance budget met (cold start < 2s, scan < 500ms, AI < 3s)
- [ ] Crash-free sessions > 99.5% in beta
- [ ] Sentry no CRITICAL issues open
- [ ] Pre-launch report green (Play Console)
- [ ] TestFlight build approved
- [ ] 100+ beta testers signed up
- [ ] At least 50 beta testers actively using app for 7+ days
- [ ] Bug bash session held with no P0 bugs found

## Observability working

- [ ] Sentry capturing crashes from prod build
- [ ] PostHog tracking key events
- [ ] CloudWatch logs aggregating from all Lambdas
- [ ] X-Ray traces visible end-to-end
- [ ] Synthetic canaries running every 5 min
- [ ] Dashboards reviewed by team
- [ ] Alerts route to right channels

## Customer support ready

- [ ] `support@` email functional + monitored
- [ ] Bug report flow tested end-to-end
- [ ] Sentry events linked to user IDs (hashed)
- [ ] FAQ accessible in-app
- [ ] Reply templates drafted for top 10 questions
- [ ] Refund policy documented
- [ ] Twitter handle claimed
- [ ] Reddit/Instagram handles claimed (just for squat protection)

## Compliance

- [ ] GDPR Article 17 (deletion) flow tested with real account
- [ ] GDPR Article 15 (export) flow tested with real account
- [ ] CCPA disclosures in privacy policy
- [ ] COPPA gating (DOB on signup, 13+ minimum)
- [ ] App Store + Play Store privacy declarations match reality
- [ ] DPA with AWS signed
- [ ] DPA with Anthropic (via AWS Bedrock) confirmed
- [ ] DPA with RevenueCat signed
- [ ] DPA with Sentry signed
- [ ] DPA with PostHog signed

## Cost monitoring

- [ ] AWS Cost Explorer reviewed
- [ ] Resource tagging audited
- [ ] Bedrock cost dashboard live
- [ ] Per-user AI cost tracking working
- [ ] Free tier ceilings calculated

## Production readiness review (final)

- [ ] Architecture review with team
- [ ] Security review with W3
- [ ] Performance review with W9
- [ ] UX review with W10
- [ ] All docs in `docs/` updated and reviewed
- [ ] Runbooks in `docs/runbooks/` for top 10 incident scenarios

## Launch sequence

- [ ] T-21 days: First TestFlight + Play Internal submission
- [ ] T-14: Closed testing (Play) starts; 20+ testers recruited (mandatory for new accounts)
- [ ] T-10: App Store production submission
- [ ] T-7: App Store approval received
- [ ] T-5: Play production submission
- [ ] T-3: Both stores approved
- [ ] T-1: Phased rollout begins (1%)
- [ ] T-0: Public launch (post-100% rollout)
- [ ] T+7: First post-launch review

## Day-1 launch checks (after going public)

- [ ] Onboarding works for first 10 real users (review their funnels)
- [ ] No spike in Sentry errors
- [ ] No App Store / Play Store rejection cascade
- [ ] Customer support inbox monitored
- [ ] Social channels active

## Definition of "MVP shipped"

The MVP is officially shipped when:
1. App live on both App Store and Play Store at 100% rollout
2. 24 hours of stable production metrics (no rollback)
3. At least 100 real users (not just beta testers)
4. Customer support handling tickets

After this, Wave 2 begins (households + recipes + cloud sync activation).

## Cross-references

- All worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- All features required → [07_FEATURES.md](07_FEATURES.md)
- App store specifics → [10_APP_STORES.md](10_APP_STORES.md)
