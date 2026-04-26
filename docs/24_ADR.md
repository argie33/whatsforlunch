# 24 — Architecture Decision Records (ADRs)

This is the index for our ADRs and the template for writing new ones.

## What is an ADR

An Architecture Decision Record captures one architecturally-significant decision: the context, the options considered, the choice, and the consequences.

We write ADRs when:
- Choosing between meaningfully different approaches with long-term impact
- Deciding to deviate from a stated standard
- A non-obvious decision that future agents will question
- Anything where "future you" would benefit from knowing the why

We DON'T write ADRs for:
- Day-to-day implementation choices
- Library version bumps
- Stylistic preferences

## ADR location

`docs/adr/NNNN-kebab-case-title.md`

Numbered sequentially. Once committed, never deleted (only superseded).

## Status lifecycle

- `proposed` — under discussion in PR
- `accepted` — merged, in effect
- `superseded by ADR-NNNN` — replaced by a later decision
- `deprecated` — no longer in effect but kept for history

## Template

Copy this for new ADRs:

```markdown
# ADR-NNNN: <decision title>

**Status**: proposed
**Date**: 2026-04-26
**Decision makers**: @user, @W1-infra
**Tags**: aws, infra

## Context

What is the issue we're trying to address? What forces are at play?
(Forces = constraints, requirements, prior decisions, principles.)

## Options considered

### Option A: <name>
- Pros
- Cons

### Option B: <name>
- Pros
- Cons

### Option C: <name>
- Pros
- Cons

## Decision

We chose Option X because:
- Reason 1
- Reason 2
- Reason 3

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Tradeoff 2

### Neutral
- Implication 1

## Implementation

What concretely needs to be built / changed?
- File paths
- Migration plan if any
- Rollout strategy

## References

- Link to relevant docs
- Link to PR
- Link to research / discussion
```

## ADRs that already exist (initial set, captured in main docs)

These decisions were made during the planning phase. Each will eventually have its own ADR file when an agent revisits or needs to question.

| # | Title | Where decided | Status |
|---|---|---|---|
| ADR-0001 | Use AWS over Supabase | Vision + Architecture | accepted |
| ADR-0002 | DynamoDB single-table over Aurora | Architecture + Data Model | accepted |
| ADR-0003 | AppSync GraphQL over REST API Gateway primary | Architecture | accepted |
| ADR-0004 | Bedrock for Claude over direct Anthropic API | AI Integration | accepted |
| ADR-0005 | Cognito User Pools over Auth0 / Clerk | Security | accepted |
| ADR-0006 | RevenueCat over raw StoreKit | Monetization | accepted |
| ADR-0007 | React Native + Expo over native | Vision | accepted |
| ADR-0008 | Tamagui over NativeBase / gluestack | UI/UX | accepted |
| ADR-0009 | Maestro over Detox / Appium for E2E | Testing | accepted |
| ADR-0010 | TypeScript strict from commit 1 | Vision | accepted |
| ADR-0011 | Paper QR for MVP, no electronics | Vision + Hardware | accepted |
| ADR-0012 | Free tier first, monetize at 5K MAU | Monetization | accepted |
| ADR-0013 | WatermelonDB over expo-sqlite | Architecture | accepted |
| ADR-0014 | Astro for marketing site | Landing Page | accepted |
| ADR-0015 | OIDC for GitHub Actions auth (no AWS keys) | RBAC + Secrets | accepted |
| ADR-0016 | Per-developer AWS sandbox over LocalStack | Local Dev | accepted |
| ADR-0017 | AWS CDK (TS) over Terraform / SAM | Deployment | accepted |
| ADR-0018 | Maestro Cloud over self-hosted device farm | CI/CD | accepted |
| ADR-0019 | Single AWS account at MVP, AWS Org post-launch | Architecture | accepted |
| ADR-0020 | No tracking SDKs at MVP (avoid ATT prompt) | Security + App Stores | accepted |
| ADR-0021 | Sage primary brand color | UI/UX | accepted |
| ADR-0022 | Lambda ARM64 (Graviton) | Architecture | accepted |
| ADR-0023 | Email magic link as primary auth | Security | accepted |
| ADR-0024 | DynamoDB sparse GSI for "expiring soon" | Data Model | accepted |

