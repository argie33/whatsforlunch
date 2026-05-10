# 20 — Multi-Agent Coordination

10 parallel agents are building this product. Without coordination, they'll stomp on each other's work, produce inconsistent code, or miss dependencies. This doc is how we prevent that.

## Coordination model

```
┌────────────────────────────────────────────────────────┐
│  Coordinator (you, the user)                           │
│  - Approves docs, decides scope, breaks ties           │
│  - Reviews PRs at strategic moments                    │
└─────────────┬──────────────────────────────────────────┘
              │
              ▼
┌────────────────────────────────────────────────────────┐
│  Source of Truth: docs/ folder + GitHub Issues         │
│  - All decisions land here                             │
│  - All work tracked here                               │
└─────────────┬──────────────────────────────────────────┘
              │
              ▼
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ W1   │ W2   │ W3   │ W4   │ W5   │ W6   │ W7   │ ...  │
│Infra │ BE   │ Auth │ AI   │Mob-F │Mob-C │Mob-S │      │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

## How agents pick work

### GitHub Issues as the work queue

Every feature in [07_FEATURES.md](07_FEATURES.md) becomes a GitHub Issue with:
- **Title**: `F-XXX: <feature name>`
- **Labels**: track (W1-W10), wave (1-6), priority (P0/P1/P2), status
- **Description**: copy of the feature spec from 07_FEATURES.md
- **Assignee**: which agent owns it
- **Milestone**: wave number (Wave 1, Wave 2, ...)
- **Depends on**: linked issues (blocking dependencies)

### Issue lifecycle

```
todo → in-progress → in-review → done
              ↓
          blocked (with reason + blocker issue link)
```

Status changes via GitHub Project board automation.

### Agent self-assignment rules

Each agent (W1–W10) has a track in [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md). They:

1. Look at their track's open issues
2. Filter by:
   - **Status**: `todo`
   - **Not blocked**: no open `Depends on` issues
   - **Lowest issue number** (proxy for priority)
3. Self-assign by:
   - Add label `in-progress`
   - Add their agent ID as assignee
   - Move card on project board to "In Progress"
4. Open a draft PR within 4 hours of assignment (proves they started)
5. Mark PR ready for review when done; status moves to `in-review`

### What if two agents start the same issue?

The first to push a draft PR with a referenced commit wins. The second backs out and picks a different issue. This is rare because of issue assignment.

## Repository conventions for parallel work

### Branching

- Feature branches: `feat/W<n>-F-XXX-short-name`
  - `W1` = worker number, `F-001` = feature number
  - Example: `feat/W6-F-014-dashboard`
- Bug fix: `fix/W<n>-bug-short-name`
- Refactor: `chore/W<n>-refactor-name`

### Commits

- Conventional commits enforced via commit-lint
- Format: `type(scope): subject`
- Example: `feat(mobile): F-014 dashboard with status colors`
- Reference issue number in commit body

### PRs

- One feature per PR (small, reviewable)
- PR title = first commit subject
- PR description includes:
  - Closes #issue
  - Acceptance criteria checklist (copy from feature)
  - Screenshots / Storybook links if UI
  - Risks / known follow-ups

### Code ownership (CODEOWNERS)

```
# .github/CODEOWNERS
/infra/cdk/                  @W1-infra
/services/auth/              @W3-auth
/services/account/           @W2-backend
/services/notifications/     @W2-backend
/services/billing/           @W2-backend
/services/ai/                @W4-ai
/services/images/            @W4-ai
/apps/mobile/src/components/ @W5-mobile-foundation
/apps/mobile/src/db/         @W5-mobile-foundation @W8-mobile-sync
/apps/mobile/src/theme/      @W5-mobile-foundation @W10-design
/apps/mobile/app/(auth)/     @W7-mobile-settings
/apps/mobile/app/(main)/scan.tsx          @W6-mobile-core
/apps/mobile/app/(main)/items/            @W6-mobile-core
/apps/mobile/app/(main)/containers/       @W6-mobile-core
/apps/mobile/app/(main)/settings/         @W7-mobile-settings
/apps/web/                   @W10-design
/.github/workflows/          @W1-infra @W9-ops
/docs/                       @user (you)
/packages/shared/            @W2-backend @W4-ai @W5-mobile-foundation
```

Required approvals from code owners before merge.

## Shared resources (the contract)

Some files are shared across many tracks. Changes need careful coordination:

### `packages/shared/`
- Zod schemas for every data type
- Pure expiry calculation
- Shared TypeScript types
- **Owners**: backend team review required for any change

### `infra/cdk/lib/appsync/schema.graphql`
- GraphQL schema is the contract between mobile and backend
- Changes go through a documented flow:
  1. Open issue: "Schema change: <description>"
  2. Discuss in issue (mobile team + backend team)
  3. Update schema in PR
  4. Codegen runs in CI; commit generated types
  5. Merge once both teams approve

### `apps/mobile/src/theme/tokens.ts`
- Design tokens — Tamagui consumes these
- Changes go through W10 (design)

### `infra/cdk/lib/stacks/data-stack.ts`
- DynamoDB schema, GSIs
- Changes need W2 review and a migration plan if existing data

## Daily sync mechanism

### Async standup format

Each agent posts to GitHub Discussions (`#daily-standup`) once per day:

