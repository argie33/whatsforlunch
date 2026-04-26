# WhatsForLunch

> Stop wasting food. Track everything in your kitchen. Get reminded just in time.

A leftover-and-pantry tracker for iOS + Android with AI photo classification, OCR scanning of expiration dates, household sharing, and more.

**Status**: design phase complete; build phase starting.

---

## I'm a worker — where do I start?

1. Read [`docs/README.md`](docs/README.md) — master index of all design docs.
2. Find your track in [`docs/15_WORKER_TRACKS.md`](docs/15_WORKER_TRACKS.md) (W1–W10).
3. Read your track's "Reads first" docs.
4. Read [`docs/20_AGENT_COORDINATION.md`](docs/20_AGENT_COORDINATION.md) for how parallel agents coordinate.
5. Read [`docs/14_LOCAL_DEV.md`](docs/14_LOCAL_DEV.md) for setup.
6. Pick the lowest-numbered unblocked GitHub Issue for your track.
7. Branch: `feat/W<n>-F-XXX-short-name`.
8. Open a draft PR within 4 hours of starting.

**Do not modify files outside your track** without coordinating per [`docs/20_AGENT_COORDINATION.md`](docs/20_AGENT_COORDINATION.md). CODEOWNERS enforces this.

## Worker tracks at a glance

| # | Track | Owns |
|---|---|---|
| W1 | Infrastructure / IaC | AWS CDK, GitHub Actions, environments |
| W2 | Backend / Data | Lambdas, AppSync resolvers, DynamoDB |
| W3 | Auth & Security | Cognito, IAM, security controls |
| W4 | AI | Bedrock, Textract, prompts, evals |
| W5 | Mobile Foundation | Expo, Tamagui, design system, primitives |
| W6 | Mobile Core | Scan flows, items, dashboard, notifications |
| W7 | Mobile Settings | Settings, profile, account, subscription UI |
| W8 | Mobile Sync | WatermelonDB sync, offline queue |
| W9 | Ops / QA | CI reliability, app stores, beta program |
| W10 | Design / Polish | Illustrations, copy, web/marketing site |

Full deliverables per track: [`docs/15_WORKER_TRACKS.md`](docs/15_WORKER_TRACKS.md).

## Repository layout

```
whatsforlunch/
├── apps/
│   ├── mobile/                  React Native + Expo app          (W5, W6, W7, W8)
│   └── web/                     Astro marketing site             (W10)
├── packages/
│   └── shared/                  Zod schemas, expiry logic, types (W2, W4, W5)
├── infra/
│   └── cdk/                     AWS CDK stacks                   (W1)
├── services/                    Lambda functions                 (W2, W3, W4)
│   ├── ai/                      Bedrock + Textract Lambdas       (W4)
│   ├── auth/                    Cognito triggers                 (W3)
│   ├── notifications/           Push notification Lambdas        (W2)
│   ├── account/                 Delete + export                  (W2)
│   ├── billing/                 RevenueCat webhook               (W2)
│   └── images/                  Image resize                     (W4)
├── docs/                        Design specification             (read-only for workers)
├── .github/
│   └── workflows/               CI/CD pipelines                  (W1, W9)
└── scripts/                     Local dev scripts                (W1)
```

## Tech stack

- **Mobile**: React Native + Expo + Tamagui
- **Web**: Astro static site
- **Cloud**: AWS (Cognito, AppSync, DynamoDB, Lambda ARM64, Bedrock, Textract, S3, CloudFront, WAF)
- **IaC**: AWS CDK (TypeScript) deployed via GitHub Actions with OIDC
- **Local DB**: WatermelonDB (SQLite + SQLCipher)
- **AI**: Claude Haiku 4.5 + Sonnet 4.6 via Bedrock
- **Auth**: Cognito User Pools (email magic link, Apple, Google)
- **Payments**: RevenueCat
- **Analytics**: PostHog
- **Errors**: Sentry

## Build phases

We build in waves. MVP first, then layer in features:

| Wave | Scope |
|---|---|
| 1 (MVP) | Core tracking, AI photo, OCR dates, barcode, paper QR stickers, free tier |
| 2 | Households, real-time sync, recipe suggestions, AI preference learning |
| 3 | Nearby restaurants, receipt OCR, shopping list, stats |
| 4 | Calorie/nutrition tracking (opt-in) |
| 5 | Social: recipe sharing, public gallery |
| 6 | Public REST API, MCP server, smart home integrations |

Hardware (separate track): paper QR → branded sticker kits → branded containers (post-launch, validated).

## Development

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

Per-package commands documented in each workspace's `package.json` and [`docs/14_LOCAL_DEV.md`](docs/14_LOCAL_DEV.md).

## Operating principles

1. Build for today, design for tomorrow
2. Local-first (works offline)
3. No mocks in production — real AWS services everywhere
4. Enterprise-grade security from day one
5. Premium UX
6. Free tier first; monetize at 5K MAU
7. Every feature has automated tests
8. OIDC for AWS auth — no long-lived keys
9. Production is sacred — protected by gates and approvals
10. Documented — no tribal knowledge

## License

Proprietary — see [LICENSE](LICENSE).

## Links

- [Master design index](docs/README.md)
- [Vision](docs/00_VISION.md)
- [Architecture](docs/01_ARCHITECTURE.md)
- [Worker tracks](docs/15_WORKER_TRACKS.md)
- [MVP checklist](docs/16_MVP_CHECKLIST.md)
