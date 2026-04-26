<!--
PR title format: <type>(<scope>): <subject>
e.g. feat(mobile): F-014 dashboard with status colors

Type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
Scope: mobile, web, infra, services-ai, services-auth, services-account, shared, docs, ci
-->

## What

<!-- 1-2 sentence summary of the change. -->

Closes #<issue-number>

## Why

<!-- The motivation. Reference docs section if relevant. -->

## Acceptance criteria

<!-- Copy from the issue / docs/07_FEATURES.md and tick what this PR satisfies -->

- [ ]
- [ ]
- [ ]

## Track

<!-- Which worker track owns this? See docs/15_WORKER_TRACKS.md -->

W?

## Screenshots / Storybook

<!-- For UI changes; remove if not applicable -->

## Risks / known follow-ups

<!-- Anything reviewers should know -->

## Checklist

- [ ] CI green (lint, typecheck, tests, security scans)
- [ ] Tests added/updated (unit + E2E if user-facing)
- [ ] Sentry + PostHog instrumented if new feature
- [ ] Accessibility verified if UI change (VoiceOver + TalkBack)
- [ ] Dark mode verified if UI change
- [ ] Documentation updated if architecture/API changes
- [ ] No secrets committed (gitleaks pre-commit confirms)
- [ ] No `console.log` / debug code left in
