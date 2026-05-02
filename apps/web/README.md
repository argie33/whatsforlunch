# @wfl/web — Marketing Site

Astro + Tailwind marketing site for WhatsFresh. Hosts the landing page, privacy policy, terms, Universal Links association files, and QR redirect routes.

**Owner**: W10 (design / polish)

## Dev

```bash
pnpm dev:web           # from repo root — starts Astro dev server on :4321
pnpm --filter @wfl/web dev    # or from here directly
```

## Build

```bash
pnpm build:web         # from repo root
pnpm --filter @wfl/web build  # or from here
```

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `src/pages/index.astro` | Landing page |
| `/privacy` | `src/pages/privacy.md` | Privacy policy (required for App Store) |
| `/terms` | `src/pages/terms.md` | Terms of Service (required) |
| `/support` | `src/pages/support.astro` | FAQ + contact |
| `/c/[token]` | `src/pages/c/[token].astro` | QR sticker redirect (Universal Link target) |
| `/auth/verify` | `src/pages/auth/verify.astro` | Magic link landing (Universal Link target) |
| `/.well-known/apple-app-site-association` | `public/.well-known/apple-app-site-association` | iOS Universal Links |
| `/.well-known/assetlinks.json` | `public/.well-known/assetlinks.json` | Android App Links |

## Before launch — fill in these placeholders

| File | Placeholder | Who |
|---|---|---|
| `public/.well-known/apple-app-site-association` | `TEAMID` | W3 (Auth) — Apple Team ID from Developer portal |
| `public/.well-known/assetlinks.json` | `REPLACE_WITH_ACTUAL_SHA256_FINGERPRINT` | W9 (Ops) — from Play Console → App signing |
| `src/components/Hero.astro` | `app-id=XXXXXXXX` (Smart App Banner) | W9 (Ops) — App Store app ID |
| `src/components/Hero.astro` + `Footer.astro` | `id000000000` (App Store URLs) | W9 (Ops) — after App Store listing created |
| `src/layouts/BaseLayout.astro` | `app-id=XXXXXXXX` | W9 (Ops) — same App Store app ID |
| `src/pages/terms.md` | `[State/Country to be added]` | Legal review |

## Deploy

See `.github/workflows/deploy-web.yml`. Deploys to S3 + CloudFront on push to `main` when files in `apps/web/` change.

Required GitHub secrets:
- `AWS_OIDC_ROLE_PROD` — IAM role ARN for deployment
- `WEB_S3_BUCKET` — S3 bucket name (from W1 CDK outputs)
- `WEB_CF_DIST_ID` — CloudFront distribution ID (from W1 CDK outputs)