```markdown
## W6 — Mobile Core | 2026-04-27

**Yesterday**:
- Merged F-014 (dashboard with status colors)
- Started F-015 (search & filter)

**Today**:
- Finish F-015 search/filter
- Start F-016 bulk actions

**Blocked**:
- F-018 needs schema change (waiting on W2 for `markItemPartial` mutation)

**Open PRs**:
- #142 F-015 (in review)
```

### Blocker resolution

If an agent is blocked > 4 hours:
1. Tag the unblocking agent in the issue
2. If unresponsive in 4 hours, tag user (coordinator)
3. Coordinator decides: wait, swap priorities, or unblock manually

## Conflict resolution

### Schema conflicts (GraphQL)

Two agents both want to modify the schema simultaneously:
- First-merger wins
- Second rebases, regenerates codegen, resolves
- If logical conflict (both adding same field with different types): pause, coordinate via issue

### Design token conflicts

Only W10 changes tokens. Other agents propose via issue → W10 implements.

### Code conflicts

Standard Git resolution. Squash-merge keeps history clean.

### Architectural disagreements

Open an ADR (`docs/adr/000X-<topic>.md`) following the format in [21_ADR.md](21_ADR.md). Decided in PR review. Coordinator breaks ties.

## Parallel work scheduling

### Phase A (foundation, days 1-3)

All workers run in parallel, no dependencies between them yet:

- W1: CDK skeleton, GitHub Actions
- W2: AppSync resolver scaffolding (against mocked Dynamo)
- W3: Cognito triggers (with stub deploys)
- W4: AI Lambda scaffolding (with mocked Bedrock)
- W5: Expo project, Tamagui setup
- W6, W7, W8: blocked on W5 — wait
- W9: app store accounts, Sentry/PostHog setup
- W10: Figma, design tokens

After 3 days: W5 done with primitives → unblocks W6, W7, W8.

### Phase B (features, days 4-15)

Workers proceed in parallel using the artifacts from Phase A. Each owns their feature list. Shared dependencies:

```
W1 (CDK)  ──┬──→ W2 (resolvers deployed)
            ├──→ W3 (auth Lambdas deployed)
            └──→ W4 (AI Lambdas deployed)

W2 (mutations exist) ──→ W6, W7
W3 (auth works)      ──→ W6, W7
W4 (AI mutations)    ──→ W6
W5 (primitives)      ──→ W6, W7
W8 (sync)            ──→ W6, W7 (data flows)
W10 (assets)         ──→ all UI
```

### Phase C (integration, days 16-21)

All workers integration-test together. Bug-bash sessions. Polish.

## Build state visibility

### GitHub Project board

Single project: "WhatsFresh MVP". Columns:
- Backlog (todo issues, ranked)
- This Wave (current wave issues)
- In Progress (someone working)
- In Review (PR open)
- Done

Auto-updated by GitHub Actions on PR events.

### CI status dashboard

GitHub provides this natively. Each PR has all checks visible. Failed checks block merge.

