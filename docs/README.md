# WhatsFresh — Design Documentation

This folder is the master design specification. Everything that gets built must trace back to a doc here. If a builder finds something missing, it must be added here first.

## Project codename
**WhatsFresh** (working name; brand name TBD before App Store submission).

## Status
**Design complete. Code not yet written.** We are at the start of building, not in production. See [25_ENVIRONMENTS.md](25_ENVIRONMENTS.md) for our build lifecycle.

## Reading order

For new contributors / workers, read in this order:

### Strategy
1. **[00_VISION.md](00_VISION.md)** — what we're building, why, MVP scope, wave rollout
2. **[07_FEATURES.md](07_FEATURES.md)** — full feature catalog with acceptance criteria
3. **[11_MONETIZATION.md](11_MONETIZATION.md)** — free tier, pricing, future revenue
4. **[22_MARKETING_SEO.md](22_MARKETING_SEO.md)** — SEO, marketing, launch strategy
5. **[23_HARDWARE_ROADMAP.md](23_HARDWARE_ROADMAP.md)** — paper QR → branded stickers → branded containers (phased)

### Technical foundation
6. **[01_ARCHITECTURE.md](01_ARCHITECTURE.md)** — full AWS architecture, system design
7. **[02_DATA_MODEL.md](02_DATA_MODEL.md)** — DynamoDB single-table model, indexes, access patterns
8. **[03_API_SPEC.md](03_API_SPEC.md)** — GraphQL schema, REST endpoints, real-time subscriptions
9. **[04_SECURITY.md](04_SECURITY.md)** — encryption, OWASP, compliance, threat model
10. **[21_RBAC_AND_SECRETS.md](21_RBAC_AND_SECRETS.md)** — IAM, roles, permissions, secrets management, OIDC

### Product surface
11. **[05_UI_UX.md](05_UI_UX.md)** — design system, screens, components, animations, accessibility
12. **[06_AI_INTEGRATION.md](06_AI_INTEGRATION.md)** — Claude prompts, photo classification, OCR, recipes, restaurants
13. **[17_LANDING_PAGE.md](17_LANDING_PAGE.md)** — marketing site, privacy/terms hosting, Universal Links

### Build & operate
14. **[08_DEPLOYMENT.md](08_DEPLOYMENT.md)** — CDK, environments, rollout strategy
15. **[19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)** — full CI/CD with all gates and security scans
16. **[18_DNS_DOMAINS.md](18_DNS_DOMAINS.md)** — every URL, every DNS record, every certificate
17. **[25_ENVIRONMENTS.md](25_ENVIRONMENTS.md)** — local → dev → staging → prod lifecycle
18. **[14_LOCAL_DEV.md](14_LOCAL_DEV.md)** — running everything locally
19. **[09_TESTING.md](09_TESTING.md)** — validation strategy, unit/integration/E2E, AI evals
20. **[13_OBSERVABILITY.md](13_OBSERVABILITY.md)** — logging, metrics, alerting, tracing

### Compliance, support, ops
21. **[10_APP_STORES.md](10_APP_STORES.md)** — iOS + Android submission requirements
22. **[12_SUPPORT.md](12_SUPPORT.md)** — customer support, feedback, bug reporting

### Coordination & decisions
23. **[15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)** — 10 parallel worker assignments
24. **[20_AGENT_COORDINATION.md](20_AGENT_COORDINATION.md)** — how parallel agents coordinate
25. **[24_ADR.md](24_ADR.md)** — architecture decision records (template + index)
26. **[16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md)** — what makes the MVP "shippable"

## Operating principles

These are non-negotiable. Every doc and every line of code must respect them.

1. **Build for today, design for tomorrow.** The MVP must work end-to-end with real data, but the architecture must extend cleanly to public APIs, MCP server, and durable hardware (Phase 9+) without rewrites.
2. **Local-first.** The app works fully offline. Cloud sync is a layer on top, not a requirement.
3. **No mocks in production.** Everything is wired to real AWS services. Mocks are only for unit tests.
4. **Enterprise-grade security from day one.** RLS-equivalent (IAM + Cognito + AppSync auth) on every operation. No API keys on device.
5. **Premium UX.** Every interaction has haptics, animations, accessibility. We compete with Apple Design Award winners.
6. **Free tier first.** Get thousands of users. Monetize later with patterns that don't kill virality.
7. **Validated.** Every feature has automated tests. Every release is verified before rollout.
8. **Documented.** No tribal knowledge. New workers can pick up any track from these docs.
9. **OIDC, no AWS keys.** GitHub Actions deploy via short-lived OIDC tokens.
10. **Production is sacred.** We don't ship to prod until staged and validated.

## Tech summary

