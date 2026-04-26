# @wfl/shared

Shared types, Zod schemas, and pure logic used across mobile, web, and Lambda services.

**Owners**: W2, W4, W5 (multiple workers contribute)

## Where to start

Read these in order:
1. [`docs/02_DATA_MODEL.md`](../../docs/02_DATA_MODEL.md) — entity shapes
2. [`docs/03_API_SPEC.md`](../../docs/03_API_SPEC.md) — GraphQL schema
3. [`docs/06_AI_INTEGRATION.md`](../../docs/06_AI_INTEGRATION.md) — Zod schemas for AI responses

## Contents (to build)

- `src/schemas/` — Zod schemas (single source of truth for validation)
- `src/types/` — TypeScript types
- `src/expiry.ts` — pure expiry calculation; same code on client + server
- `src/foodTypes.ts` — food type enum
- `src/generated/graphql.ts` — generated from GraphQL SDL via codegen

## Critical contract

This package is the contract between mobile, web, and backend. Any change here ripples to everyone — coordinate via PR review with W2 + W4 + W5.