### Daily progress report (auto-generated)

GitHub Action (`.github/workflows/progress-report.yml`) runs nightly:
- Counts: issues done, in-progress, blocked, todo per worker
- Posts to `#progress` discussion
- Identifies blockers > 24 hours

## When agents need user (you) input

Use GitHub Discussions with label `needs-user-input`:

- Architectural decisions outside docs
- Brand / naming choices
- AWS account access needs
- Any decision that affects multiple workers

User reviews 1-2x per day; responds in the discussion thread.

## Documentation updates

If an agent finds a doc inaccuracy, they update it **in the same PR** as the code change. Never let docs drift.

If an agent proposes a new pattern not in docs:
1. Add to relevant doc in PR
2. Mention in PR description
3. CODEOWNERS for `/docs/` (you) reviews

## Agent capabilities matrix

What each agent should be able to do (otherwise the track is misallocated):

| Agent | Required skills |
|---|---|
| W1 | AWS CDK (TS), GitHub Actions, IAM, networking |
| W2 | TypeScript, DynamoDB single-table, AppSync resolvers, Lambda |
| W3 | Cognito, IAM, security best practices, OWASP |
| W4 | TypeScript, Bedrock, Textract, prompt engineering, eval design |
| W5 | React Native, Expo, Tamagui, animation libraries |
| W6 | React Native, expo-router, react-native-vision-camera |
| W7 | React Native, Settings UI, RevenueCat |
| W8 | WatermelonDB, sync engine design, conflict resolution |
| W9 | GitHub Actions, EAS, Sentry, PostHog, App Store / Play Store ops |
| W10 | Design systems, Figma, Astro, illustration commissioning |

## Onboarding checklist for a new agent

When an agent joins (or replaces another):

1. Read `docs/README.md` master index
2. Read their track in `docs/15_WORKER_TRACKS.md`
3. Read all docs marked "Reads first" for their track
4. Read this doc (20_AGENT_COORDINATION.md)
5. Read `docs/14_LOCAL_DEV.md` and complete first-time setup
6. Read open issues with their track label
7. Pick lowest-numbered unblocked issue
8. Open draft PR within 4 hours

## Communication norms

- **Default**: GitHub Issues + Discussions (async, durable)
- **Slack/Discord** (post-MVP if team scales): for ephemeral chat
- **Tone**: direct, kind, no hostility
- **Decisions**: written down (issue / ADR / doc), not in chat

## Quality gates per worker

Each PR from any agent must:

1. Pass all CI checks (15+ checks per PR)
2. Have at least 1 code owner approval
3. Update docs if architecture changes
4. Add tests (unit + E2E if user-facing)
5. Reference issue number
6. Match acceptance criteria

No PR merges without these. CI enforces most.

## Cross-functional collaboration

Some features cross multiple agents:

### Example: F-010 AI photo classification
- W4: builds `classify-food` Lambda + prompts + eval
- W6: builds camera UI + photo capture
- W2: ensures `classifyItemPhoto` AppSync mutation works
- W5: provides Camera component primitive
- W10: provides "scanning" Lottie animation
- W9: ensures Sentry tracks AI errors

Coordination: lead agent (W6 in this case) opens a "feature epic" issue that links sub-issues for each contributing agent. Lead orchestrates.

## Scaling beyond 10 agents

If we add more workers:
- Each new worker takes a sub-track (e.g., W11 = "Mobile Recipes" splitting from W6)
- New CODEOWNERS entries
- Update [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)

## Coordination anti-patterns

Don't:
- ❌ Modify another agent's owned files without coordination
- ❌ Refactor across boundaries without an issue + approval
- ❌ Submit a PR without an issue (every PR ties back to a tracked unit of work)
- ❌ Push to main directly (banned by branch protection)
- ❌ Skip CODEOWNERS by self-approving
- ❌ Disable CI checks
- ❌ Ignore code review comments without responding

## Cross-references

- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- ADR template → [21_ADR.md](21_ADR.md)
- Local setup → [14_LOCAL_DEV.md](14_LOCAL_DEV.md)
- CI/CD → [19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)