- **Mobile**: React Native + Expo (managed, EAS Build) + Tamagui
- **Web (marketing)**: Astro static site → S3 + CloudFront
- **Cloud**: AWS (Cognito, AppSync GraphQL, DynamoDB single-table, Lambda ARM64, Bedrock for Claude, Textract, S3, CloudFront, WAF)
- **IaC**: AWS CDK (TypeScript) deployed via GitHub Actions with OIDC
- **Local DB**: WatermelonDB (SQLite + SQLCipher) with Amplify DataStore-style sync
- **AI**: Claude Haiku 4.5 (fast tasks) + Claude Sonnet 4.6 (complex reasoning) via Bedrock
- **OCR**: Amazon Textract for printed expiry dates + receipts
- **Auth**: Cognito User Pools (email magic link, Apple Sign-In, Google Sign-In)
- **Notifications**: Expo Notifications (local) + AWS SNS Mobile Push (server-driven)
- **Payments**: RevenueCat (cross-platform IAP)
- **Analytics**: PostHog
- **Errors**: Sentry
- **Support**: Mailto + Notion FAQ (MVP) → Crisp chat (post-1k MAU)

## Feature waves

| Wave | Timing | Scope |
|---|---|---|
| **1 — MVP** | Weeks 0-10 | Core tracking, AI photo, OCR dates, barcode, paper QR, free tier |
| **2 — Sharing + Cooking** | Weeks 11-14 | Households, recipes, daily digest, AI preference learning |
| **3 — Outside the kitchen** | Weeks 15-18 | Nearby restaurants, receipt OCR, shopping list, stats |
| **4 — Health & nutrition** | Weeks 19-22 | Calorie counting, intake tracking, diet plans (opt-in) |
| **5 — Social** | Weeks 23+ | Recipe sharing, public gallery, friend feed |
| **6 — Platform** | Months 6+ | Public API, MCP server, smart home integrations |

Hardware roadmap (separate track, [23_HARDWARE_ROADMAP.md](23_HARDWARE_ROADMAP.md)):
- **Phase 1** (MVP): paper QR stickers, user-printed
- **Phase 2** (1-3 mo post-MVP): branded waterproof sticker kits we sell
- **Phase 3** (6-9 mo): branded containers with permanent laser-etched QR codes
- **Phase 4+** (validated): possibly Bluetooth temp cartridges; smart fridge integrations

## Repository layout

```
whatsfresh/
├── apps/
│   ├── mobile/                  React Native + Expo app
│   └── web/                     Astro marketing site
├── packages/
│   └── shared/                  Zod schemas, pure expiry logic, types
├── infra/
│   └── cdk/                     AWS CDK stacks
├── services/                    Lambda functions
├── docs/                        This folder (you are here)
├── .github/workflows/           CI/CD pipelines
└── scripts/                     Local dev scripts
```

## Doc index (alphabetical)

| Doc | Topic |
|---|---|
| 00_VISION.md | Product vision, MVP scope, wave rollout |
| 01_ARCHITECTURE.md | AWS architecture, services, data flow |
| 02_DATA_MODEL.md | DynamoDB single-table, GSIs, access patterns |
| 03_API_SPEC.md | GraphQL schema, REST endpoints, subscriptions |
| 04_SECURITY.md | OWASP, encryption, compliance, threat model |
| 05_UI_UX.md | Design system, screens, components, accessibility |
| 06_AI_INTEGRATION.md | Claude prompts, photo classification, OCR, recipes |
| 07_FEATURES.md | Full feature catalog with acceptance criteria |
| 08_DEPLOYMENT.md | CDK, environments, GitHub Actions overview |
| 09_TESTING.md | Validation strategy, unit/E2E/AI evals |
| 10_APP_STORES.md | iOS + Android submission requirements |
| 11_MONETIZATION.md | Pricing, RevenueCat, future revenue |
| 12_SUPPORT.md | Customer support, feedback, bug reporting |
| 13_OBSERVABILITY.md | Logging, metrics, alerting, tracing |
| 14_LOCAL_DEV.md | Local development setup |
| 15_WORKER_TRACKS.md | 10 parallel worker assignments |
| 16_MVP_CHECKLIST.md | Pre-flight checklist for MVP launch |
| 17_LANDING_PAGE.md | Marketing site (Astro) on S3+CloudFront |
| 18_DNS_DOMAINS.md | All URLs, DNS records, certificates |
| 19_CICD_PIPELINE.md | Full CI/CD: 15 pipelines, all security scans |
| 20_AGENT_COORDINATION.md | How 10 parallel agents coordinate |
| 21_RBAC_AND_SECRETS.md | IAM, roles, permissions, secrets, OIDC |
| 22_MARKETING_SEO.md | SEO, ASO, launch strategy, channels |
| 23_HARDWARE_ROADMAP.md | Paper → stickers → containers (phased) |
| 24_ADR.md | Architecture decision records |
| 25_ENVIRONMENTS.md | Local → dev → staging → prod lifecycle |
| README.md | This index |

## Status: ready for build

When all decisions in [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md) "Decisions before kickoff" are made and accounts/repo are set up, the 10 workers can pick up [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md) and start Phase A.