These are documented in their respective doc files; we'll create explicit ADR-XXXX.md files as they're revisited.

## When to create a new ADR

Each agent, when their work touches an architecturally-significant area, should:

1. Search existing ADRs for the topic (`grep -i 'topic' docs/adr/`)
2. If covered, follow the ADR
3. If covered but you think it's wrong, write a new ADR proposing a change
4. If not covered, write a new ADR

## ADR review process

1. Worker drafts ADR file in their PR
2. Adds `proposed` status
3. PR review includes ADR review (CODEOWNERS for `docs/adr/` is the user)
4. On merge: status flips to `accepted`
5. Future supersession: new ADR added; old one's status → `superseded by ADR-NNNN`

## Sample first ADR (illustrative)

```markdown
# ADR-0001: Use AWS over Supabase as the cloud platform

**Status**: accepted
**Date**: 2026-04-26
**Decision makers**: @user
**Tags**: cloud, infrastructure, scaling

## Context

We need a cloud backend for: auth, GraphQL API, database, file storage, AI integrations, push notifications. The product targets thousands of free users initially, scaling to 100K+ MAU. We need enterprise-grade security and a path to Series A growth.

Initial design used Supabase (faster MVP). User explicitly requested AWS for:
- Enterprise-grade scaling
- Single cloud platform consistency with prior projects
- Broader service ecosystem (Bedrock, SNS, SES, Textract, Step Functions)
- Better support for IAM-scoped access patterns

## Options considered

### Option A: Supabase
- Pros: faster to ship, all-in-one, great DX
- Cons: vendor lock-in, less granular IAM, Edge Functions only support Deno

### Option B: AWS (Cognito + AppSync + DynamoDB + Lambda + Bedrock + S3)
- Pros: enterprise scaling, mature service ecosystem, granular IAM, GovCloud / EU regions, native Bedrock integration
- Cons: more complex to set up, more to learn, higher upfront infra time

### Option C: Firebase
- Pros: fast iteration, popular for mobile
- Cons: Firestore is poor fit for relational data, vendor lock-in to Google, harder migrations

## Decision

AWS. The user requested it for enterprise scale and consistency with their prior projects, and the architecture's needs (granular IAM, single-table Dynamo, Bedrock, real-time AppSync subscriptions) are all well-served.

## Consequences

### Positive
- Enterprise scale + security
- Bedrock = data stays in AWS, IAM-scoped
- AppSync GraphQL with subscriptions
- Single AWS bill

### Negative
- More setup time vs. Supabase
- Steeper learning curve
- Higher base cost (Cognito free up to 50K MAU helps)

## Implementation

- IaC via AWS CDK (TypeScript)
- All stacks under `infra/cdk/`
- Per-env config: dev, staging, prod
- See [01_ARCHITECTURE.md](../01_ARCHITECTURE.md) for full design

## References

- 01_ARCHITECTURE.md
- 02_DATA_MODEL.md
- AWS Well-Architected Framework
```

## ADR best practices

- **Keep it short**: 1-2 pages max
- **Be honest about cons**: future-you needs to know the tradeoffs
- **Link to evidence**: research, benchmarks, prior incidents
- **Make decisions, don't waffle**: pick one and own it
- **Date it**: context changes; old decisions are reconsiderable
- **Don't delete**: superseded ADRs are still useful history

## ADRs we expect to write soon

Things that will warrant ADRs as the build progresses:
- Choice of state management library (Zustand vs Jotai vs Redux Toolkit)
- Choice of forms library (react-hook-form vs Formik)
- Push notification provider (SNS direct vs Pinpoint vs Firebase)
- Recipe data source (AI-only vs licensed database)
- Image CDN strategy (CloudFront only vs Imgix-style service)
- Mobile build profiles (any deviation from defaults)
- Caching strategy (when to add Redis / DAX / OpenSearch)

## Cross-references

- Master doc index → [README.md](README.md)
- Worker coordination → [20_AGENT_COORDINATION.md](20_AGENT_COORDINATION.md)
